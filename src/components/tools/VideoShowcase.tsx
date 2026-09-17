'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Play, ExternalLink } from 'lucide-react';

const BAND_VIDEOS = [
  {
    id: 1,
    name: 'Burhanedin Chaman Tera',
    key: 'burhandeen_chaman_tera_notes',
    videoId: 'QM1UC7O0sWI',
    url: 'https://www.youtube.com/watch?v=QM1UC7O0sWI',
    description: 'Scout band ceremonial performance featuring trumpet choir and marching percussion.',
  },
  {
    id: 2,
    name: 'Hubbi Lakum',
    key: 'hubbi_lakum_notes',
    videoId: 'LNvkhv3IDlg',
    url: 'https://www.youtube.com/watch?v=LNvkhv3IDlg',
    description: 'Rhythmic scout melody arranged for brass ensemble and cadence drums.',
  },
  {
    id: 3,
    name: 'Is Shamme Huda Ka Jo',
    key: 'Iss_shame_huda_ka_jo_notes',
    videoId: 'Xgkk1vOy8Zk',
    url: 'https://www.youtube.com/watch?v=Xgkk1vOy8Zk',
    description: 'Parade cadence and harmonic brass arrangement.',
  },
  {
    id: 4,
    name: 'Hai Tahani',
    key: 'hai_tahani_notes',
    videoId: 'x_wVH4o266Y',
    url: 'https://www.youtube.com/watch?v=x_wVH4o266Y',
    description: 'Celebratory Scout procession performance in full uniform.',
  },
];

export function VideoShowcase() {
  const [selectedVideo, setSelectedVideo] = useState(BAND_VIDEOS[0]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-1">
          <Video className="w-3.5 h-3.5" /> Performance Archive
        </div>
        <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
          Taheri Scout Band Performances
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Recorded parade drills, ceremonies, and harmonic band rehearsals.
        </p>
      </div>

      {/* Main Video Player */}
      <Card className="border border-border overflow-hidden shadow-lg">
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${selectedVideo.videoId}?autoplay=0&rel=0`}
            title={selectedVideo.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card">
          <div>
            <h3 className="font-serif font-bold text-lg text-foreground">{selectedVideo.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{selectedVideo.description}</p>
          </div>
          <a
            href={selectedVideo.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline shrink-0"
          >
            <span>Open in YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      {/* Video Playlist Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {BAND_VIDEOS.map(video => {
          const isCurrent = video.id === selectedVideo.id;
          return (
            <div
              key={video.id}
              onClick={() => setSelectedVideo(video)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isCurrent
                  ? 'border-amber-400 bg-amber-500/10 shadow-sm'
                  : 'border-border/70 hover:border-border hover:bg-muted/30'
              }`}
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-black mb-2 flex items-center justify-center">
                <img
                  src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                  alt={video.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <Play className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
              <h4 className="font-bold text-xs text-foreground line-clamp-1">{video.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                {video.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
