import { NextRequest, NextResponse } from 'next/server';
import { syncSectionFolderFromDrive, DRIVE_SECTION_FOLDERS } from '@/lib/drive-service';
import { getCurrentUser } from '@/lib/auth';
import { canSyncDrive, isOverallMajor, getManagedSection } from '@/lib/rbac';
import { InstrumentSection } from '@/types/band';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user || !canSyncDrive(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Instrument Majors can trigger Google Drive synchronization.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    let section = body.section as InstrumentSection;

    // If an Instrument Major calls, force section to their own section
    if (!isOverallMajor(user.role)) {
      section = getManagedSection(user.role) || user.section;
    }

    if (!section || !DRIVE_SECTION_FOLDERS[section]) {
      return NextResponse.json({ error: 'Valid instrument section required' }, { status: 400 });
    }

    const result = await syncSectionFolderFromDrive(section, user.id);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Drive sync error:', error);
    return NextResponse.json({ error: 'Google Drive synchronization failed' }, { status: 500 });
  }
}
