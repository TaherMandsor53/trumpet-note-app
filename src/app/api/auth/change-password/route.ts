import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserByUsernameOrEmail, getUserById } from '@/lib/db';
import { updateMemberPassword } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, currentPassword, newPassword, confirmPassword } = body;

    // Get fresh user record from database
    const freshUser = getUserById(user.id) || getUserByUsernameOrEmail(user.username || user.email) || user;

    // ------------------------------------------------------------------------
    // Action 1: Verify Current Password
    // ------------------------------------------------------------------------
    if (action === 'verify-current' || action === 'verify') {
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        return NextResponse.json(
          { error: 'Please enter your current password.' },
          { status: 400 }
        );
      }

      const inputPass = currentPassword.trim();
      const actualPass = String(freshUser.password || '').trim();

      if (inputPass !== actualPass) {
        return NextResponse.json(
          {
            verified: false,
            error: 'Current password does not match Member Details sheet records. Please try again.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        verified: true,
        message: `Current password verified successfully for ${freshUser.name}.`,
      });
    }

    // ------------------------------------------------------------------------
    // Action 2: Update Password
    // ------------------------------------------------------------------------
    if (action === 'update' || action === 'change') {
      if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
        return NextResponse.json(
          { error: 'Current password is required.' },
          { status: 400 }
        );
      }

      const inputPass = currentPassword.trim();
      const actualPass = String(freshUser.password || '').trim();

      if (inputPass !== actualPass) {
        return NextResponse.json(
          { error: 'Current password does not match Member Details records.' },
          { status: 400 }
        );
      }

      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
        return NextResponse.json(
          { error: 'New password must be at least 4 characters long.' },
          { status: 400 }
        );
      }

      if (newPassword.trim() === actualPass) {
        return NextResponse.json(
          { error: 'New password cannot be the same as your current password.' },
          { status: 400 }
        );
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return NextResponse.json(
          { error: 'New password and confirmation password do not match.' },
          { status: 400 }
        );
      }

      // Update in DB, Excel (Password column), and Google Sheet (Password column)
      const identifier = String(freshUser.username || freshUser.email || freshUser.itsNumber || freshUser.name || freshUser.id || '');
      const updateResult = await updateMemberPassword(identifier, newPassword.trim());

      if (!updateResult.success) {
        return NextResponse.json(
          { error: updateResult.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Password successfully updated in Member Details sheet for ${freshUser.name}.`,
        sheetSynced: updateResult.sheetSynced,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Supported actions: 'verify-current', 'update'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Change password API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process change password request.' },
      { status: 500 }
    );
  }
}
