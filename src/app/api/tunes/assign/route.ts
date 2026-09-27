import { NextRequest, NextResponse } from 'next/server';
import { getTuneById, updateTuneAssignments, getUsers } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAssignTunes } from '@/lib/rbac';
import { batchAssignTuneInExcel, syncAssignNotesToGoogleSheet } from '@/lib/google-sheets';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { tuneId, assignedUserIds, tuneName, memberNames } = body;

    let targetTune = tuneId ? getTuneById(tuneId) : null;
    const allTunes = (await import('@/lib/db')).getTunes();

    if (!targetTune && tuneName) {
      targetTune = allTunes.find(
        t => t.title.toLowerCase().trim() === String(tuneName).toLowerCase().trim()
      ) || null;
    }

    if (!targetTune) {
      return NextResponse.json({ error: 'Tune not found.' }, { status: 404 });
    }

    if (!canAssignTunes(user.role, targetTune.section)) {
      return NextResponse.json(
        { error: 'Permission Denied: You cannot assign tunes for this section.' },
        { status: 403 }
      );
    }

    const allUsers = getUsers();
    const targetSection = targetTune.section;
    const sectionUsers = allUsers.filter(u => u.section === targetSection);

    let finalAssignedIds: string[] = [];

    if (Array.isArray(assignedUserIds)) {
      finalAssignedIds = assignedUserIds;
    } else if (Array.isArray(memberNames)) {
      finalAssignedIds = sectionUsers
        .filter(u => memberNames.some(m => m.trim().toLowerCase() === u.name.trim().toLowerCase()))
        .map(u => u.id);
    }

    const updated = updateTuneAssignments(targetTune.id, finalAssignedIds);

    // Update 'Assign Notes' sheet in Excel
    const batchList = sectionUsers.map(u => ({
      memberName: u.name,
      itsNumber: u.itsNumber || '',
      section: u.section || targetSection,
      assigned: finalAssignedIds.includes(u.id),
    }));

    batchAssignTuneInExcel(targetTune.title, batchList);

    // Background Google Sheet Sync
    batchList.forEach(item => {
      if (item.assigned) {
        syncAssignNotesToGoogleSheet(item.memberName, targetTune!.title, targetTune!.title, {
          section: item.section,
          itsNumber: item.itsNumber,
        }).catch(() => {});
      }
    });

    return NextResponse.json({ success: true, tune: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to assign tune' }, { status: 500 });
  }
}

