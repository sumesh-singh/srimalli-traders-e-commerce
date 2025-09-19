import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { carts, cartItems, orders, orderItems, payments, addresses, categories, products, productPrices, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { cartId, amount, currency, shippingAddressId, billingAddressId, ageVerified } = body;

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'authorId' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!amount || !currency || !shippingAddressId) {
      return NextResponse.json({ 
        error: "Missing required fields: amount, currency, shippingAddressId",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    if (isNaN(parseFloat(amount)) || isNaN(parseInt(shippingAddressId))) {
      return NextResponse.json({ 
        error: "Invalid field types",
        code: "INVALID_FIELD_TYPES" 
      }, { status: 400 });
    }

    // Validate currency
    if (currency !== 'INR') {
      return NextResponse.json({ 
        error: "Only INR currency is supported",
        code: "INVALID_CURRENCY" 
      }, { status: 400 });
    }

    // Check if user has wholesale profile
    const [wholesaleProfile] = await db.select()
      .from(users)
      .innerJoin(wholesaleProfiles, eq(users.id, wholesaleProfiles.userId))
      .where(eq(users.id, user.id));

    const isWholesale = wholesaleProfile?.wholesale_profiles.status === 'approved';

    // Get cart items
    let cartItemsToProcess = [];
    let calculatedSubtotal = 0;
    let requiresAgeVerification = false;

    if (cartId) {
      const cart = await db.select()
        .from(carts)
        .where(and(eq(carts.id, cartId), eq(carts.userId, user.id)))
        .limit(1);

      if (cart.length === 0) {
        return NextResponse.json({ 
          error: "Cart not found or doesn't belong to user",
          code: "CART_NOT_FOUND" 
        }, { status: 404 });
      }

      cartItemsToProcess = await db.select({
        cartItemId: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        priceType: cartItems.priceType
      })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(cartItems.cartId, cartId));

      if (cartItemsToProcess.length === 0) {
        return NextResponse.json({ 
          error: "Cart is empty",
          code: "EMPTY_CART" 
        }, { status: 400 });
      }

      // Check stock availability and age verification
      for (const item of cartItemsToProcess) {
        const [product] = await db.select()
          .from(products)
          .innerJoin(categories, eq(products.categoryId, categories.id))
          .where(eq(products.id, item.productId));

        if (!product) {
          return NextResponse.json({ 
            error: `Product ${item.productId} not found`,
            code: "PRODUCT_NOT_FOUND" 
          }, { status: 404 });
        }

        if (product.products.stock < item.quantity) {
          return NextResponse.json({ 
            error: `Insufficient stock for ${product.products.name}`,
            code: "INSUFFICIENT_STOCK" 
          }, { status: 400 });
        }

        if (product.categories.requiresAgeVerification) {
          requiresAgeVerification = true;
        }

        const price = isWholesale && product.categories.name.toLowerCase().includes('wholesale') && item.priceType === 'wholesale'
          ? item.unitPrice
          : item.unitPrice;

        calculatedSubtotal += price * item.quantity;
      }
    }

    // Check age verification for firecracker categories
    if (requiresAgeVerification && !ageVerified) {
      return NextResponse.json({ 
        error: "Age verification required for firecracker products",
        code: "AGE_VERIFICATION_REQUIRED" 
      }, { status: 400 });
    }

    // Validate shipping address
    const [shippingAddress] = await db.select()
      .from(addresses)
      .where(and(eq(addresses.id, shippingAddressId), eq(addresses.userId, user.id)))
      .limit(1);

    if (!shippingAddress) {
      return NextResponse.json({ 
        error: "Shipping address not found or doesn't belong to user",
        code: "ADDRESS_NOT_FOUND" 
      }, { status: 404 });
    }

    // Validate billing address
    if (billingAddressId && billingAddressId !== shippingAddressId) {
      const [billingAddress] = await db.select()
        .from(addresses)
        .where(and(eq(addresses.id, billingAddressId), eq(addresses.userId, user.id)))
        .limit(1);

      if (!billingAddress) {
        return NextResponse.json({ 
          error: "Billing address not found or doesn't belong to user",
          code: "BILLING_ADDRESS_NOT_FOUND" 
        }, { status: 404 });
      }
    }

    const finalAmount = cartId ? calculatedSubtotal : amount;
    const subtotal = finalAmount;
    const tax = subtotal * (isWholesale ? 0.12 : 0.18); // Different tax rates
    const shippingFee = subtotal >= 5000 ? 0 : 150;
    const total = subtotal + tax + shippingFee;

    // Create order
    const [newOrder] = await db.insert(orders)
      .values({
        userId: user.id,
        orderNumber: generateOrderNumber(),
        status: 'pending',
        subtotal,
        tax,
        shippingFee,
        discount: 0,
        total,
        isWholesale: isWholesale ? 1 : 0,
        ageVerified: ageVerified || requiresAgeVerification ? 1 : 0,
        shippingAddressId,
        billingAddressId: billingAddressId || shippingAddressId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Create order items
    if (cartId && cartItemsToProcess.length > 0) {
      for (const item of cartItemsToProcess) {
        await db.insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.unitPrice * item.quantity,
            priceType: item.priceType,
            createdAt: new Date().toISOString()
          });
      }

      // Delete cart items
      await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
      await db.delete(carts).where(eq(carts.id, cartId));
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // Convert to paise
      currency: 'INR',
      receipt: newOrder.orderNumber,
      notes: {
        orderId: newOrder.id.toString(),
        userId: user.id.toString()
      }
    });

    // Create payment record
    const [newPayment] = await db.insert(payments)
      .values({
        orderId: newOrder.id,
        provider: 'razorpay',
        status: 'created',
        amount: total,
        currency: 'INR',
        razorpayOrderId: razorpayOrder.id,
        payloadJson: razorpayOrder,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({
      orderId: newOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: total,
      currency: 'INR'
    }, { status: 201 });

  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: "INTERNAL_ERROR" 
    }, { status: 500 });
  }
}