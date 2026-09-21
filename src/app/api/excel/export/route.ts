import { NextRequest, NextResponse } from 'next/server';
import { getFinancials, getAttendanceSessions, getUsers } from '@/lib/db';
import { exportFinancialsToExcel, exportAttendanceToExcel } from '@/lib/excel-parser';
import { getCurrentUser } from '@/lib/auth';
import { canAccessFullFinancials, isInstrumentMajor, isOverallMajor, getManagedSection } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (type === 'financials') {
      if (!user || !canAccessFullFinancials(user.role)) {
        return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
      }
      const records = getFinancials();
      const buffer = exportFinancialsToExcel(records);

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Taheri_Scout_Band_Lavajam_${new Date().getFullYear()}.xlsx"`,
        },
      });
    } else if (type === 'attendance') {
      const sessions = getAttendanceSessions();
      let users = getUsers();
      if (user && isInstrumentMajor(user.role) && !isOverallMajor(user.role)) {
        const managedSection = getManagedSection(user.role) || user.section;
        users = users.filter(u => u.section === managedSection);
      }
      const buffer = exportAttendanceToExcel(sessions, users);

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Attendance_Details.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type specified' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export spreadsheet' }, { status: 500 });
  }
}
