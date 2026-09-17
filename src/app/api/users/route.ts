import { NextRequest, NextResponse } from 'next/server';
import { getUsers, addUser } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canManageAllUsers, canManageSectionUsers } from '@/lib/rbac';
import { User } from '@/types/band';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');
    const role = searchParams.get('role');

    let allUsers = getUsers();

    if (section && section !== 'All') {
      allUsers = allUsers.filter(u => u.section === section);
    }
    if (role && role !== 'All') {
      allUsers = allUsers.filter(u => u.role === role);
    }

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, role, section, phone, rank } = body;

    if (!name || !email || !role || !section) {
      return NextResponse.json(
        { error: 'Name, email, role, and section are required' },
        { status: 400 }
      );
    }

    // RBAC Check: Overall Major vs Instrument Major
    const isOverall = canManageAllUsers(currentUser.role);
    const isAllowedSectionMajor = canManageSectionUsers(currentUser.role, section, role);

    if (!isOverall && !isAllowedSectionMajor) {
      return NextResponse.json(
        {
          error:
            'Permission Denied: Instrument Majors may only add players to their own instrument section. Overall Major permission required for other roles.',
        },
        { status: 403 }
      );
    }

    const newUser = addUser({
      name,
      email,
      role,
      section,
      phone,
      rank,
      joinedDate: new Date().toISOString().split('T')[0],
      active: true,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
