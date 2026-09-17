'use client';

import React, { useState } from 'react';
import { useGetAttendanceMetricsQuery, useGetAttendanceSessionsQuery } from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  CalendarDays,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export function AttendanceReports() {
  const { data: metrics, isLoading } = useGetAttendanceMetricsQuery();
  const { data: sessionsData } = useGetAttendanceSessionsQuery();
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'weekly' | 'monthly'>('all');

  const sessions = sessionsData?.sessions || [];

  const handleExport = () => {
    window.open('/api/excel/export?type=attendance', '_blank');
  };

  if (isLoading || !metrics) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-xs">Computing attendance analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground font-medium">Practice Attendance Rate</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-serif text-foreground">
              {metrics.overallAttendanceRate}%
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Target 85%+
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all"
              style={{ width: `${metrics.overallAttendanceRate}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground font-medium">Total Present Marks</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              {metrics.presentCount}
            </span>
            <span className="text-[11px] text-muted-foreground">entries</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Across {metrics.totalSessions} sessions</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs text-muted-foreground font-medium">Absences Recorded</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              {metrics.absentCount}
            </span>
            <span className="text-[11px] text-rose-500 font-medium">Needs follow-up</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Excused: {metrics.excusedCount}</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-xs text-muted-foreground font-medium">Total Sessions Logged</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-foreground">
              {metrics.totalSessions}
            </span>
            <span className="text-[11px] text-muted-foreground">rehearsals</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Cadence & parade drills</p>
        </Card>
      </div>

      {/* Section Readiness Breakdown */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Instrument Section Readiness Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Daily & weekly percentage of present players per musical section
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export Excel Report
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {metrics.sectionBreakdown.map(sb => (
              <div
                key={sb.section}
                className="p-3 rounded-lg border border-border bg-muted/20 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{sb.section}</span>
                    <Badge variant={sb.rate >= 80 ? 'emerald' : sb.rate >= 60 ? 'default' : 'destructive'} className="text-[10px]">
                      {sb.rate}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {sb.present} / {sb.total} sessions present
                  </p>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${sb.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions History */}
      <Card className="border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Recent Practice Sessions Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map(s => {
              const present = s.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
              const rate = s.records.length > 0 ? Math.round((present / s.records.length) * 100) : 0;

              return (
                <div
                  key={s.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">{s.sessionTitle}</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {s.sessionType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground mt-1">
                      <span>Date: {new Date(s.date).toLocaleDateString()}</span>
                      <span>• Marked by: {s.markedBy}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-sm text-foreground">{rate}%</div>
                      <div className="text-[10px] text-muted-foreground">
                        {present} / {s.records.length} Present
                      </div>
                    </div>
                    <div className="w-16 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
