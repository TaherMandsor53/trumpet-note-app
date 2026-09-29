import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let clean = rawUrl.trim();

    // 0. Base64 Data URLs (inline score images or PDFs)
    if (clean.startsWith('data:')) {
      const commaIdx = clean.indexOf(',');
      if (commaIdx !== -1) {
        const meta = clean.slice(0, commaIdx);
        const base64Data = clean.slice(commaIdx + 1);
        const mimeMatch = meta.match(/data:([^;]+)/);
        const contentType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const fileBuffer = Buffer.from(base64Data, 'base64');
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    }

    // 1. Local files in public/uploads, public/tunes, or /tmp/uploads
    if (clean.startsWith('/') || (!clean.startsWith('http://') && !clean.startsWith('https://'))) {
      const normalized = clean.startsWith('/') ? clean.slice(1) : clean;
      const [relativePath] = normalized.split('#')[0].split('?');
      const safePath = path.normalize(decodeURIComponent(relativePath)).replace(/^(\.\.(\/|\\|$))+/, '');

      // Check standard public directory
      const fullPath = path.join(process.cwd(), 'public', safePath);

      // Check /tmp directory for serverless environments (e.g. Vercel)
      const tmpPathDirect = path.join(os.tmpdir(), safePath);
      const tmpPathCleaned = path.join(os.tmpdir(), safePath.replace(/^tmp[\/\\]/, ''));

      let resolvedFile = '';
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        resolvedFile = fullPath;
      } else if (fs.existsSync(tmpPathCleaned) && fs.statSync(tmpPathCleaned).isFile()) {
        resolvedFile = tmpPathCleaned;
      } else if (fs.existsSync(tmpPathDirect) && fs.statSync(tmpPathDirect).isFile()) {
        resolvedFile = tmpPathDirect;
      }

      if (resolvedFile) {
        const fileBuffer = await fs.promises.readFile(resolvedFile);
        const ext = path.extname(resolvedFile).toLowerCase();
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
            // If Google Drive returns the PDF directly or image or octet-stream
            if (
              contentType.includes('pdf') ||
              contentType.includes('image') ||
              contentType.includes('octet-stream')
            ) {
              const arrayBuf = await driveRes.arrayBuffer();
              const responseType = contentType.includes('image')
                ? contentType
                : contentType.includes('pdf')
                ? 'application/pdf'
                : 'application/octet-stream';

              return new NextResponse(Buffer.from(arrayBuf), {
                status: 200,
                headers: {
                  'Content-Type': responseType,
                  'Content-Disposition': 'inline',
                  'Cache-Control': 'no-store, no-cache, must-revalidate',
                  'X-Content-Type-Options': 'nosniff',
                },
              });
            }
          }
        } catch {
          // If direct Google Drive fetch fails
        }
      }
    }

    // 3. Fallback for remote HTTP URL if direct PDF or image
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
              'X-Content-Type-Options': 'nosniff',
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
