import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wholesaleProfiles, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

function validateGstNumber(gstNumber: string): boolean {
  const gstRegex = /^.{15}$/; // Basic validation: 15 characters
  return gstRegex.test(gstNumber);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Check if user role is customer
    if (user.role !== 'customer') {
      return NextResponse.json({ 
        error: 'Only customers can apply for wholesale accounts',
        code: 'INVALID_ROLE'
      }, { status: 403 });
    }

    const body = await request.json();
    const { businessName, gstNumber, licenseNumber, address, notes } = body;

    // Security check: reject if userId provided in body
    if ('userId' in body || 'user_id' in body || 'user' in body) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validation
    if (!businessName || !gstNumber || !address) {
      return NextResponse.json({ 
        error: 'businessName, gstNumber, and address are required',
        code: 'MISSING_REQUIRED_FIELDS'
      }, { status: 400 });
    }

    if (!validateGstNumber(gstNumber)) {
      return NextResponse.json({ 
        error: 'Invalid GST number format. Must be 15 characters',
        code: 'INVALID_GST'
      }, { status: 400 });
    }

    // Check if user already has a wholesale profile
    const existingProfile = await db
      .select()
      .from(wholesaleProfiles)
      .where(eq(wholesaleProfiles.userId, user.id))
      .limit(1);

    if (existingProfile.length > 0 && existingProfile[0].status === 'pending') {
      // Update existing pending application
      const updatedProfile = await db
        .update(wholesaleProfiles)
        .set({
          businessName: businessName.trim(),
          gstNumber: gstNumber.trim(),
          licenseNumber: licenseNumber?.trim() || null,
          address: address.trim(),
          notes: notes?.trim() || null,
          updatedAt: new Date().toISOString()
        })
        .where(eq(wholesaleProfiles.id, existingProfile[0].id))
        .returning();

      return NextResponse.json(updatedProfile[0], { status: 200 });
    }

    // Create new wholesale profile
    const newProfile = await db
      .insert(wholesaleProfiles)
      .values({
        userId: user.id,
        businessName: businessName.trim(),
        gstNumber: gstNumber.trim(),
        licenseNumber: licenseNumber?.trim() || null,
        address: address.trim(),
        status: 'pending',
        notes: notes?.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    return NextResponse.json(newProfile[0], { status: 201 });
  } catch (error) {
    console.error('POST wholesale application error:', error);
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
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }

    // Get current user's wholesale profile
    const profile = await db
      .select()
      .from(wholesaleProfiles)
      .where(eq(wholesaleProfiles.userId, user.id))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json({ 
        error: 'No wholesale profile found',
        code: 'PROFILE_NOT_FOUND'
      }, { status: 404 });
    }

    return NextResponse.json(profile[0]);
  } catch (error) {
    console.error('GET wholesale profile error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}