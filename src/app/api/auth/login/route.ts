import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getUserByEmail } from '@/lib/db';
import { signUserToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Role } from '@/types/band';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, role, userId } = body;

    let user = null;

    if (userId) {
      user = getUsers().find(u => u.id === userId);
    } else if (email) {
      user = getUserByEmail(email);
    } else if (role) {
      // Find default user representing this role
      user = getUsers().find(u => u.role === role);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User or role not found in Taheri Scout Band directory.' },
        { status: 404 }
      );
    }

    const token = await signUserToken(user);

    const response = NextResponse.json({
      success: true,
      user,
      token,
    });

    // Set HTTP-only secure cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to process authentication.' },
      { status: 500 }
    );
  }
}
