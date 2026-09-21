'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  useGetPersonalFinancialsQuery,
  useGetTunesQuery,
  useGetAttendanceSessionsQuery,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate, getDaysRemainingForNewBadge } from '@/lib/utils';
import {
  UserCheck,
  Coins,
  Music,
  CalendarDays,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function MemberPortal() {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { data: personalFin, isLoading: isLoadingFin } = useGetPersonalFinancialsQuery();
  const { data: tunesData, isLoading: isLoadingTunes } = useGetTunesQuery({ section: currentUser?.section });
  const { data: attendanceData } = useGetAttendanceSessionsQuery();

  const tunes = tunesData?.tunes || [];
  const sessions = attendanceData?.sessions || [];

  // Compute personal attendance history
  const personalAttendance = sessions.map(s => {
    const entry = s.records.find(r => r.userId === currentUser?.id);
    return {
      sessionDate: s.date,
      sessionTitle: s.sessionTitle,
      status: entry?.status || 'Absent',
    };
  });

  const presentCount = personalAttendance.filter(
    a => a.status === 'Present' || a.status === 'Late'
  ).length;

  const attendancePercent =
    personalAttendance.length > 0
      ? Math.round((presentCount / personalAttendance.length) * 100)
      : 100;

  const latestPayment = personalFin?.latestRecord;
  const isPaid = personalFin?.currentStatus === 'Paid';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-card via-card to-amber-500/10 border border-border p-6 rounded-xl relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-semibold mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Scout Musician Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
              Welcome, {currentUser?.name || 'Scout Player'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Section: <span className="font-semibold text-foreground">{currentUser?.section}</span> • Rank: {currentUser?.rank || 'Band Player'}
            </p>
          </div>

          {/* Quick Lavajam Badge Pill */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Lavajam Status
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant={isPaid ? 'emerald' : 'destructive'}
                  className="text-xs py-1 px-3 font-bold"
                >
                  {isPaid ? 'PAID' : 'PENDING'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cards: Personal Lavajam Status & Personal Attendance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Financial (Lavajam) Card */}
        <Card className={`border-2 ${isPaid ? 'border-emerald-500/40' : 'border-rose-500/40'} shadow-sm`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Personal Lavajam Contribution Status
              </span>
              <Badge variant={isPaid ? 'emerald' : 'destructive'} className="text-[11px]">
                {isPaid ? 'Current Month Paid' : 'Payment Due'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Your band contribution covers uniform maintenance, instrument tuning, and sheet music.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {isLoadingFin ? (
              <p className="text-muted-foreground">Loading contribution data...</p>
            ) : latestPayment ? (
              <div className="space-y-2 bg-muted/20 p-3 rounded-lg border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Contribution Cycle:</span>
                  <span className="font-semibold text-foreground">
                    {latestPayment.month} {latestPayment.year}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Standard Contribution:</span>
                  <span className="font-bold text-foreground text-sm">
                    {formatCurrency(latestPayment.amount)}
                  </span>
                </div>
                {latestPayment.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span className="font-medium text-foreground">{formatDate(latestPayment.paidAt)}</span>
                  </div>
                )}
                {latestPayment.receiptNo && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Official Receipt No:</span>
                    <span className="font-mono font-bold text-primary">{latestPayment.receiptNo}</span>
                  </div>
                )}
                {latestPayment.transactionRef && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Payment Ref:</span>
                    <span className="font-mono text-muted-foreground">{latestPayment.transactionRef}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">No recent payment record registered.</p>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground italic">
              * Privacy Shield: Other band members' financial figures and central ledger amounts are restricted.
            </p>
          </CardContent>
        </Card>

        {/* Personal Practice Attendance Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Practice Attendance Record
              </span>
              <span className="font-bold text-lg text-primary">{attendancePercent}%</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Attended {presentCount} of {personalAttendance.length} practice drills.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-3">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {personalAttendance.slice(0, 5).map((att, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-md border border-border/50 bg-muted/10 text-xs"
                >
                  <span className="font-medium text-foreground truncate max-w-[200px]">
                    {att.sessionTitle}
                  </span>
                  <Badge
                    variant={att.status === 'Present' ? 'emerald' : att.status === 'Late' ? 'default' : 'destructive'}
                    className="text-[10px] py-0"
                  >
                    {att.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Sheet Music & Tune Catalog with 15-day "NEW" badge logic */}
      <Card className="border border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-400" />
                Your Stored Madeh Notes &amp; Section Repertoire
              </CardTitle>
              <CardDescription className="text-xs">
                Sacred Madeh scores assigned directly to you for Mola's Milad Mubarak processions and rehearsal drills.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {tunes.length} Stored Madeh Notes
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTunes ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Loading sheet music...
            </div>
          ) : tunes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              No sheet music currently assigned. Check back after your next practice session!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tunes.map(tune => {
                const isNew = tune.isNew;
                const daysRemaining = isNew ? getDaysRemainingForNewBadge(tune.createdAt) : 0;

                return (
                  <div
                    key={tune.id}
                    className="p-4 rounded-xl border border-border/70 bg-muted/15 hover:bg-muted/40 transition-all flex flex-col justify-between group space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {tune.title}
                        </h4>
                        {isNew && (
                          <Badge variant="new" className="shrink-0">
                            NEW ({daysRemaining}d)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 font-mono">
                        <span>{tune.section}</span>
                        <span>• {tune.difficulty || 'Intermediate'}</span>
                        <span>• {tune.tempo || '112 BPM'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <span className="text-[10px] text-muted-foreground">
                        Added {formatDate(tune.createdAt)}
                      </span>
                      <a
                        href={tune.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
                      >
                        <FileText className="w-3.5 h-3.5" /> Open Notes PDF
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
