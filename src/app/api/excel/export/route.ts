import { NextRequest, NextResponse } from 'next/server';
import { getFinancials, getAttendanceSessions } from '@/lib/db';
import { exportFinancialsToExcel, exportAttendanceToExcel } from '@/lib/excel-parser';
import { getCurrentUser } from '@/lib/auth';
import { canAccessFullFinancials } from '@/lib/rbac';

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
      const buffer = exportAttendanceToExcel(sessions);

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Taheri_Scout_Band_Attendance_Report.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid export type specified' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export spreadsheet' }, { status: 500 });
  }
}
