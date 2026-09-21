import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsernameOrEmail } from '@/lib/db';
import { syncMemberDetailsFromSheet, updateMemberPassword } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, newPassword } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json(
        { error: 'Username or Email is required.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // 1. Action: Verify Username existence in Member Details
    if (action === 'verify') {
      let user = getUserByUsernameOrEmail(cleanUsername);

      if (!user) {
        // Attempt fresh sync from Google Sheet if not in memory
        try {
          await syncMemberDetailsFromSheet();
          user = getUserByUsernameOrEmail(cleanUsername);
        } catch (err) {
          console.warn('Sync failed during username verification:', err);
        }
      }

      if (!user) {
        return NextResponse.json(
          {
            exists: false,
            error: `Username '${cleanUsername}' was not found in the Member Details sheet.`,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        exists: true,
        user: {
          name: user.name,
          username: user.username || user.email,
          email: user.email,
          role: user.role,
          section: user.section,
        },
        message: `Verified: Account found for ${user.name} (${user.role} - ${user.section}).`,
      });
    }

    // 2. Action: Reset Password
    if (action === 'reset') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
        return NextResponse.json(
          { error: 'New password must be at least 4 characters long.' },
          { status: 400 }
        );
      }

      const updateResult = await updateMemberPassword(cleanUsername, newPassword);

      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.message },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: updateResult.message,
        sheetSynced: updateResult.sheetSynced,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'verify', 'reset'." },
      { status: 400 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process forgot password request.' },
      { status: 500 }
    );
  }
}
