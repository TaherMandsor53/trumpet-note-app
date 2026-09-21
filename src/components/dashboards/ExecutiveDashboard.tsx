'use client';

import React, { useState } from 'react';
import {
  useGetUsersQuery,
  useGetTunesQuery,
  useGetAttendanceMetricsQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
} from '@/store/api/bandApi';
import { AttendanceMarker } from '@/components/attendance/AttendanceMarker';
import { AttendanceReports } from '@/components/attendance/AttendanceReports';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { InstrumentSection, Role } from '@/types/band';
import { ALL_SECTIONS, ALL_ROLES } from '@/lib/rbac';
import { formatDate, getDaysRemainingForNewBadge } from '@/lib/utils';
import {
  Crown,
  Users,
  CalendarCheck,
  Music,
  Plus,
  Trash2,
  FileSpreadsheet,
  CloudLightning,
  Sparkles,
  Search,
  CheckCircle,
} from 'lucide-react';

export function ExecutiveDashboard() {
  const { data: usersData, refetch: refetchUsers } = useGetUsersQuery();
  const { data: tunesData } = useGetTunesQuery();
  const { data: metrics } = useGetAttendanceMetricsQuery();

  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [activeTab, setActiveTab] = useState<'attendance' | 'members' | 'tunes'>('attendance');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // User form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<Role>('Band Member / Player');
  const [userSection, setUserSection] = useState<InstrumentSection>('Trumpet');
  const [userPhone, setUserPhone] = useState('');
  const [userRank, setUserRank] = useState('');

  const [searchMember, setSearchMember] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');

  const users = usersData?.users || [];
  const tunes = tunesData?.tunes || [];

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchMember.toLowerCase()) ||
      u.email.toLowerCase().includes(searchMember.toLowerCase());
    const matchSection = sectionFilter === 'All' || u.section === sectionFilter;
    return matchSearch && matchSection;
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;

    try {
      await createUser({
        name: userName,
        email: userEmail,
        role: userRole,
        section: userSection,
        phone: userPhone,
        rank: userRank || 'Scout Musician',
      }).unwrap();

      setIsAddUserModalOpen(false);
      setUserName('');
      setUserEmail('');
      setUserPhone('');
      setUserRank('');
      refetchUsers();
    } catch (err: any) {
      alert(err?.data?.error || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from the band?`)) {
      await deleteUser(id);
      refetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="bg-gradient-to-r from-amber-500/15 via-card to-card border border-amber-500/30 p-6 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-amber-400 bg-amber-400/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider mb-1">
              <Crown className="w-3.5 h-3.5" /> Overall Major Command Center
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground">
              Band Executive Administration
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Universal administrative authority: Manage all sections, record practice drills, oversee repertoire, and generate attendance reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsAddUserModalOpen(true)}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Member
            </Button>
          </div>
        </div>
      </div>

      {/* Top High-Level Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground font-medium">Total Band Members</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">
            {users.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Across 5 sections</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground font-medium">Attendance Rate</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">
            {metrics?.overallAttendanceRate || 0}%
          </p>
          <p className="text-[10px] text-emerald-500 font-medium mt-1">Drills & practices</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground font-medium">Stored Madeh Notes</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">
            {tunes.length}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Milad score archive</p>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-xs text-muted-foreground font-medium">Instrument Sections</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">5</p>
          <p className="text-[10px] text-muted-foreground mt-1">Brass, Woodwinds &amp; Percussion</p>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'attendance' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('attendance')}
          className="text-xs gap-1.5"
        >
          <CalendarCheck className="w-3.5 h-3.5" /> Practice Attendance &amp; Reports
        </Button>
        <Button
          variant={activeTab === 'members' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('members')}
          className="text-xs gap-1.5"
        >
          <Users className="w-3.5 h-3.5" /> Universal User Roster ({users.length})
        </Button>
        <Button
          variant={activeTab === 'tunes' ? 'gold' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('tunes')}
          className="text-xs gap-1.5"
        >
          <Music className="w-3.5 h-3.5" /> Stored Madeh Library ({tunes.length})
        </Button>
      </div>

      {/* Tab 1: Attendance Logging & Reports */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <AttendanceMarker />
          <AttendanceReports />
        </div>
      )}

      {/* Tab 2: Universal Member Directory */}
      {activeTab === 'members' && (
        <Card className="border border-border">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Universal Band Member Directory
                </CardTitle>
                <CardDescription className="text-xs">
                  Full administrative CRUD: Add, update, and manage members across all 5 instrument sections.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search member..."
                    value={searchMember}
                    onChange={e => setSearchMember(e.target.value)}
                    className="pl-8 text-xs h-8 w-44"
                  />
                </div>
                <Select
                  value={sectionFilter}
                  onChange={e => setSectionFilter(e.target.value)}
                  className="text-xs h-8 w-32"
                >
                  <option value="All">All Sections</option>
                  {ALL_SECTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{u.name}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px]">{u.section}</Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant={u.role === 'Overall Major' ? 'gold' : u.role === 'Treasurer' ? 'emerald' : 'secondary'}
                          className="text-[10px]"
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{u.rank || '—'}</td>
                      <td className="py-2.5 px-3 text-right">
                        {u.role !== 'Overall Major' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Master Repertoire */}
      {activeTab === 'tunes' && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-400" />
              Master Band Repertoire & Tune Notations
            </CardTitle>
            <CardDescription className="text-xs">
              Universal sheet music catalog across all instrument voices with automatic 15-day NEW tag.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tunes.map(tune => {
                const isNew = tune.isNew;
                const daysRemaining = isNew ? getDaysRemainingForNewBadge(tune.createdAt) : 0;

                return (
                  <div
                    key={tune.id}
                    className="p-4 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif font-bold text-sm text-foreground">
                          {tune.title}
                        </h4>
                        {isNew && (
                          <Badge variant="new" className="shrink-0">
                            NEW ({daysRemaining}d)
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <Badge variant="outline" className="text-[10px]">{tune.section}</Badge>
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
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        View Sheet PDF →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add User Dialog */}
      <Dialog open={isAddUserModalOpen} onOpenChange={setIsAddUserModalOpen}>
        <DialogHeader>
          <DialogTitle>Add Band Member / Officer</DialogTitle>
          <DialogDescription>
            Register a new officer or musician into the official band directory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddUser} className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-muted-foreground mb-1 block">Full Name</label>
            <Input
              value={userName}
              onChange={e => setUserName(e.target.value)}
              placeholder="e.g. Murtaza Bhai"
              required
            />
          </div>
          <div>
            <label className="font-medium text-muted-foreground mb-1 block">Email Address</label>
            <Input
              type="email"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              placeholder="murtaza@taheriscout.org"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Role</label>
              <Select
                value={userRole}
                onChange={e => setUserRole(e.target.value as any)}
              >
                {ALL_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Instrument Section</label>
              <Select
                value={userSection}
                onChange={e => setUserSection(e.target.value as any)}
              >
                {ALL_SECTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Phone Number</label>
              <Input
                value={userPhone}
                onChange={e => setUserPhone(e.target.value)}
                placeholder="+91 98200..."
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Band Rank</label>
              <Input
                value={userRank}
                onChange={e => setUserRank(e.target.value)}
                placeholder="e.g. 1st Trumpeter"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddUserModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={isCreatingUser}>
              {isCreatingUser ? 'Saving...' : 'Register Member'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
