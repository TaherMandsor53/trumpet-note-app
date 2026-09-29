import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let clean = rawUrl.trim();

    // 1. Local files in public/uploads or public/tunes
    if (clean.startsWith('/') || !clean.startsWith('http')) {
      const normalized = clean.startsWith('/') ? clean.slice(1) : clean;
      const [relativePath] = normalized.split('#')[0].split('?');
      const safePath = path.normalize(decodeURIComponent(relativePath)).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(process.cwd(), 'public', safePath);

      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const fileBuffer = await fs.promises.readFile(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const contentType =
          ext === '.pdf'
            ? 'application/pdf'
            : ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.webp'
            ? 'image/webp'
            : 'application/octet-stream';

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }

    // 2. Google Drive URLs
    if (clean.includes('drive.google.com')) {
      const match = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const fileId = match[1];
        const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        try {
          const driveRes = await fetch(driveDownloadUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
          });

          if (driveRes.ok) {
            const contentType = driveRes.headers.get('content-type') || '';
            // If Google Drive returns the PDF directly
            if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
              const arrayBuf = await driveRes.arrayBuffer();
              return new NextResponse(Buffer.from(arrayBuf), {
                status: 200,
                headers: {
                  'Content-Type': 'application/pdf',
                  'Content-Disposition': 'inline',
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
              });
            }
          }
        } catch {
          // If direct Google Drive fetch fails, return redirect to preview
        }
      }
    }

    // 3. Fallback for remote HTTP URL if direct PDF
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const extRes = await fetch(clean);
        if (extRes.ok) {
          const contentType = extRes.headers.get('content-type') || 'application/pdf';
          const arrayBuf = await extRes.arrayBuffer();
          return new NextResponse(Buffer.from(arrayBuf), {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': 'inline',
              'Cache-Control': 'no-store',
            },
          });
        }
      } catch {
        // Fallback
      }
    }

    return NextResponse.json({ error: 'File not found or inaccessible' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error streaming score file' }, { status: 500 });
  }
}
