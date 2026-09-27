import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isOverallMajor, isInstrumentMajor } from '@/lib/rbac';
import {
  getAssignedNotesFromExcel,
  saveAssignedNoteToExcel,
  batchAssignTuneInExcel,
  getAssignedTuneNamesForMember,
  syncAssignNotesToGoogleSheet,
} from '@/lib/google-sheets';
import { getTunes, getDatabase, getUsers } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const assignedNotes = getAssignedNotesFromExcel();

    let userAssignedTunes: string[] = [];
    if (user) {
      userAssignedTunes = getAssignedTuneNamesForMember(user.name);
      if (userAssignedTunes.length === 0 && user.itsNumber) {
        userAssignedTunes = getAssignedTuneNamesForMember(user.itsNumber);
      }
    }

    return NextResponse.json({
      assignedNotes,
      userAssignedTunes,
    });
  } catch (error: any) {
    console.error('Failed to retrieve assigned notes:', error);
    return NextResponse.json({ error: error.message, assignedNotes: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Permission check: Overall Major or Section Majors can assign tunes
    if (!isOverallMajor(user.role) && !isInstrumentMajor(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Section Majors can assign tune notes.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const tuneName = body.tuneName || body['Tune name'] || body['Tune Name'] || body.tune_name || '';
    const memberName = body.memberName || body['Member name'] || body['Member Name'] || body.member_name || '';
    const memberNames = body.memberNames || body['Member names'] || body['Member Names'] || body.member_names;
    const assignments = body.assignments;
    const action = body.action || 'assign';
    const section = body.section || body.instrumentType || '';
    const itsNumber = body.itsNumber || body['ITS Number'] || body.its_number || '';

    if (!tuneName) {
      return NextResponse.json({ error: 'Tune Name is required.' }, { status: 400 });
    }

    const cleanTuneName = tuneName.trim();
    const allUsers = getUsers();

    // Case 1: Batch assignments array passed
    // { tuneName, assignments: [{ memberName, itsNumber, section, assigned: true/false }] }
    if (Array.isArray(assignments) && assignments.length > 0) {
      batchAssignTuneInExcel(cleanTuneName, assignments);

      // Also update in-memory DB assignedUserIds
      const assignedNamesSet = new Set(
        assignments.filter(a => a.assigned).map(a => a.memberName.trim().toLowerCase())
      );

      const assignedUserIds: string[] = [];
      allUsers.forEach(u => {
        if (assignedNamesSet.has(u.name.trim().toLowerCase())) {
          assignedUserIds.push(u.id);
        }
      });

      const db = getDatabase();
      const tuneIndex = db.tunes.findIndex(
        (t: any) => t.title.toLowerCase().trim() === cleanTuneName.toLowerCase().trim()
      );
      if (tuneIndex !== -1) {
        db.tunes[tuneIndex].assignedUserIds = assignedUserIds;
      }

      // Background Google Sheet Sync for each assigned member
      assignments.forEach(item => {
        if (item.assigned) {
          syncAssignNotesToGoogleSheet(item.memberName, cleanTuneName, cleanTuneName, {
            section: item.section,
            itsNumber: item.itsNumber,
          }).catch(() => {});
        }
      });

      return NextResponse.json({
        success: true,
        message: `Tune "${cleanTuneName}" assignments successfully updated in Assign Notes sheet.`,
        assignedCount: assignedUserIds.length,
      });
    }

    // Case 2: Array of member names passed
    // { tuneName, memberNames: ["Name 1", "Name 2"] }
    if (Array.isArray(memberNames)) {
      const batchList = memberNames.map(name => {
        const matchedUser = allUsers.find(
          u => u.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        return {
          memberName: name.trim(),
          itsNumber: matchedUser?.itsNumber || '',
          section: matchedUser?.section || section || '',
          assigned: true,
        };
      });

      batchAssignTuneInExcel(cleanTuneName, batchList);

      const assignedUserIds = allUsers
        .filter(u => memberNames.some(m => m.trim().toLowerCase() === u.name.trim().toLowerCase()))
        .map(u => u.id);

      const db = getDatabase();
      const tuneIndex = db.tunes.findIndex(
        (t: any) => t.title.toLowerCase().trim() === cleanTuneName.toLowerCase().trim()
      );
      if (tuneIndex !== -1) {
        db.tunes[tuneIndex].assignedUserIds = assignedUserIds;
      }

      return NextResponse.json({
        success: true,
        message: `Tune "${cleanTuneName}" assigned to ${memberNames.length} members.`,
      });
    }

    // Case 3: Single member assignment
    // { memberName: "Name", tuneName: "Tune", action: "assign" | "unassign" }
    if (memberName) {
      const cleanMember = memberName.trim();
      const matchedUser = allUsers.find(
        u => u.name.trim().toLowerCase() === cleanMember.toLowerCase()
      );

      const result = saveAssignedNoteToExcel(
        cleanMember,
        cleanTuneName,
        action as 'assign' | 'unassign',
        {
          section: matchedUser?.section || section || '',
          itsNumber: matchedUser?.itsNumber || itsNumber || '',
        }
      );

      // Sync to Google Sheet
      await syncAssignNotesToGoogleSheet(
        cleanMember,
        cleanTuneName,
        result.assignedTunes,
        {
          section: matchedUser?.section || section || '',
          itsNumber: matchedUser?.itsNumber || itsNumber || '',
        }
      ).catch(() => {});

      // Sync to in-memory DB
      if (matchedUser) {
        const db = getDatabase();
        const tuneIndex = db.tunes.findIndex(
          (t: any) => t.title.toLowerCase().trim() === cleanTuneName.toLowerCase().trim()
        );
        if (tuneIndex !== -1) {
          const currentIds = new Set(db.tunes[tuneIndex].assignedUserIds || []);
          if (action === 'assign') {
            currentIds.add(matchedUser.id);
          } else {
            currentIds.delete(matchedUser.id);
          }
          db.tunes[tuneIndex].assignedUserIds = Array.from(currentIds);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Tune "${cleanTuneName}" ${action}ed for member "${cleanMember}".`,
        assignedTunes: result.assignedTunes,
      });
    }

    return NextResponse.json(
      { error: 'Invalid assignment payload. Provide memberName or assignments array.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to assign tune notes:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to assign tune notes.' },
      { status: 500 }
    );
  }
}
