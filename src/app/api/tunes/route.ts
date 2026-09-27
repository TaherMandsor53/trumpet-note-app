import { NextRequest, NextResponse } from 'next/server';
import { getTunes, addTune } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAssignTunes, isOverallMajor, getManagedSection } from '@/lib/rbac';
import { getAssignedTuneNamesForMember } from '@/lib/google-sheets';
import { Tune, InstrumentSection } from '@/types/band';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const requestedSection = searchParams.get('section') as InstrumentSection | null;

    let tunes = getTunes();

    if (user) {
      if (isOverallMajor(user.role)) {
        // Overall Major has universal access; apply section filter if requested
        if (requestedSection && requestedSection !== ('All' as any)) {
          tunes = tunes.filter(t => t.section === requestedSection);
        }
      } else if (user.role.endsWith('Major')) {
        // Instrument Major: accesses their section's notes
        const section = getManagedSection(user.role) || user.section;
        tunes = tunes.filter(t => t.section === section);
      } else {
        // Band Member / Player: accesses ONLY notes assigned to them by Section Major
        const memberAssignedTunes = user.name ? getAssignedTuneNamesForMember(user.name) : [];
        const itsAssignedTunes = user.itsNumber ? getAssignedTuneNamesForMember(user.itsNumber) : [];
        const assignedSet = new Set(
          [...memberAssignedTunes, ...itsAssignedTunes].map(t => t.trim().toLowerCase())
        );

        tunes = tunes.filter(
          t =>
            t.section === user.section &&
            (assignedSet.has(t.title.trim().toLowerCase()) ||
              (t.key && assignedSet.has(t.key.trim().toLowerCase())) ||
              (t.arabicName && assignedSet.has(t.arabicName.trim().toLowerCase())))
        );
      }
    } else {
      // Default public/unauthenticated view
      if (requestedSection && requestedSection !== ('All' as any)) {
        tunes = tunes.filter(t => t.section === requestedSection);
      }
    }

    return NextResponse.json({ tunes });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve tunes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { title, section, key, pdfUrl, audioUrl, difficulty, tempo, assignedUserIds } = body;

    if (!title || !section) {
      return NextResponse.json({ error: 'Title and section are required' }, { status: 400 });
    }

    if (!canAssignTunes(user.role, section)) {
      return NextResponse.json(
        { error: 'Permission Denied: You cannot upload or manage tunes for this section.' },
        { status: 403 }
      );
    }

    const newTune = addTune({
      title,
      section,
      key: key || title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      pdfUrl: pdfUrl || '/tunes/trumpet_notation_notes.pdf',
      audioUrl,
      difficulty: difficulty || 'Intermediate',
      tempo: tempo || '110 BPM',
      uploadedBy: user.id,
      assignedUserIds: assignedUserIds || [],
      createdAt: new Date().toISOString(), // Newly uploaded: Will have "NEW" badge for 15 days!
    });

    return NextResponse.json({ success: true, tune: newTune }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create tune' }, { status: 500 });
  }
}
