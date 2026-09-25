import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isOverallMajor, isInstrumentMajor } from '@/lib/rbac';
import {
  INSTRUMENT_DRIVE_FOLDER_MAP,
  syncReferenceLinkToExcel,
  postReferenceLinkToGoogleSheet,
  getReferenceLinksFromSheet,
  getReferenceLinksFromExcel,
  updateReferenceLinkInExcel,
  deleteReferenceLinkFromExcel,
  updateReferenceLinkInGoogleSheet,
  deleteReferenceLinkFromGoogleSheet,
  ReferenceLinkRecord,
} from '@/lib/google-sheets';
import { addTune, updateTuneByName, deleteTuneByName } from '@/lib/db';
import { InstrumentSection } from '@/types/band';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const sectionMapping: Record<string, InstrumentSection> = {
  Trumpet: 'Trumpet',
  Saxophone: 'Saxophone',
  'SideDrum/BaseDrum': 'SideDrum',
  SideDrum: 'SideDrum',
  BaseDrum: 'SideDrum',
  Euphonium: 'Euphonium',
  Trombone: 'Trombone',
  Dish: 'Dish',
};

export async function GET(req: NextRequest) {
  try {
    const records = getReferenceLinksFromExcel();
    return NextResponse.json({ referenceLinks: records });
  } catch (error: any) {
    console.error('Failed to retrieve reference links:', error);
    return NextResponse.json({ error: error.message, referenceLinks: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Authorization: Only Major and Section Majors can add tune notes
    if (!isOverallMajor(user.role) && !isInstrumentMajor(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Section Majors can add tune notes.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const tuneName = (formData.get('tuneName') as string || '').trim();
    const instrumentType = (formData.get('instrumentType') as string || 'Trumpet').trim();
    const youtubeLink = (formData.get('youtubeLink') as string || '').trim();
    const instagramLink = (formData.get('instagramLink') as string || '').trim();
    const file = formData.get('file') as File | null;

    if (!tuneName) {
      return NextResponse.json({ error: 'Tune Name is required.' }, { status: 400 });
    }

    // Determine target Google Drive folder from Image 3
    const targetFolder = INSTRUMENT_DRIVE_FOLDER_MAP[instrumentType] || `${instrumentType} Notes`;
    let fileName = `${tuneName.replace(/[^a-zA-Z0-9_\-\s]/g, '')}_Score.pdf`;
    let fileUrl = '/tunes/trumpet_notation_notes.pdf';
    let fileBase64 = '';
    let mimeType = 'application/pdf';

    if (file && typeof file === 'object' && file.name) {
      fileName = file.name;
      mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fileBase64 = buffer.toString('base64');

      // Save file locally to match Drive folder structure from Image 3
      const targetDir = path.resolve(process.cwd(), 'public', 'uploads', 'tunes', targetFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Safe clean filename
      const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(targetDir, safeFilename);
      fs.writeFileSync(filePath, buffer);

      fileUrl = `/uploads/tunes/${encodeURIComponent(targetFolder)}/${safeFilename}`;
    }

    const timestamp = new Date().toISOString();
    const record: ReferenceLinkRecord = {
      id: `ref-${Date.now()}`,
      tuneName,
      instrumentType,
      targetFolder,
      fileName,
      fileUrl,
      youtubeLink,
      instagramLink,
      uploadedBy: `${user.name} (${user.role})`,
      createdAt: timestamp,
    };

    // 1. Post to Google Sheet Web App & Google Drive folder
    const sheetSync = await postReferenceLinkToGoogleSheet(record, fileBase64, mimeType).catch((err) => ({
      success: false,
      message: err?.message || 'Logged locally',
      driveFileUrl: undefined,
    }));

    if (sheetSync.driveFileUrl) {
      record.fileUrl = sheetSync.driveFileUrl;
    }

    // 2. Sync to local Excel 'Reference Link' sheet
    syncReferenceLinkToExcel(record);

    // 3. Map instrument to band InstrumentSection
    const bandSection = sectionMapping[instrumentType] || 'Trumpet';

    // 4. Add to Tunes DB so players in that section can view it immediately
    addTune({
      title: tuneName,
      section: bandSection,
      key: tuneName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      pdfUrl: fileUrl,
      audioUrl: youtubeLink || undefined,
      difficulty: 'Intermediate',
      tempo: '112 BPM',
      uploadedBy: user.id,
      assignedUserIds: [],
      createdAt: timestamp,
    });

    return NextResponse.json(
      {
        success: true,
        message: `Tune notes successfully routed to "${targetFolder}" in Drive and recorded in Reference Link sheet.`,
        record,
        sheetSynced: sheetSync.success,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to add tune reference notes:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit tune notes and reference links.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!isOverallMajor(user.role) && !isInstrumentMajor(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Section Majors can update tune notes.' },
        { status: 403 }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let originalTuneName = '';
    let tuneName = '';
    let instrumentType = 'Trumpet';
    let youtubeLink = '';
    let instagramLink = '';
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      originalTuneName = (formData.get('originalTuneName') as string || formData.get('tuneName') as string || '').trim();
      tuneName = (formData.get('tuneName') as string || '').trim();
      instrumentType = (formData.get('instrumentType') as string || 'Trumpet').trim();
      youtubeLink = (formData.get('youtubeLink') as string || '').trim();
      instagramLink = (formData.get('instagramLink') as string || '').trim();
      file = formData.get('file') as File | null;
    } else {
      const body = await req.json();
      originalTuneName = (body.originalTuneName || body.tuneName || '').trim();
      tuneName = (body.tuneName || '').trim();
      instrumentType = (body.instrumentType || 'Trumpet').trim();
      youtubeLink = (body.youtubeLink || '').trim();
      instagramLink = (body.instagramLink || '').trim();
    }

    if (!originalTuneName) {
      return NextResponse.json({ error: 'Original Tune Name is required for update.' }, { status: 400 });
    }

    const targetFolder = INSTRUMENT_DRIVE_FOLDER_MAP[instrumentType] || `${instrumentType} Notes`;
    const updates: Partial<ReferenceLinkRecord> = {
      tuneName: tuneName || originalTuneName,
      instrumentType,
      targetFolder,
      youtubeLink,
      instagramLink,
    };

    if (file && typeof file === 'object' && file.name) {
      const fileName = file.name;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const targetDir = path.resolve(process.cwd(), 'public', 'uploads', 'tunes', targetFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const safeFilename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const filePath = path.join(targetDir, safeFilename);
      fs.writeFileSync(filePath, buffer);
      updates.fileName = fileName;
      updates.fileUrl = `/uploads/tunes/${encodeURIComponent(targetFolder)}/${safeFilename}`;
    }

    // Update in Excel
    const excelSuccess = updateReferenceLinkInExcel(originalTuneName, updates);

    // Update in Google Sheet
    await updateReferenceLinkInGoogleSheet(originalTuneName, updates).catch(() => {});

    // Update in local tunes DB
    const bandSection = sectionMapping[instrumentType] || 'Trumpet';
    const tuneUpdates: any = {
      title: updates.tuneName,
      section: bandSection,
    };
    if (updates.fileUrl) tuneUpdates.pdfUrl = updates.fileUrl;
    if (updates.youtubeLink !== undefined) tuneUpdates.audioUrl = updates.youtubeLink;
    updateTuneByName(originalTuneName, tuneUpdates);

    return NextResponse.json({
      success: true,
      message: `Tune "${originalTuneName}" successfully updated.`,
      updates,
      excelSuccess,
    });
  } catch (error: any) {
    console.error('Failed to update tune reference note:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update tune note.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!isOverallMajor(user.role) && !isInstrumentMajor(user.role)) {
      return NextResponse.json(
        { error: 'Permission Denied: Only Overall Major and Section Majors can delete tune notes.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let tuneName = searchParams.get('tuneName') || '';

    if (!tuneName) {
      try {
        const body = await req.json();
        tuneName = body.tuneName || '';
      } catch (e) {}
    }

    tuneName = tuneName.trim();
    if (!tuneName) {
      return NextResponse.json({ error: 'Tune Name is required to delete.' }, { status: 400 });
    }

    const excelDeleted = deleteReferenceLinkFromExcel(tuneName);
    await deleteReferenceLinkFromGoogleSheet(tuneName).catch(() => {});
    deleteTuneByName(tuneName);

    return NextResponse.json({
      success: true,
      message: `Tune "${tuneName}" successfully deleted.`,
      excelDeleted,
    });
  } catch (error: any) {
    console.error('Failed to delete tune reference note:', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete tune note.' }, { status: 500 });
  }
}
