import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wholesaleProfiles, users } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '10'), 100);
    const status = searchParams.get('status');

    const offset = (page - 1) * pageSize;

    let query = db
      .select({
        id: wholesaleProfiles.id,
        userId: wholesaleProfiles.userId,
        userName: users.name,
        userEmail: users.email,
        businessName: wholesaleProfiles.businessName,
        gstNumber: wholesaleProfiles.gstNumber,
        licenseNumber: wholesaleProfiles.licenseNumber,
        address: wholesaleProfiles.address,
        status: wholesaleProfiles.status,
        notes: wholesaleProfiles.notes,
        createdAt: wholesaleProfiles.createdAt,
        updatedAt: wholesaleProfiles.updatedAt,
      })
      .from(wholesaleProfiles)
      .innerJoin(users, eq(wholesaleProfiles.userId, users.id));

    // Apply status filter if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.where(eq(wholesaleProfiles.status, status));
    }

    // Apply sorting
    query = query.orderBy(desc(wholesaleProfiles.createdAt));

    // Apply pagination
    query = query.limit(pageSize).offset(offset);

    const applications = await query;

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(wholesaleProfiles);

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      countQuery = countQuery.where(
        eq(wholesaleProfiles.status, status)
      );
    }

    const [totalResult] = await countQuery;
    const total = totalResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    const response = {
      applications: applications.map(app => ({
        id: app.id,
        userId: app.userId,
        userName: app.userName,
        userEmail: app.userEmail,
        businessName: app.businessName,
        gstNumber: app.gstNumber,
        licenseNumber: app.licenseNumber,
        address: app.address,
        status: app.status,
        notes: app.notes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET wholesale applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}