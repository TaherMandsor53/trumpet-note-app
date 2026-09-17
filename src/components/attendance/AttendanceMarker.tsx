'use client';

import React, { useState } from 'react';
import { useGetUsersQuery, useMarkAttendanceMutation } from '@/store/api/bandApi';
import { AttendanceStatus, InstrumentSection } from '@/types/band';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertCircle, Calendar, Save, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AttendanceMarker({ onSuccess }: { onSuccess?: () => void }) {
  const { data: usersData } = useGetUsersQuery();
  const [markAttendance, { isLoading }] = useMarkAttendanceMutation();

  const users = usersData?.users || [];
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTitle, setSessionTitle] = useState('Scout Band Practice & March Rehearsal');
  const [sessionType, setSessionType] = useState<'Regular Practice' | 'Parade Drill' | 'Ceremony Rehearsal' | 'Sectional'>('Regular Practice');

  // Attendance state map
  const [statusMap, setStatusMap] = useState<Record<string, { status: AttendanceStatus; notes: string }>>({});
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Initialize status map if not set
  React.useEffect(() => {
    if (users.length > 0 && Object.keys(statusMap).length === 0) {
      const initial: Record<string, { status: AttendanceStatus; notes: string }> = {};
      users.forEach(u => {
        initial[u.id] = { status: 'Present', notes: '' };
      });
      setStatusMap(initial);
    }
  }, [users]);

  const handleStatusChange = (userId: string, status: AttendanceStatus) => {
    setStatusMap(prev => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleNotesChange = (userId: string, notes: string) => {
    setStatusMap(prev => ({
      ...prev,
      [userId]: { ...prev[userId], notes },
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; notes: string }> = {};
    users.forEach(u => {
      updated[u.id] = { status, notes: statusMap[u.id]?.notes || '' };
    });
    setStatusMap(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const records = users.map(u => ({
      userId: u.id,
      userName: u.name,
      section: u.section,
      status: statusMap[u.id]?.status || 'Present',
      notes: statusMap[u.id]?.notes || '',
    }));

    try {
      await markAttendance({
        date: new Date(date).toISOString(),
        sessionTitle,
        sessionType,
        records,
      }).unwrap();

      setMessage({ text: 'Practice attendance saved successfully!', type: 'success' });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({
        text: err?.data?.error || 'Failed to save attendance record.',
        type: 'error',
      });
    }
  };

  return (
    <Card className="border border-border shadow-md">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Practice Attendance Logger
            </CardTitle>
            <CardDescription>
              Executive control: Only the Overall Major has authorization to record practice attendance.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAll('Present')}
              className="text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Mark All Present
            </Button>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={cn(
                'p-3 rounded-md text-xs font-medium border',
                message.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-destructive/15 border-destructive/30 text-destructive'
              )}
            >
              {message.text}
            </div>
          )}

          {/* Session Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Session Date
              </label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Session Type
              </label>
              <Select
                value={sessionType}
                onChange={e => setSessionType(e.target.value as any)}
              >
                <option value="Regular Practice">Regular Practice</option>
                <option value="Parade Drill">Parade Drill</option>
                <option value="Ceremony Rehearsal">Ceremony Rehearsal</option>
                <option value="Sectional">Sectional Practice</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Session Name / Focus
              </label>
              <Input
                value={sessionTitle}
                onChange={e => setSessionTitle(e.target.value)}
                placeholder="e.g. Cadence drills & Anthem"
                required
              />
            </div>
          </div>

          {/* Member Attendance Table */}
          <div className="border rounded-lg overflow-hidden mt-4">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 backdrop-blur z-10 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Member & Section</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-center">Attendance Status</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map(u => {
                    const current = statusMap[u.id] || { status: 'Present', notes: '' };

                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.section}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px] py-0">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(u.id, 'Present')}
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-semibold border transition-all',
                                current.status === 'Present'
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              )}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(u.id, 'Absent')}
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-semibold border transition-all',
                                current.status === 'Absent'
                                  ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              )}
                            >
                              Absent
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(u.id, 'Late')}
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-semibold border transition-all',
                                current.status === 'Late'
                                  ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              )}
                            >
                              Late
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(u.id, 'Excused')}
                              className={cn(
                                'px-2 py-1 rounded text-[11px] font-semibold border transition-all',
                                current.status === 'Excused'
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                              )}
                            >
                              Excused
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={current.notes}
                            onChange={e => handleNotesChange(u.id, e.target.value)}
                            placeholder="Optional remark..."
                            className="w-full bg-transparent border-b border-border/60 text-xs px-1 py-0.5 focus:outline-none focus:border-primary"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button type="submit" variant="gold" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" /> {isLoading ? 'Saving...' : 'Submit Attendance Session'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
