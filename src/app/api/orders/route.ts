import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, orderItems, users, products, payments } from '@/db/schema';
import { eq, and, desc, asc, gte, lte, like, inArray, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const status = searchParams.get('status');
    const isWholesale = searchParams.get('isWholesale');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const offset = (page - 1) * pageSize;

    let whereConditions = [];

    if (status && ['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      whereConditions.push(eq(orders.status, status));
    }

    if (isWholesale !== null) {
      whereConditions.push(eq(orders.isWholesale, isWholesale === 'true'));
    }

    if (startDate) {
      const startDateObj = new Date(startDate);
      if (!isNaN(startDateObj.getTime())) {
        whereConditions.push(gte(orders.createdAt, startDateObj.toISOString()));
      }
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (!isNaN(endDateObj.getTime())) {
        whereConditions.push(lte(orders.createdAt, endDateObj.toISOString()));
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const ordersQuery = db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      userName: users.name,
      userEmail: users.email,
      status: orders.status,
      subtotal: orders.subtotal,
      tax: orders.tax,
      shippingFee: orders.shippingFee,
      discount: orders.discount,
      total: orders.total,
      isWholesale: orders.isWholesale,
      ageVerified: orders.ageVerified,
      createdAt: orders.createdAt,
    })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset);

    const totalQuery = db.select({
      count: sql<number>`count(*)`,
    })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(whereClause);

    const [orderResults, totalResults] = await Promise.all([
      ordersQuery,
      totalQuery
    ]);

    const total = totalResults[0]?.count || 0;

    const orderIds = orderResults.map(order => order.id);

    let orderItemsMap = new Map<number, any[]>();
    let paymentMap = new Map<number, any>();

    if (orderIds.length > 0) {
      const items = await db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: products.name,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        priceType: orderItems.priceType,
        imageUrl: productImages.url,
      })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(productImages, eq(products.id, productImages.productId))
        .where(inArray(orderItems.orderId, orderIds));

      const payments = await db.select({
        orderId: payments.orderId,
        provider: payments.provider,
        status: payments.status,
        amount: payments.amount,
        currency: payments.currency,
        transactionId: payments.transactionId,
        createdAt: payments.createdAt,
      })
        .from(payments)
        .where(inArray(payments.orderId, orderIds));

      items.forEach(item => {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, []);
        }
        orderItemsMap.get(item.orderId)?.push(item);
      });

      payments.forEach(payment => {
        paymentMap.set(payment.orderId, payment);
      });
    }

    const responseOrders = orderResults.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      userName: order.userName,
      userEmail: order.userEmail,
      status: order.status,
      subtotal: order.subtotal,
      tax: order.tax,
      shippingFee: order.shippingFee,
      discount: order.discount,
      total: order.total,
      isWholesale: order.isWholesale,
      ageVerified: order.ageVerified,
      createdAt: order.createdAt,
      items: orderItemsMap.get(order.id) || [],
      payment: paymentMap.get(order.id) || null,
    }));

    return NextResponse.json({
      orders: responseOrders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('GET orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id || isNaN(parseInt(id))) {
    return NextResponse.json({ error: 'Valid order ID is required', code: 'INVALID_ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, isWholesale, ageVerified, notes } = body;

    if (status && !['pending', 'paid', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value', code: 'INVALID_STATUS' }, { status: 400 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (status !== undefined) updates.status = status;
    if (isWholesale !== undefined) updates.isWholesale = isWholesale;
    if (ageVerified !== undefined) updates.ageVerified = ageVerified;
    if (notes !== undefined) updates.notes = notes;

    const updatedOrder = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    if (updatedOrder.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(updatedOrder[0]);
  } catch (error) {
    console.error('PUT order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

import { productImages } from '@/db/schema';