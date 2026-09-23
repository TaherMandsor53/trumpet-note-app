import { NextRequest, NextResponse } from 'next/server';
import { getUsers, addUser } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  canManageAllUsers,
  canManageSectionUsers,
  isInstrumentMajor,
  isOverallMajor,
  getManagedSection,
  generateCredentialsFromFullName,
} from '@/lib/rbac';
import { addMemberToGoogleSheet } from '@/lib/google-sheets';
import { User } from '@/types/band';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const section = searchParams.get('section');
    const role = searchParams.get('role');
    const all = searchParams.get('all');

    let allUsers = getUsers();

    // Section Major strictly sees only their section players (excluding Executive Majors)
    if (user && isInstrumentMajor(user.role) && !isOverallMajor(user.role) && all !== 'true') {
      const managedSection = getManagedSection(user.role) || user.section;
      allUsers = allUsers.filter(u => u.section === managedSection && !isOverallMajor(u.role) && u.role !== 'Major');
    } else if (section && section !== 'All') {
      allUsers = allUsers.filter(u => u.section === section && !isOverallMajor(u.role) && u.role !== 'Major');
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
    const { itsNumber, name, email, role, section, phone, address, jamaat, rank, username, password } = body;

    if (!name || !role || !section) {
      return NextResponse.json(
        { error: 'Full Name, Role, and Section are required' },
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
            'Permission Denied: Instrument Majors may only add players to their own instrument section. Major authority required for other roles.',
        },
        { status: 403 }
      );
    }

    // Credentials auto-generation fallback if not provided
    const creds = generateCredentialsFromFullName(name);
    const finalUsername = (username || creds.username).trim();
    const finalPassword = (password || creds.password).trim();
    const finalEmail = (email || finalUsername).trim();

    const newUser = addUser({
      itsNumber: itsNumber ? String(itsNumber).trim() : undefined,
      name: name.trim(),
      username: finalUsername,
      email: finalEmail,
      password: finalPassword,
      role,
      section,
      phone: phone ? String(phone).trim() : undefined,
      address: address ? String(address).trim() : undefined,
      jamaat: jamaat ? String(jamaat).trim() : undefined,
      rank: rank || role,
      joinedDate: new Date().toISOString().split('T')[0],
      active: true,
    });

    // Sync to Member Details sheet in Excel & Google Drive
    try {
      await addMemberToGoogleSheet(newUser);
    } catch (sheetErr) {
      console.warn('Google Sheet/Excel sync warning:', sheetErr);
    }

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
