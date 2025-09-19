import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cartItems, carts, products, productPrices, users, wholesaleProfiles } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    // Handle both authenticated and guest users
    let userId: number | null = null;
    let sessionId: string | null = null;
    
    if (user) {
      userId = user.id;
    } else {
      // For guest users, generate a session ID or use an existing one
      sessionId = request.headers.get('x-session-id') || Date.now().toString();
    }

    const body = await request.json();
    const { productId, quantity, priceType } = body;

    // Security: Check for user identifier in request body
    if ('userId' in body || 'user_id' in body || 'sessionId' in body) {
      return NextResponse.json({ 
        error: "User ID or session ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validation
    if (!productId || typeof productId !== 'number') {
      return NextResponse.json({ 
        error: "Valid productId is required",
        code: "INVALID_PRODUCT_ID" 
      }, { status: 400 });
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ 
        error: "Quantity must be a positive integer",
        code: "INVALID_QUANTITY" 
      }, { status: 400 });
    }

    if (!priceType || !['retail', 'wholesale'].includes(priceType)) {
      return NextResponse.json({ 
        error: "Price type must be 'retail' or 'wholesale'",
        code: "INVALID_PRICE_TYPE" 
      }, { status: 400 });
    }

    // Check if product exists and is active
    const [product] = await db.select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, 'active')));

    if (!product) {
      return NextResponse.json({ 
        error: "Product not found or inactive",
        code: "PRODUCT_NOT_FOUND" 
      }, { status: 404 });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return NextResponse.json({ 
        error: "Insufficient stock",
        code: "INSUFFICIENT_STOCK" 
      }, { status: 409 });
    }

    // Get product pricing
    const [productPrice] = await db.select()
      .from(productPrices)
      .where(eq(productPrices.productId, productId));

    if (!productPrice) {
      return NextResponse.json({ 
        error: "Product pricing not found",
        code: "PRICING_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate wholesale pricing requirements
    if (priceType === 'wholesale') {
      if (!user || user.role !== 'wholesale') {
        return NextResponse.json({ 
          error: "Wholesale pricing requires wholesale user role",
          code: "WHOLESALE_ACCESS_DENIED" 
        }, { status: 400 });
      }

      // Check minimum wholesale quantity
      const minQty = productPrice.minWholesaleQty || 1;
      if (quantity < minQty) {
        return NextResponse.json({ 
          error: `Minimum wholesale quantity is ${minQty}`,
          code: "BELOW_MIN_WHOLESALE_QTY" 
        }, { status: 400 });
      }
    }

    // Calculate unit price
    let unitPrice: number;
    if (priceType === 'wholesale') {
      if (!productPrice.wholesalePrice) {
        return NextResponse.json({ 
          error: "Wholesale price not available for this product",
          code: "WHOLESALE_PRICE_UNAVAILABLE" 
        }, { status: 400 });
      }
      unitPrice = productPrice.wholesalePrice;
    } else {
      unitPrice = productPrice.retailPrice;
    }

    // Get or create cart
    let cartId: number;
    let cartExists = false;

    if (userId) {
      const [existingCart] = await db.select()
        .from(carts)
        .where(eq(carts.userId, userId));
      
      if (existingCart) {
        cartId = existingCart.id;
        cartExists = true;
      } else {
        const [newCart] = await db.insert(carts)
          .values({
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).returning();
        cartId = newCart.id;
      }
    } else if (sessionId) {
      const [existingCart] = await db.select()
        .from(carts)
        .where(eq(carts.sessionId, sessionId));
      
      if (existingCart) {
        cartId = existingCart.id;
        cartExists = true;
      } else {
        const [newCart] = await db.insert(carts)
          .values({
            sessionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }).returning();
        cartId = newCart.id;
      }
    } else {
      return NextResponse.json({ 
        error: "User ID or session ID required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    // Check if item already exists in cart
    const [existingItem] = await db.select()
      .from(cartItems)
      .where(and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId),
        eq(cartItems.priceType, priceType)
      ));

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;
      
      // Check stock again for updated quantity
      if (product.stock < newQuantity) {
        return NextResponse.json({ 
          error: "Insufficient stock for updated quantity",
          code: "INSUFFICIENT_STOCK" 
        }, { status: 409 });
      }

      await db.update(cartItems)
        .set({
          quantity: newQuantity,
          updatedAt: new Date().toISOString()
        })
        .where(eq(cartItems.id, existingItem.id));
    } else {
      // Add new item
      await db.insert(cartItems)
        .values({
          cartId,
          productId,
          quantity,
          unitPrice,
          priceType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
    }

    // Get updated cart with items and totals
    const cartItemsData = await db.select({
      cartItem: cartItems,
      product: products,
      productPrice: productPrices
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productPrices, eq(products.id, productPrices.productId))
    .where(eq(cartItems.cartId, cartId));

    let subtotal = 0;
    let tax = 0;

    cartItemsData.forEach(item => {
      const lineTotal = item.cartItem.quantity * item.cartItem.unitPrice;
      const lineTax = lineTotal * (item.productPrice.taxRate || 0);
      subtotal += lineTotal;
      tax += lineTax;
    });

    const totals = {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100
    };

    const responseData = {
      id: cartId,
      userId,
      sessionId,
      items: cartItemsData.map(item => ({
        id: item.cartItem.id,
        productId: item.cartItem.productId,
        name: item.product.name,
        slug: item.product.slug,
        quantity: item.cartItem.quantity,
        unitPrice: item.cartItem.unitPrice,
        priceType: item.cartItem.priceType,
        total: Math.round((item.cartItem.quantity * item.cartItem.unitPrice) * 100) / 100
      })),
      totals
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Cart POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: "Session ID required",
        code: "MISSING_SESSION_ID" 
      }, { status: 400 });
    }

    // Find cart by session ID
    const [cart] = await db.select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId));

    if (!cart) {
      return NextResponse.json(null);
    }

    // Get cart items with product details
    const cartItemsData = await db.select({
      cartItem: cartItems,
      product: products,
      productPrice: productPrices
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productPrices, eq(products.id, productPrices.productId))
    .where(eq(cartItems.cartId, cart.id));

    if (cartItemsData.length === 0) {
      return NextResponse.json({
        id: cart.id,
        userId: cart.userId,
        sessionId: cart.sessionId,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          total: 0
        }
      });
    }

    let subtotal = 0;
    let tax = 0;

    cartItemsData.forEach(item => {
      const lineTotal = item.cartItem.quantity * item.cartItem.unitPrice;
      const lineTax = lineTotal * (item.productPrice.taxRate || 0);
      subtotal += lineTotal;
      tax += lineTax;
    });

    const totals = {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100
    };

    const responseData = {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items: cartItemsData.map(item => ({
        id: item.cartItem.id,
        productId: item.cartItem.productId,
        name: item.product.name,
        slug: item.product.slug,
        quantity: item.cartItem.quantity,
        unitPrice: item.cartItem.unitPrice,
        priceType: item.cartItem.priceType,
        total: Math.round((item.cartItem.quantity * item.cartItem.unitPrice) * 100) / 100
      })),
      totals
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Cart GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: "Session ID required",
        code: "MISSING_SESSION_ID" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid cart item ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { quantity } = body;

    // Security: Check for user identifier in request body
    if ('userId' in body || 'user_id' in body || 'sessionId' in body) {
      return NextResponse.json({ 
        error: "User ID or session ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ 
        error: "Quantity must be a positive integer",
        code: "INVALID_QUANTITY" 
      }, { status: 400 });
    }

    // Find cart by session ID
    const [cart] = await db.select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId));

    if (!cart) {
      return NextResponse.json({ 
        error: "Cart not found",
        code: "CART_NOT_FOUND" 
      }, { status: 404 });
    }

    // Find cart item
    const [item] = await db.select()
      .from(cartItems)
      .where(and(eq(cartItems.id, parseInt(id)), eq(cartItems.cartId, cart.id)));

    if (!item) {
      return NextResponse.json({ 
        error: "Cart item not found",
        code: "ITEM_NOT_FOUND" 
      }, { status: 404 });
    }

    // Check product stock
    const [product] = await db.select()
      .from(products)
      .where(eq(products.id, item.productId));

    if (!product || product.stock < quantity) {
      return NextResponse.json({ 
        error: "Insufficient stock",
        code: "INSUFFICIENT_STOCK" 
      }, { status: 409 });
    }

    // Update cart item
    await db.update(cartItems)
      .set({
        quantity,
        updatedAt: new Date().toISOString()
      })
      .where(eq(cartItems.id, parseInt(id)));

    // Get updated cart with totals
    const cartItemsData = await db.select({
      cartItem: cartItems,
      product: products,
      productPrice: productPrices
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productPrices, eq(products.id, productPrices.productId))
    .where(eq(cartItems.cartId, cart.id));

    let subtotal = 0;
    let tax = 0;

    cartItemsData.forEach(item => {
      const lineTotal = item.cartItem.quantity * item.cartItem.unitPrice;
      const lineTax = lineTotal * (item.productPrice.taxRate || 0);
      subtotal += lineTotal;
      tax += lineTax;
    });

    const totals = {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100
    };

    const responseData = {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items: cartItemsData.map(item => ({
        id: item.cartItem.id,
        productId: item.cartItem.productId,
        name: item.product.name,
        slug: item.product.slug,
        quantity: item.cartItem.quantity,
        unitPrice: item.cartItem.unitPrice,
        priceType: item.cartItem.priceType,
        total: Math.round((item.cartItem.quantity * item.cartItem.unitPrice) * 100) / 100
      })),
      totals
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Cart PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');
    
    if (!sessionId) {
      return NextResponse.json({ 
        error: "Session ID required",
        code: "MISSING_SESSION_ID" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid cart item ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Find cart by session ID
    const [cart] = await db.select()
      .from(carts)
      .where(eq(carts.sessionId, sessionId));

    if (!cart) {
      return NextResponse.json({ 
        error: "Cart not found",
        code: "CART_NOT_FOUND" 
      }, { status: 404 });
    }

    // Find and delete cart item
    const [deletedItem] = await db.delete(cartItems)
      .where(and(eq(cartItems.id, parseInt(id)), eq(cartItems.cartId, cart.id)))
      .returning();

    if (!deletedItem) {
      return NextResponse.json({ 
        error: "Cart item not found",
        code: "ITEM_NOT_FOUND" 
      }, { status: 404 });
    }

    // Get updated cart with totals
    const cartItemsData = await db.select({
      cartItem: cartItems,
      product: products,
      productPrice: productPrices
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .innerJoin(productPrices, eq(products.id, productPrices.productId))
    .where(eq(cartItems.cartId, cart.id));

    let subtotal = 0;
    let tax = 0;

    cartItemsData.forEach(item => {
      const lineTotal = item.cartItem.quantity * item.cartItem.unitPrice;
      const lineTax = lineTotal * (item.productPrice.taxRate || 0);
      subtotal += lineTotal;
      tax += lineTax;
    });

    const totals = {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal + tax) * 100) / 100
    };

    const responseData = {
      id: cart.id,
      userId: cart.userId,
      sessionId: cart.sessionId,
      items: cartItemsData.map(item => ({
        id: item.cartItem.id,
        productId: item.cartItem.productId,
        name: item.product.name,
        slug: item.product.slug,
        quantity: item.cartItem.quantity,
        unitPrice: item.cartItem.unitPrice,
        priceType: item.cartItem.priceType,
        total: Math.round((item.cartItem.quantity * item.cartItem.unitPrice) * 100) / 100
      })),
      totals,
      deletedItem: deletedItem.id
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Cart DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}