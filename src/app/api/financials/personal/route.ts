import { NextRequest, NextResponse } from 'next/server';
import { getPersonalFinancials } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Returns ONLY the personal records for the calling member
    const personalRecords = getPersonalFinancials(user.id);

    const latest = personalRecords[0] || null;
    const isPaid = latest ? latest.status === 'Paid' : false;

    return NextResponse.json({
      userId: user.id,
      userName: user.name,
      section: user.section,
      currentStatus: isPaid ? 'Paid' : 'Pending',
      latestRecord: latest,
      history: personalRecords,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve personal financials' }, { status: 500 });
  }
}
