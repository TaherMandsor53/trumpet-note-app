import { NextResponse } from 'next/server';
import { getAttendanceMetrics } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const metrics = getAttendanceMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to compute attendance reports' }, { status: 500 });
  }
}
