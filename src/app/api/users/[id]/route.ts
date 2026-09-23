import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canManageAllUsers, canManageSectionUsers, getManagedSection } from '@/lib/rbac';
import { updateMemberInGoogleSheet, deleteMemberFromGoogleSheet } from '@/lib/google-sheets';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const existingUser = getUserById(params.id);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const targetSection = body.section || existingUser.section;
    const targetRole = body.role || existingUser.role;

    const isOverall = canManageAllUsers(currentUser.role);
    const managedSection = getManagedSection(currentUser.role);
    const isAllowedSectionMajor =
      managedSection &&
      managedSection === existingUser.section &&
      managedSection === targetSection &&
      canManageSectionUsers(currentUser.role, targetSection, targetRole);

    if (!isOverall && !isAllowedSectionMajor) {
      return NextResponse.json(
        { error: 'Permission Denied: You may only modify members in your own section.' },
        { status: 403 }
      );
    }

    const { updatedUser, previousMajorUser } = updateUser(params.id, body);
    if (updatedUser) {
      try {
        await updateMemberInGoogleSheet(updatedUser);
      } catch (err) {
        console.warn('Failed to sync updated member with sheet:', err);
      }
    }
    if (previousMajorUser) {
      try {
        await updateMemberInGoogleSheet(previousMajorUser);
      } catch (err) {
        console.warn('Failed to sync previous major member with sheet:', err);
      }
    }

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const targetUser = getUserById(params.id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isOverall = canManageAllUsers(currentUser.role);
    const managedSection = getManagedSection(currentUser.role);
    const isAllowedSectionMajor =
      managedSection &&
      managedSection === targetUser.section &&
      canManageSectionUsers(currentUser.role, targetUser.section, targetUser.role);

    if (!isOverall && !isAllowedSectionMajor) {
      return NextResponse.json(
        { error: 'Permission Denied: You may only delete members in your own section.' },
        { status: 403 }
      );
    }

    const deleted = deleteUser(params.id);
    if (deleted) {
      try {
        await deleteMemberFromGoogleSheet(targetUser);
      } catch (sheetErr) {
        console.warn('Failed to delete member from Google Sheet/Excel:', sheetErr);
      }
    }
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
