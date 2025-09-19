import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { carts, cartItems, products, productPrices, users, sessions } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '../../../lib/auth';

interface CartItemResponse {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  priceType: string;
  lineTotal: number;
  unit: string;
  stock: number;
}

interface CartTotals {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

interface CartResponse {
  id: number;
  userId?: number;
  sessionId?: string;
  items: CartItemResponse[];
  totals: CartTotals;
}

async function buildCartResponse(cartId: number): Promise<CartResponse | null> {
  try {
    const cartItemsData = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        productName: products.name,
        productSlug: products.slug,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        priceType: cartItems.priceType,
        unit: products.unit,
        stock: products.stock,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.cartId, cartId));

    const cartDetails = await db
      .select({
        id: carts.id,
        userId: carts.userId,
        sessionId: carts.sessionId,
      })
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);

    if (cartDetails.length === 0) return null;

    const cart = cartDetails[0];
    let subtotal = 0;
    let itemCount = 0;

    const items: CartItemResponse[] = cartItemsData.map(item => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      itemCount += item.quantity;
      return {
        ...item,
        lineTotal,
      };
    });

    // Calculate tax based on first item's price type or default retail
    let taxRate = 0.18; // Default 18%
    if (items.length > 0 && items[0].priceType === 'wholesale') {
      const productId = items[0].productId;
      const priceData = await db
        .select({ taxRate: productPrices.taxRate })
        .from(productPrices)
        .where(eq(productPrices.productId, productId))
        .limit(1);
      if (priceData.length > 0) {
        taxRate = priceData[0].taxRate;
      }
    }

    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      id: cart.id,
      userId: cart.userId || undefined,
      sessionId: cart.sessionId || undefined,
      items,
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        itemCount,
      },
    };
  } catch (error) {
    console.error('Build cart response error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!user && !sessionId) {
      return NextResponse.json(
        { error: 'Authentication required or sessionId needed', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    let cartId: number | null = null;

    if (user) {
      // Check existing cart for user
      const userCart = await db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, user.id))
        .limit(1);
      if (userCart.length > 0) {
        cartId = userCart[0].id;
      }
    }

    if (!cartId && sessionId) {
      // Check cart by session
      const sessionCart = await db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.sessionId, sessionId))
        .limit(1);
      if (sessionCart.length > 0) {
        cartId = sessionCart[0].id;
      }
    }

    if (!cartId) {
      // Return empty cart structure
      return NextResponse.json({
        id: 0,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          total: 0,
          itemCount: 0,
        },
      });
    }

    const cartResponse = await buildCartResponse(cartId);
    if (!cartResponse) {
      return NextResponse.json({ error: 'Cart not found', code: 'CART_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(cartResponse);
  } catch (error) {
    console.error('Carts GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    const body = await request.json();

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json(
        { error: 'User ID cannot be provided in request body', code: 'USER_ID_NOT_ALLOWED' },
        { status: 400 }
      );
    }

    const { sessionId } = body;

    if (!user && !sessionId) {
      return NextResponse.json(
        { error: 'Authentication required or sessionId needed', code: 'AUTH_REQUIRED' },
        { status: 400 }
      );
    }

    let userId = user?.id;
    let resolvedSessionId = sessionId;

    // Check if user exists and has cart from session to merge
    let existingCartId: number | null = null;

    if (userId) {
      const userCart = await db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.userId, userId))
        .limit(1);
      if (userCart.length > 0) {
        existingCartId = userCart[0].id;
      }
    }

    if (!existingCartId && resolvedSessionId) {
      const sessionCart = await db
        .select({ id: carts.id })
        .from(carts)
        .where(eq(carts.sessionId, resolvedSessionId))
        .limit(1);
      if (sessionCart.length > 0) {
        existingCartId = sessionCart[0].id;
      }
    }

    if (existingCartId) {
      // Update cart ownership if user is authenticated
      if (userId) {
        await db
          .update(carts)
          .set({
            userId: userId,
            sessionId: resolvedSessionId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(carts.id, existingCartId));
      } else if (resolvedSessionId) {
        // Session update
        await db
          .update(carts)
          .set({
            sessionId: resolvedSessionId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(carts.id, existingCartId));
      }

      const cartResponse = await buildCartResponse(existingCartId);
      if (!cartResponse) {
        return NextResponse.json({ error: 'Cart not found after update', code: 'CART_UPDATE_ERROR' }, { status: 404 });
      }
      return NextResponse.json(cartResponse);
    }

    // Create new cart
    const insertData = {
      userId: userId,
      sessionId: resolvedSessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newCart = await db
      .insert(carts)
      .values(insertData)
      .returning();

    const cartResponse: CartResponse = {
      id: newCart[0].id,
      userId: userId,
      sessionId: resolvedSessionId,
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        total: 0,
        itemCount: 0,
      },
    };

    return NextResponse.json(cartResponse, { status: 201 });
  } catch (error) {
    console.error('Carts POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error },
      { status: 500 }
    );
  }
}