import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cartItems, carts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid cart item ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const cartItemId = parseInt(id);

    // Find the cart item with cart details
    const itemWithCart = await db
      .select({
        cartItemId: cartItems.id,
        cartId: carts.id,
        cartUserId: carts.userId,
        cartSessionId: carts.sessionId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        priceType: cartItems.priceType
      })
      .from(cartItems)
      .innerJoin(carts, eq(cartItems.cartId, carts.id))
      .where(eq(cartItems.id, cartItemId))
      .limit(1);

    if (itemWithCart.length === 0) {
      return NextResponse.json({ 
        error: 'Cart item not found',
        code: 'ITEM_NOT_FOUND'
      }, { status: 404 });
    }

    const item = itemWithCart[0];

    // Check if cart belongs to current user
    if (item.cartUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied',
        code: 'FORBIDDEN'
      }, { status: 403 });
    }

    // Delete the cart item
    const deletedItem = await db
      .delete(cartItems)
      .where(eq(cartItems.id, cartItemId))
      .returning();

    // Get remaining items in the cart
    const remainingItems = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        priceType: cartItems.priceType,
        createdAt: cartItems.createdAt,
        updatedAt: cartItems.updatedAt
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, item.cartId));

    // If cart is empty, you might want to delete the cart or handle it client-side
    if (remainingItems.length === 0) {
      // Optionally delete empty cart - uncomment if needed
      // await db.delete(carts).where(eq(carts.id, item.cartId));
    }

    return NextResponse.json({
      message: 'Item removed from cart successfully',
      cart: {
        id: item.cartId,
        items: remainingItems,
        isEmpty: remainingItems.length === 0
      },
      deletedItem: deletedItem[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE cart item error:', error);
    return NextResponse.json({ 
      error: 'Internal server error while deleting cart item',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}