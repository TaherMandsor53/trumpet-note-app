import { NextResponse } from 'next/server';
import { syncMemberDetailsFromSheet, getGoogleSheetConfig } from '@/lib/google-sheets';

export async function POST() {
  try {
    const result = await syncMemberDetailsFromSheet();
    const config = getGoogleSheetConfig();
    return NextResponse.json({
      success: result.success,
      count: result.count,
      source: result.source,
      message: result.message,
      sheetUrl: config.sheetUrl,
      sheetName: config.sheetName,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to sync with Google Sheet', details: error?.message },
      { status: 500 }
    );
  }
}
