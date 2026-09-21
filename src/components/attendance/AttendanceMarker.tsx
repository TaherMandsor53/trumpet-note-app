'use client';

import React, { useState, useEffect } from 'react';
import { useGetUsersQuery, useMarkAttendanceMutation, useGetAttendanceSessionsQuery } from '@/store/api/bandApi';
import { AttendanceStatus, InstrumentSection, User } from '@/types/band';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Save,
  CheckCheck,
  FileSpreadsheet,
  Download,
  Filter,
  Users,
  Sparkles,
  CloudCheck,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { isInstrumentMajor, isOverallMajor, getManagedSection } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export function AttendanceMarker({ onSuccess }: { onSuccess?: () => void }) {
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const role = currentUser?.role || activeRole;

  // Authorization: Only Overall Major can mark practice attendance
  const isAuthorizedMajor = isOverallMajor(role);
  const isSectionMajor = isInstrumentMajor(role);
  const managedSection = getManagedSection(role) || currentUser?.section || 'Trumpet';

  const { data: usersData, refetch: refetchUsers } = useGetUsersQuery();
  const { data: sessionsData, refetch: refetchSessions } = useGetAttendanceSessionsQuery();
  const [markAttendance, { isLoading }] = useMarkAttendanceMutation();

  const users = usersData?.users || [];

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Section filter
  const [sectionFilter, setSectionFilter] = useState<string>(() =>
    isSectionMajor ? managedSection : 'All'
  );

  useEffect(() => {
    if (isSectionMajor && managedSection) {
      setSectionFilter(managedSection);
    }
  }, [isSectionMajor, managedSection]);

  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance status map: strictly Present | Absent | Late
  const [statusMap, setStatusMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [viewMode, setViewMode] = useState<'mark' | 'matrix'>('mark');

  // Helper to format ISO date to DD/MM/YYYY (matching Google Sheet Image 3)
  const formatDDMMYYYY = (isoDate: string) => {
    if (!isoDate) return '';
    const d = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate;
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  // Initialize status map for all users (defaults to Present)
  useEffect(() => {
    if (users.length > 0) {
      setStatusMap(prev => {
        const initial = { ...prev };
        users.forEach(u => {
          if (!initial[u.id]) {
            initial[u.id] = { status: 'Present', notes: '' };
          }
        });
        return initial;
      });
    }
  }, [users]);

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    if (!isAuthorizedMajor) return;
    setStatusMap(prev => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    if (!isAuthorizedMajor) return;
    setStatusMap(prev => ({
      ...prev,
      [userId]: { ...prev[userId], notes },
    }));
  };

  // Bulk status assignment (Overall Major only)
  const markAll = (status: AttendanceStatus) => {
    if (!isAuthorizedMajor) return;
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    users.forEach(u => {
      if (sectionFilter === 'All' || u.section === sectionFilter) {
        updated[u.id] = { status, notes: statusMap[u.id]?.notes || '' };
      } else {
        updated[u.id] = statusMap[u.id] || { status: 'Present', notes: '' };
      }
    });
    setStatusMap(prev => ({ ...prev, ...updated }));
  };

  // Submit attendance and trigger Google Sheet sync
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorizedMajor) {
      setMessage({
        text: 'Permission Denied: Only Overall Major has authorization to mark attendance.',
        type: 'error',
      });
      return;
    }

    setMessage(null);

    try {
      const recordsToSubmit = users
        .filter(u => sectionFilter === 'All' || u.section === sectionFilter)
        .map(u => ({
          userId: u.id,
          userName: u.name,
          section: u.section,
          status: statusMap[u.id]?.status || 'Present',
          notes: statusMap[u.id]?.notes || '',
        }));

      const res = await markAttendance({
        date,
        sessionTitle: `Practice Attendance Session (${formatDDMMYYYY(date)})`,
        sessionType: 'Regular Practice',
        records: recordsToSubmit,
      }).unwrap();

      setMessage({
        text: res.message || `Attendance for ${formatDDMMYYYY(date)} recorded and synchronized to Attendance Details sheet.`,
        type: 'success',
      });

      refetchSessions();
      onSuccess?.();
    } catch (err: any) {
      setMessage({
        text: err?.data?.error || 'Failed to submit attendance session.',
        type: 'error',
      });
    }
  };

  // Scoped members list:
  // ONLY Overall Major can view all members. All other members (including Section Majors) can only view their own particular attendance record.
  const filteredUsers = React.useMemo(() => {
    if (!isAuthorizedMajor) {
      if (!currentUser) return [];
      const matches = users.filter(
        u =>
          u.id === currentUser.id ||
          (currentUser.itsNumber && u.itsNumber === currentUser.itsNumber) ||
          (u.name && currentUser.name && u.name.trim().toUpperCase() === currentUser.name.trim().toUpperCase())
      );
      return matches.length > 0 ? matches : [currentUser];
    }

    return users.filter(u => {
      const matchesSection = sectionFilter === 'All' || u.section === sectionFilter;
      const matchesSearch =
        !searchQuery ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.itsNumber && u.itsNumber.includes(searchQuery)) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [isAuthorizedMajor, currentUser, users, sectionFilter, searchQuery]);

  // Count current selections
  const presentCount = filteredUsers.filter(u => statusMap[u.id]?.status === 'Present').length;
  const lateCount = filteredUsers.filter(u => statusMap[u.id]?.status === 'Late').length;
  const absentCount = filteredUsers.filter(u => statusMap[u.id]?.status === 'Absent').length;

  const sortedSessions = [...(sessionsData?.sessions || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card className="border border-border/80 shadow-md">
      <CardHeader className="border-b border-border/60 pb-4 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-semibold mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#D97736]" />
              {isAuthorizedMajor ? 'Practice Hazri (Attendance Module)' : 'My Personal Practice Hazri'}
            </div>
            <CardTitle className="text-xl font-serif font-black tracking-tight text-foreground flex items-center gap-2">
              <span>{isAuthorizedMajor ? 'Attendance Details Sync' : 'My Attendance Record'}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 border-emerald-500/30">
                Google Drive Live
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {isAuthorizedMajor
                ? 'Attendance records are synchronized with the Google Drive "Attendance Details" sheet.'
                : 'Viewing your personal attendance record. Only Overall Major can mark and view all band members.'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Form vs Matrix */}
            <div className="flex items-center p-1 rounded-lg bg-muted/50 border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('mark')}
                className={cn(
                  'px-3 py-1 rounded-md font-semibold transition-all',
                  viewMode === 'mark'
                    ? 'bg-[#D97736] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {isAuthorizedMajor ? 'Hazri Marker' : 'My Hazri Record'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={cn(
                  'px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1',
                  viewMode === 'matrix'
                    ? 'bg-[#D97736] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileSpreadsheet className="w-3 h-3" /> Live Sheet Matrix
              </button>
            </div>

            {/* Export Excel Button (Overall Major only, or personal export) */}
            {isAuthorizedMajor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('/api/excel/export?type=attendance', '_blank')}
                className="text-xs gap-1.5 h-8 border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400"
                title="Download formatted Attendance Details Excel Sheet"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Excel</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Role Permission Alert Notice */}
      {!isAuthorizedMajor && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#D97736] shrink-0" />
            <span>
              <strong>Personal Attendance Record:</strong> You can only view your own particular attendance record. Only the Overall Major has authorization to mark and view attendance for all band members (including Section Majors).
            </span>
          </div>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] shrink-0 font-mono">
            Personal Record
          </Badge>
        </div>
      )}

      {viewMode === 'mark' ? (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-5">
            {message && (
              <div
                className={cn(
                  'p-3.5 rounded-lg text-xs font-medium border flex items-center gap-2',
                  message.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-destructive/15 border-destructive/30 text-destructive'
                )}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Redesigned Themed Date Picker Header (Practice Type & Session Focus Removed per Image 2) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="max-w-xs w-full">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                    Mark Attendance Date (Column Header at Top)
                  </label>
                  <ThemedDatePicker
                    value={date}
                    onChange={setDate}
                    disabled={!isAuthorizedMajor}
                  />
                </div>

                {/* Quick Bulk Action Buttons (Only shown if authorized Major) */}
                {isAuthorizedMajor && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-4 sm:pt-0">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">Quick Mark:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('Present')}
                      className="text-[11px] h-8 px-2.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1" /> All Present
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('Late')}
                      className="text-[11px] h-8 px-2.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/15"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1" /> All Late
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('Absent')}
                      className="text-[11px] h-8 px-2.5 text-rose-400 border-rose-500/30 hover:bg-rose-500/15"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> All Absent
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Live Counter Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {!isAuthorizedMajor ? (
                  <span className="text-xs font-bold text-[#E5A93C] bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D97736]" />
                    Personal Hazri Record • {currentUser?.name}
                  </span>
                ) : (
                  <>
                    <Select
                      value={sectionFilter}
                      onChange={e => setSectionFilter(e.target.value)}
                      className="text-xs h-8 w-44 bg-card"
                    >
                      <option value="All">All Sections ({users.length})</option>
                      <option value="Trumpet">Trumpet Section</option>
                      <option value="SideDrum">SideDrum/BaseDrum Section</option>
                      <option value="Saxophone">Saxophone Section</option>
                      <option value="Euphonium">Euphonium Section</option>
                      <option value="Trombone">Trombone Section</option>
                      <option value="Dish">Dish Section</option>
                    </Select>
                    <Input
                      type="text"
                      placeholder="Search member / ITS..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="text-xs h-8 w-44 bg-card"
                    />
                  </>
                )}
              </div>

              {/* Real-time Status Badges */}
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> {presentCount} Present
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> {lateCount} Late
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <XCircle className="w-3 h-3" /> {absentCount} Absent
                </span>
              </div>
            </div>

            {/* Member Attendance Table: strictly Present, Absent, Late */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
              <div className="max-h-[460px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 backdrop-blur z-10 border-b border-border/80">
                    <tr>
                      <th className="py-3 px-4">ITS &amp; Full Name</th>
                      <th className="py-3 px-3">Section</th>
                      <th className="py-3 px-3">Role</th>
                      <th className="py-3 px-4 text-center">
                        Attendance Status (Image 3: Present, Absent, Late)
                      </th>
                      <th className="py-3 px-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No members matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => {
                        const current = statusMap[u.id] || { status: 'Present', notes: '' };

                        return (
                          <tr key={u.id} className="hover:bg-muted/25 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground text-xs uppercase">{u.name}</div>
                              <div className="text-[11px] font-mono text-[#D97736]">
                                ITS: {u.itsNumber || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-medium text-foreground">
                                {u.section === 'SideDrum' ? 'SideDrum/BaseDrum' : u.section}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <Badge variant="outline" className="text-[10px] py-0 border-border/60">
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              {/* If authorized Major: Interactive Buttons. If view-only: Clean Status Badge */}
                              {isAuthorizedMajor ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(u.id, 'Present')}
                                    className={cn(
                                      'px-3 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer',
                                      current.status === 'Present'
                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                        : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/80'
                                    )}
                                    title="Mark Present"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Present</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(u.id, 'Late')}
                                    className={cn(
                                      'px-3 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer',
                                      current.status === 'Late'
                                        ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                                        : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/80'
                                    )}
                                    title="Mark Late"
                                  >
                                    <Clock className="w-3 h-3" />
                                    <span>Late</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(u.id, 'Absent')}
                                    className={cn(
                                      'px-3 py-1 rounded-md text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer',
                                      current.status === 'Absent'
                                        ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                        : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/80'
                                    )}
                                    title="Mark Absent"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    <span>Absent</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  {current.status === 'Present' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                    </span>
                                  )}
                                  {current.status === 'Late' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                                      <Clock className="w-3.5 h-3.5" /> Late
                                    </span>
                                  )}
                                  {current.status === 'Absent' && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-semibold">
                                      <XCircle className="w-3.5 h-3.5" /> Absent
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {isAuthorizedMajor ? (
                                <input
                                  type="text"
                                  value={current.notes}
                                  onChange={e => handleNotesChange(u.id, e.target.value)}
                                  placeholder="Optional remarks..."
                                  className="w-full bg-transparent border-b border-border/60 text-xs px-1.5 py-0.5 focus:outline-none focus:border-[#D97736]"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">{current.notes || '—'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4 bg-muted/10">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CloudCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Saving marks date <strong className="text-foreground font-mono">{formatDDMMYYYY(date)}</strong> at top and updates Attendance Details sheet in Google Drive.
              </span>
            </div>

            {isAuthorizedMajor ? (
              <Button
                type="submit"
                variant="havenly"
                size="sm"
                disabled={isLoading}
                className="gap-2 text-xs px-6 shadow-warm-glow cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'Updating Sheet...' : 'Submit & Update Attendance Details Sheet'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('/api/excel/export?type=attendance', '_blank')}
                className="text-xs gap-1.5 border-emerald-500/40 text-emerald-400"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Attendance Sheet (.xlsx)</span>
              </Button>
            )}
          </CardFooter>
        </form>
      ) : (
        /* Live Matrix View of Attendance Details Sheet (Mirrors Image 3) */
        <CardContent className="space-y-4 pt-5">
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isAuthorizedMajor ? 'Attendance Details Sheet Preview (Google Drive Matrix)' : 'My Attendance History Matrix'}
              </h4>
              <p className="text-xs text-foreground mt-0.5">
                {isAuthorizedMajor
                  ? `Exact structure as in Google Sheet: Column A shows Full Name, top row shows Dates (${formatDDMMYYYY(date)}), cells display Present, Absent, or Late.`
                  : 'Your personal attendance entries recorded across previous practice sessions.'}
              </p>
            </div>
            {isAuthorizedMajor && (
              <Button
                type="button"
                variant="havenly"
                size="sm"
                onClick={() => window.open('/api/excel/export?type=attendance', '_blank')}
                className="text-xs gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Attendance Details (.xlsx)
              </Button>
            )}
          </div>

          <div className="border border-border/80 rounded-xl overflow-x-auto bg-card">
            <table className="w-full text-xs text-left min-w-[700px]">
              <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-4 whitespace-nowrap bg-muted/90 font-bold text-foreground">
                    Full Name (Column A)
                  </th>
                  {sortedSessions.map(sess => {
                    const colDate = formatDDMMYYYY(sess.date);
                    return (
                      <th
                        key={sess.id}
                        className="py-2.5 px-3 text-center whitespace-nowrap bg-amber-500/10 text-amber-200 border-l border-border/60 font-mono"
                        title={sess.sessionTitle}
                      >
                        {colDate}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map(member => (
                  <tr key={member.id} className="hover:bg-muted/25 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-foreground uppercase tracking-tight">
                      {member.name}
                    </td>
                    {sortedSessions.map(sess => {
                      const rec = sess.records.find(
                        r =>
                          r.userId === member.id ||
                          (member.itsNumber && (r.userId === member.itsNumber || r.userId === `sheet-${member.itsNumber}`)) ||
                          r.userName.toLowerCase() === member.name.toLowerCase()
                      );
                      const status = rec ? rec.status : '—';

                      return (
                        <td key={sess.id} className="py-2.5 px-3 text-center border-l border-border/50">
                          {status === 'Present' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                              Present
                            </span>
                          )}
                          {status === 'Late' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/30">
                              Late
                            </span>
                          )}
                          {status === 'Absent' && (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30">
                              Absent
                            </span>
                          )}
                          {status === '—' && (
                            <span className="text-muted-foreground/40 text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
