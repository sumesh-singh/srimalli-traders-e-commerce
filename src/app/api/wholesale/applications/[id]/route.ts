import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, wholesaleProfiles, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: 'Valid application ID is required',
        code: 'INVALID_ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: 'Status must be either "approved" or "rejected"',
        code: 'INVALID_STATUS'
      }, { status: 400 });
    }

    if ('userId' in body || 'user_id' in body) {
      return NextResponse.json({ 
        error: 'User ID cannot be provided in request body',
        code: 'USER_ID_NOT_ALLOWED'
      }, { status: 400 });
    }

    // Get current application with user details
    const currentApplication = await db
      .select({
        application: wholesaleProfiles,
        user: users
      })
      .from(wholesaleProfiles)
      .innerJoin(users, eq(wholesaleProfiles.userId, users.id))
      .where(eq(wholesaleProfiles.id, parseInt(id)))
      .limit(1);

    if (currentApplication.length === 0) {
      return NextResponse.json({ 
        error: 'Application not found',
        code: 'NOT_FOUND'
      }, { status: 404 });
    }

    const { application: app, user: applicant } = currentApplication[0];

    // Check if application is already processed
    if (app.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Application has already been processed',
        code: 'ALREADY_PROCESSED'
      }, { status: 400 });
    }

    // Start transaction for atomic operations
    const oldStatus = app.status;
    const newStatus = status;
    
    // Update wholesale profile
    const updatedApplication = await db
      .update(wholesaleProfiles)
      .set({
        status: newStatus,
        notes: notes || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(wholesaleProfiles.id, parseInt(id)))
      .returning();

    // Update user role if approved
    let updatedUser = applicant;
    if (newStatus === 'approved') {
      updatedUser = await db
        .update(users)
        .set({
          role: 'wholesale',
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, app.userId))
        .returning();
    }

    // Create audit log
    await db
      .insert(auditLogs)
      .values({
        userId: user.id,
        action: 'update_wholesale_application',
        tableName: 'wholesale_profiles',
        recordId: app.id,
        oldValues: { status: oldStatus, notes: app.notes },
        newValues: { status: newStatus, notes: notes || null },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        createdAt: new Date().toISOString()
      });

    // Create audit log for role change if approved
    if (newStatus === 'approved') {
      await db
        .insert(auditLogs)
        .values({
          userId: user.id,
          action: 'promote_user_role',
          tableName: 'users',
          recordId: app.userId,
          oldValues: { role: applicant.role },
          newValues: { role: 'wholesale' },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          createdAt: new Date().toISOString()
        });
    }

    return NextResponse.json({
      application: updatedApplication[0],
      user: updatedUser[0],
      message: `Application has been ${newStatus}`
    }, { status: 200 });

  } catch (error) {
    console.error('PATCH wholesale approval error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}