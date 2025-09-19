import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, orders, orderItems, payments, shipments, products, addresses, auditLogs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATUS_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

function isValidStatusTransition(fromStatus: string, toStatus: string): boolean {
  return VALID_STATUS_TRANSITIONS[fromStatus as keyof typeof VALID_STATUS_TRANSITIONS]?.includes(toStatus) || false;
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return NextResponse.json({ 
        error: 'Valid order ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes, trackingNumber } = body;

    if (!status && !notes && !trackingNumber) {
      return NextResponse.json({ 
        error: 'At least one field (status, notes, trackingNumber) must be provided',
        code: 'MISSING_FIELDS'
      }, { status: 400 });
    }

    const existingOrder = await db.select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json({ 
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    const order = existingOrder[0];
    const updates: any = { updatedAt: new Date().toISOString() };

    if (notes !== undefined) {
      updates.notes = notes;
    }

    if (status) {
      if (status === order.status) {
        return NextResponse.json({ 
          error: 'Status is already set to ' + status,
          code: 'DUPLICATE_STATUS'
        }, { status: 400 });
      }

      if (!isValidStatusTransition(order.status, status)) {
        return NextResponse.json({ 
          error: `Invalid status transition from ${order.status} to ${status}`,
          code: 'INVALID_STATUS_TRANSITION'
        }, { status: 400 });
      }

      updates.status = status;

      await db.insert(auditLogs).values({
        userId: user.id,
        action: 'UPDATE_ORDER_STATUS',
        tableName: 'orders',
        recordId: order.id,
        oldValues: { status: order.status },
        newValues: { status },
        createdAt: new Date().toISOString()
      });
    }

    if (trackingNumber) {
      updates.trackingNumber = trackingNumber.trim();
    }

    const updatedOrder = await db.update(orders)
      .set(updates)
      .where(eq(orders.id, parseInt(orderId)))
      .returning();

    if (updatedOrder.length === 0) {
      return NextResponse.json({ 
        error: 'Order update failed',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    if (status === 'shipped' && trackingNumber) {
      const existingShipment = await db.select()
        .from(shipments)
        .where(eq(shipments.orderId, parseInt(orderId)))
        .limit(1);

      if (existingShipment.length === 0) {
        await db.insert(shipments).values({
          orderId: parseInt(orderId),
          trackingNumber: trackingNumber.trim(),
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await db.update(shipments)
          .set({
            trackingNumber: trackingNumber.trim(),
            updatedAt: new Date().toISOString()
          })
          .where(eq(shipments.orderId, parseInt(orderId)));
      }
    }

    const orderDetails = await getOrderDetails(parseInt(orderId));
    return NextResponse.json(orderDetails);
  } catch (error) {
    console.error('PATCH order error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('id');
    
    if (!orderId || isNaN(parseInt(orderId))) {
      return NextResponse.json({ 
        error: 'Valid order ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const orderDetails = await getOrderDetails(parseInt(orderId));
    
    if (!orderDetails) {
      return NextResponse.json({ 
        error: 'Order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    if (user.role !== 'admin' && orderDetails.userId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      }, { status: 403 });
    }

    return NextResponse.json(orderDetails);
  } catch (error) {
    console.error('GET order error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}

async function getOrderDetails(orderId: number) {
  const orderData = await db.select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (orderData.length === 0) return null;

  const order = orderData[0];

  const [orderItemsData, paymentData, shipmentData, userData, shippingAddress, billingAddress, auditData] = await Promise.all([
    db.select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      lineTotal: orderItems.lineTotal,
      priceType: orderItems.priceType,
      product: {
        id: products.id,
        name: products.name,
        sku: products.sku,
        slug: products.slug
      }
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId)),
    
    db.select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1),
    
    db.select()
    .from(shipments)
    .where(eq(shipments.orderId, orderId))
    .limit(1),
    
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone
    })
    .from(users)
    .where(eq(users.id, order.userId))
    .limit(1),
    
    order.shippingAddressId ? db.select()
    .from(addresses)
    .where(eq(addresses.id, order.shippingAddressId))
    .limit(1) : Promise.resolve([]),
    
    order.billingAddressId ? db.select()
    .from(addresses)
    .where(eq(addresses.id, order.billingAddressId))
    .limit(1) : Promise.resolve([]),
    
    db.select({
      action: auditLogs.action,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      createdAt: auditLogs.createdAt
    })
    .from(auditLogs)
    .where(and(
      eq(auditLogs.tableName, 'orders'),
      eq(auditLogs.recordId, orderId)
    ))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10)
  ]);

  return {
    ...order,
    user: userData[0],
    items: orderItemsData,
    payment: paymentData[0] || null,
    shipment: shipmentData[0] || null,
    shippingAddress: shippingAddress[0] || null,
    billingAddress: billingAddress[0] || null,
    auditTrail: auditData
  };
}