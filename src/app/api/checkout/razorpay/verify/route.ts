import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, orders, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ 
        error: 'Missing required Razorpay payment data',
        code: 'MISSING_PAYMENT_DATA'
      }, { status: 400 });
    }

    // Find payment record by razorpay_order_id
    const paymentRecords = await db.select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpay_order_id))
      .limit(1);

    if (paymentRecords.length === 0) {
      return NextResponse.json({ 
        error: 'Payment record not found',
        code: 'PAYMENT_NOT_FOUND'
      }, { status: 404 });
    }

    const payment = paymentRecords[0];

    // Find associated order
    const orderRecords = await db.select()
      .from(orders)
      .where(eq(orders.id, payment.orderId))
      .limit(1);

    if (orderRecords.length === 0) {
      return NextResponse.json({ 
        error: 'Associated order not found',
        code: 'ORDER_NOT_FOUND'
      }, { status: 404 });
    }

    const order = orderRecords[0];

    // Check if payment is already processed
    if (payment.status === 'captured') {
      return NextResponse.json({ 
        success: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: 'Payment already processed'
      });
    }

    // Verify Razorpay signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ 
        error: 'Webhook secret not configured',
        code: 'WEBHOOK_SECRET_MISSING'
      }, { status: 500 });
    }

    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ 
        error: 'Invalid Razorpay signature',
        code: 'INVALID_SIGNATURE'
      }, { status: 400 });
    }

    // Generate order number if not exists
    let orderNumber = order.orderNumber;
    if (!orderNumber) {
      const timestamp = Date.now();
      orderNumber = `ORD${timestamp}`;
    }

    // Update payment status to "captured"
    const oldPaymentStatus = payment.status;
    const updatedPayments = await db.update(payments)
      .set({
        status: 'captured',
        transactionId: razorpay_payment_id,
        updatedAt: new Date().toISOString()
      })
      .where(eq(payments.id, payment.id))
      .returning();

    if (updatedPayments.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update payment status',
        code: 'PAYMENT_UPDATE_FAILED'
      }, { status: 500 });
    }

    // Update order status to "paid"
    const oldOrderStatus = order.status;
    const updatedOrders = await db.update(orders)
      .set({
        status: 'paid',
        orderNumber: orderNumber,
        updatedAt: new Date().toISOString()
      })
      .where(eq(orders.id, order.id))
      .returning();

    if (updatedOrders.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update order status',
        code: 'ORDER_UPDATE_FAILED'
      }, { status: 500 });
    }

    // Create audit log for payment status change
    const auditLog = await db.insert(auditLogs)
      .values({
        userId: null,
        action: 'payment_captured',
        tableName: 'payments',
        recordId: payment.id,
        oldValues: { status: oldPaymentStatus },
        newValues: { status: 'captured', transactionId: razorpay_payment_id },
        createdAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json({ 
      success: true,
      orderId: order.id,
      orderNumber: orderNumber,
      status: 'Payment verified and order updated'
    });

  } catch (error) {
    console.error('POST payment verification error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}