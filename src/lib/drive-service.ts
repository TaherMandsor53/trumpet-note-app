import { InstrumentSection, DriveFolderSyncResult } from '@/types/band';
import { addTune, getTunes } from './db';

export const DRIVE_SECTION_FOLDERS: Record<
  InstrumentSection,
  { folderId: string; folderName: string; path: string }
> = {
  Trumpet: {
    folderId: 'gdrive_folder_trumpet_01',
    folderName: 'Trumpet Sheet Music & Solo Parts',
    path: '/Taheri Scout Band/Sheet Music/Trumpet',
  },
  Saxophone: {
    folderId: 'gdrive_folder_sax_02',
    folderName: 'Saxophone Harmonized Transpositions',
    path: '/Taheri Scout Band/Sheet Music/Saxophone',
  },
  Euphonium: {
    folderId: 'gdrive_folder_euph_03',
    folderName: 'Euphonium Bass Clef & Bb Parts',
    path: '/Taheri Scout Band/Sheet Music/Euphonium',
  },
  Trombone: {
    folderId: 'gdrive_folder_trombone_06',
    folderName: 'Trombone Tenor Slide Notations',
    path: '/Taheri Scout Band/Sheet Music/Trombone',
  },
  Dish: {
    folderId: 'gdrive_folder_dish_04',
    folderName: 'Dish & Cymbals Cadence Scores',
    path: '/Taheri Scout Band/Sheet Music/Dish',
  },
  SideDrum: {
    folderId: 'gdrive_folder_drum_05',
    folderName: 'SideDrum & Snare March Notations',
    path: '/Taheri Scout Band/Sheet Music/SideDrum',
  },
};

/**
 * Simulates / executes synchronization of a section folder with Google Drive.
 * Automatically imports any detected sheet music and applies the current timestamp
 * so newly added files receive the prominent "NEW" badge.
 */
export async function syncSectionFolderFromDrive(
  section: InstrumentSection,
  uploaderId: string
): Promise<DriveFolderSyncResult> {
  const folderInfo = DRIVE_SECTION_FOLDERS[section];
  const existingTunes = getTunes().filter(t => t.section === section);

  // Mock folder files discovered in Google Drive
  const driveFilesDiscovered = [
    {
      id: `gfile_${section.toLowerCase()}_cadence_01`,
      name: `${section} Scout Ceremonial Cadence 2026.pdf`,
      size: '2.4 MB',
      modifiedTime: new Date().toISOString(),
      syncStatus: 'new' as const,
    },
    {
      id: `gfile_${section.toLowerCase()}_anthem_02`,
      name: `${section} National Anthem & Salwaat Hymn.pdf`,
      size: '1.8 MB',
      modifiedTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      syncStatus: 'new' as const,
    },
  ];

  let newCount = 0;
  for (const file of driveFilesDiscovered) {
    const alreadyImported = existingTunes.some(t => t.driveFileId === file.id);
    if (!alreadyImported) {
      addTune({
        title: file.name.replace('.pdf', ''),
        section,
        key: file.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        pdfUrl: '/tunes/trumpet_notation_notes.pdf', // fallback link to existing local sample PDF
        driveFileId: file.id,
        createdAt: file.modifiedTime, // Will trigger 15-day NEW badge!
        uploadedBy: uploaderId,
        assignedUserIds: [],
        difficulty: 'Intermediate',
        tempo: '116 BPM',
      });
      newCount++;
    }
  }

  return {
    section,
    folderId: folderInfo.folderId,
    folderName: folderInfo.folderName,
    syncedFilesCount: driveFilesDiscovered.length,
    newFilesAdded: newCount,
    lastSyncedAt: new Date().toISOString(),
    files: driveFilesDiscovered,
  };
}
