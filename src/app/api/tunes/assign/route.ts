import { NextRequest, NextResponse } from 'next/server';
import { getTuneById, updateTuneAssignments } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAssignTunes } from '@/lib/rbac';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { tuneId, assignedUserIds } = body;

    if (!tuneId || !Array.isArray(assignedUserIds)) {
      return NextResponse.json(
        { error: 'tuneId and assignedUserIds array are required.' },
        { status: 400 }
      );
    }

    const tune = getTuneById(tuneId);
    if (!tune) {
      return NextResponse.json({ error: 'Tune not found.' }, { status: 404 });
    }

    if (!canAssignTunes(user.role, tune.section)) {
      return NextResponse.json(
        { error: 'Permission Denied: You cannot assign tunes for this section.' },
        { status: 403 }
      );
    }

    const updated = updateTuneAssignments(tuneId, assignedUserIds);
    return NextResponse.json({ success: true, tune: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to assign tune' }, { status: 500 });
  }
}
