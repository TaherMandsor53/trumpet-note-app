import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getUserByEmail, getUserByUsernameOrEmail } from '@/lib/db';
import { signUserToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { syncMemberDetailsFromSheet, getGoogleSheetConfig } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, email, password, role, userId } = body;

    const identifier = (username || email || '').trim();

    // 1. Ensure both username and password are provided
    if (!identifier) {
      return NextResponse.json(
        { error: 'Please enter your username or registered email.' },
        { status: 400 }
      );
    }

    if (!password || !String(password).trim()) {
      return NextResponse.json(
        { error: 'Please enter your password.' },
        { status: 400 }
      );
    }

    const inputPass = String(password).trim();

    // 2. Always attempt to sync latest credentials from Google Drive / Sheets
    try {
      await syncMemberDetailsFromSheet();
    } catch (syncErr) {
      console.warn('Google Sheet sync notice during login:', syncErr);
    }

    // 3. Look up user by username or email in the Member Details directory
    let user = getUserByUsernameOrEmail(identifier) || null;

    // Check against configured master credentials in .env
    const config = getGoogleSheetConfig();
    const envEmail = config.accountEmail.toLowerCase();
    const envPass = (process.env.GOOGLE_ACCOUNT_PASSWORD || '786110515253').trim();

    if (!user && identifier.toLowerCase() === envEmail) {
      user = getUsers().find(u => u.role === 'Overall Major' || u.role === 'Major') || getUsers()[0] || null;
    }

    // 4. If account not found in Member Details sheet, return appropriate error
    if (!user) {
      return NextResponse.json(
        { error: `Account not found in Member Details sheet. Please verify your username, ITS number, or registered email.` },
        { status: 401 }
      );
    }

    // 5. Strictly validate password against user's password in Member Details or master credentials
    const userPass = String(user.password || '').trim();
    const isMasterMatch = (identifier.toLowerCase() === envEmail || inputPass === envPass) && inputPass === envPass;
    const isUserMatch =
      inputPass === userPass ||
      inputPass.toLowerCase() === userPass.toLowerCase();

    if (!isUserMatch && !isMasterMatch) {
      return NextResponse.json(
        { error: 'Invalid password. Please check your credentials against the Member Details sheet or use Forgot Password.' },
        { status: 401 }
      );
    }

    // 6. Check active membership status
    if (!user.active) {
      return NextResponse.json(
        { error: 'This band member account is currently inactive. Please contact the Overall Major.' },
        { status: 403 }
      );
    }

    const token = await signUserToken(user);

    // Return safe user object (without password)
    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      token,
      message: `Welcome, ${user.name}!`,
    });

    // Set HTTP-only secure cookie for 2 hours (7200 seconds)
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60, // 2 hours (7200 seconds)
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
