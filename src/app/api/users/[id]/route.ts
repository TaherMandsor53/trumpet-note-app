import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canManageAllUsers, canManageSectionUsers } from '@/lib/rbac';

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
    const isAllowedSectionMajor = canManageSectionUsers(currentUser.role, targetSection, targetRole);

    if (!isOverall && !isAllowedSectionMajor) {
      return NextResponse.json(
        { error: 'Permission Denied: Cannot modify user outside your section or permission scope.' },
        { status: 403 }
      );
    }

    const updated = updateUser(params.id, body);
    return NextResponse.json({ success: true, user: updated });
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
    const isAllowedSectionMajor = canManageSectionUsers(currentUser.role, targetUser.section, targetUser.role);

    if (!isOverall && !isAllowedSectionMajor) {
      return NextResponse.json(
        { error: 'Permission Denied: Cannot delete this member.' },
        { status: 403 }
      );
    }

    const deleted = deleteUser(params.id);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
