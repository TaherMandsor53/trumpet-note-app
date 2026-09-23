import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceSessions, addAttendanceSession, deleteAttendanceSession, getUserById } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canMarkAttendance, canViewAllAttendance } from '@/lib/rbac';
import { syncAttendanceToSheet } from '@/lib/google-sheets';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const sessions = getAttendanceSessions();

    // Privacy & Scoping: If caller is not Major, only return their own attendance record
    if (user && !canViewAllAttendance(user.role)) {
      const isUserRecord = (r: any) =>
        r.userId === user.id ||
        (user.itsNumber && (r.userId === user.itsNumber || r.userId === `sheet-${user.itsNumber}`)) ||
        (r.userName && user.name && r.userName.trim().toUpperCase() === user.name.trim().toUpperCase());

      const filteredSessions = sessions.map(sess => ({
        ...sess,
        records: sess.records.filter(isUserRecord),
      }));

      return NextResponse.json({ sessions: filteredSessions });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve attendance sessions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // RBAC: Only Overall Major has authorization to mark attendance
    if (!canMarkAttendance(user.role)) {
      return NextResponse.json(
        {
          error:
            'Permission Denied: Only Overall Major has authorization to mark practice attendance.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sessionTitle, sessionType, date, records } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Member attendance entries are required.' },
        { status: 400 }
      );
    }

    const sessionDate = date || new Date().toISOString().split('T')[0];
    const enrichedRecords = records.map((r: any) => {
      const userObj = getUserById(r.userId);
      return {
        userId: r.userId,
        userName: r.userName || userObj?.name || '',
        itsNumber: r.itsNumber || userObj?.itsNumber || String(r.userId || '').replace(/^sheet-/, ''),
        section: r.section || userObj?.section || 'Trumpet',
        status: r.status,
        notes: r.notes || '',
      };
    });

    const newSession = addAttendanceSession({
      date: sessionDate,
      sessionTitle: sessionTitle || `Practice Attendance Session (${sessionDate})`,
      sessionType: sessionType || 'Regular Practice',
      markedBy: user.name,
      records: enrichedRecords,
    });

    // Sync directly to Google Sheet "Attendance Details" sheet
    const syncResult = await syncAttendanceToSheet(newSession);

    return NextResponse.json(
      {
        success: true,
        session: newSession,
        sheetSynced: syncResult.sheetSynced,
        message: syncResult.message,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record attendance session' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canMarkAttendance(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major can delete attendance sessions.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    const success = deleteAttendanceSession(id);
    return NextResponse.json({
      success,
      message: success ? 'Attendance session deleted successfully.' : 'Session not found.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete attendance session' }, { status: 500 });
  }
}
