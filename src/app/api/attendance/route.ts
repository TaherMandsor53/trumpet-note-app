import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceSessions, addAttendanceSession } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canMarkAttendance } from '@/lib/rbac';

export async function GET() {
  try {
    const sessions = getAttendanceSessions();
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

    // RBAC: Only Overall Major can mark practice attendance
    if (!canMarkAttendance(user.role)) {
      return NextResponse.json(
        {
          error:
            'Permission Denied: Only the Overall Major has executive authorization to mark practice attendance.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { sessionTitle, sessionType, date, records } = body;

    if (!sessionTitle || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Session title and member attendance entries are required.' },
        { status: 400 }
      );
    }

    const newSession = addAttendanceSession({
      date: date || new Date().toISOString(),
      sessionTitle,
      sessionType: sessionType || 'Regular Practice',
      markedBy: user.name,
      records,
    });

    return NextResponse.json({ success: true, session: newSession }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record attendance session' }, { status: 500 });
  }
}
