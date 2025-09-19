import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, wholesaleProfiles, addresses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    // Get user details excluding password hash
    const userDetails = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

    if (userDetails.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    const currentUser = userDetails[0];

    // Get wholesale profile if exists
    let wholesaleProfile = null;
    if (currentUser.role === 'wholesale') {
      const wholesaleData = await db.select({
        id: wholesaleProfiles.id,
        businessName: wholesaleProfiles.businessName,
        gstNumber: wholesaleProfiles.gstNumber,
        licenseNumber: wholesaleProfiles.licenseNumber,
        address: wholesaleProfiles.address,
        status: wholesaleProfiles.status,
        notes: wholesaleProfiles.notes
      })
      .from(wholesaleProfiles)
      .where(eq(wholesaleProfiles.userId, user.id))
      .limit(1);

      if (wholesaleData.length > 0) {
        wholesaleProfile = wholesaleData[0];
      }
    }

    // Get user addresses
    const userAddresses = await db.select({
      id: addresses.id,
      type: addresses.type,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      state: addresses.state,
      postalCode: addresses.postalCode,
      country: addresses.country,
      phone: addresses.phone,
      isDefault: addresses.isDefault
    })
    .from(addresses)
    .where(eq(addresses.userId, user.id));

    // Build response
    const response = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      role: currentUser.role,
      isActive: currentUser.isActive,
      createdAt: currentUser.createdAt
    };

    if (wholesaleProfile) {
      response.wholesaleProfile = wholesaleProfile;
    }

    if (userAddresses.length > 0) {
      response.addresses = userAddresses;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}