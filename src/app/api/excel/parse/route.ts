import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer, ParsedMemberRow, ParsedTuneRow } from '@/lib/excel-parser';
import { addUser, addTune } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canImportExportExcel } from '@/lib/rbac';
import { InstrumentSection, Role } from '@/types/band';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canImportExportExcel(user.role)) {
      return NextResponse.json({ error: 'Permission Denied' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'members' | 'tunes' | null;

    if (!file || !type) {
      return NextResponse.json({ error: 'File and type are required' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let importedCount = 0;

    if (type === 'members') {
      const rows = parseExcelBuffer<ParsedMemberRow>(buffer);
      for (const row of rows) {
        if (row.Name && row.Email && row.Section) {
          addUser({
            name: row.Name,
            email: row.Email,
            role: (row.Role as Role) || 'Band Member / Player',
            section: (row.Section as InstrumentSection) || 'Trumpet',
            phone: row.Phone,
            rank: row.Rank || 'Scout Musician',
            joinedDate: new Date().toISOString().split('T')[0],
            active: true,
          });
          importedCount++;
        }
      }
    } else if (type === 'tunes') {
      const rows = parseExcelBuffer<ParsedTuneRow>(buffer);
      for (const row of rows) {
        if (row.Title && row.Section) {
          addTune({
            title: row.Title,
            section: (row.Section as InstrumentSection) || 'Trumpet',
            key: row.Key || row.Title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            pdfUrl: '/tunes/trumpet_notation_notes.pdf',
            difficulty: (row.Difficulty as any) || 'Intermediate',
            tempo: row.Tempo || '112 BPM',
            uploadedBy: user.id,
            assignedUserIds: [],
            createdAt: new Date().toISOString(),
          });
          importedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      message: `Successfully processed and imported ${importedCount} ${type} records.`,
    });
  } catch (error) {
    console.error('Excel parse error:', error);
    return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 500 });
  }
}
