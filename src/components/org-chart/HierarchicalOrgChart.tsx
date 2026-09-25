'use client';

import React, { useState, useMemo } from 'react';
import { useGetUsersQuery } from '@/store/api/bandApi';
import { User, InstrumentSection } from '@/types/band';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  TrumpetGlyph,
  SaxophoneGlyph,
  DrumGlyph,
  CymbalsGlyph,
} from '@/components/ui/musical-icons';
import {
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Crown,
  Coins,
  Music2,
  Sparkles,
  Search,
  Network,
  Calendar,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function HierarchicalOrgChart() {
  const { data, isLoading } = useGetUsersQuery({ all: 'true' });
  const users = data?.users || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'tree' | 'compact'>('tree');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);

  // Track expanded state for each section branch
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Trumpet: true,
    Saxophone: true,
    Euphonium: true,
    Trombone: true,
    Dish: true,
    SideDrum: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const expandAll = () => {
    setExpandedSections({
      Trumpet: true,
      Saxophone: true,
      Euphonium: true,
      Trombone: true,
      Dish: true,
      SideDrum: true,
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      Trumpet: false,
      Saxophone: false,
      Euphonium: false,
      Trombone: false,
      Dish: false,
      SideDrum: false,
    });
  };

  // Find leadership: Executive Command (Overall Major / Majors)
  const majors = useMemo(() => {
    return users.filter(u => u.role === 'Overall Major' || u.role === 'Major');
  }, [users]);

  // Instrument Sections Mapping
  const instrumentSections: {
    section: InstrumentSection;
    majorRole: string;
    icon: React.ReactNode;
    color: string;
    accentBorder: string;
    accentBg: string;
  }[] = [
    {
      section: 'Trumpet',
      majorRole: 'Trumpet Major',
      icon: <TrumpetGlyph className="w-4 h-4 text-amber-400" />,
      color: 'text-amber-400',
      accentBorder: 'border-amber-500',
      accentBg: 'bg-amber-500/10',
    },
    {
      section: 'Saxophone',
      majorRole: 'Saxophone Major',
      icon: <SaxophoneGlyph className="w-4 h-4 text-[#D97736]" />,
      color: 'text-[#D97736]',
      accentBorder: 'border-[#D97736]',
      accentBg: 'bg-[#D97736]/10',
    },
    {
      section: 'Euphonium',
      majorRole: 'Euphonium Major',
      icon: <Music2 className="w-4 h-4 text-yellow-300" />,
      color: 'text-yellow-300',
      accentBorder: 'border-yellow-400',
      accentBg: 'bg-yellow-400/10',
    },
    {
      section: 'Trombone',
      majorRole: 'Trombone Major',
      icon: <Music2 className="w-4 h-4 text-amber-500" />,
      color: 'text-amber-500',
      accentBorder: 'border-amber-600',
      accentBg: 'bg-amber-600/10',
    },
    {
      section: 'Dish',
      majorRole: 'Dish Major',
      icon: <CymbalsGlyph className="w-4 h-4 text-emerald-400" />,
      color: 'text-emerald-400',
      accentBorder: 'border-emerald-500',
      accentBg: 'bg-emerald-500/10',
    },
    {
      section: 'SideDrum',
      majorRole: 'SideDrum Major',
      icon: <DrumGlyph className="w-4 h-4 text-purple-400" />,
      color: 'text-purple-400',
      accentBorder: 'border-purple-500',
      accentBg: 'bg-purple-500/10',
    },
  ];

  // Filtered sections based on search and section filter
  const filteredSections = useMemo(() => {
    return instrumentSections.filter(sec => {
      if (selectedSection !== 'All' && sec.section !== selectedSection) {
        return false;
      }
      return true;
    });
  }, [selectedSection, instrumentSections]);

  const matchesSearch = (user: User) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      (user.rank && user.rank.toLowerCase().includes(term)) ||
      user.section.toLowerCase().includes(term)
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-muted-foreground">
        <div className="w-10 h-10 border-4 border-[#D97736] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-lg text-foreground">Loading Workday Org Chart...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4">
      {/* Workday Header Banner */}
      <div className="rounded-3xl border border-amber-900/20 dark:border-amber-500/15 bg-card/80 dark:bg-[#25130B]/80 backdrop-blur-xl p-4 sm:p-6 md:p-8 shadow-xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D97736]/30 bg-[#D97736]/10 text-[#D97736] text-xs font-semibold uppercase tracking-widest mb-2 backdrop-blur">
              <Network className="w-3.5 h-3.5" /> Workday Employee Hierarchy
            </div>
            <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-foreground">
              Taheri Scout Band Organization Tree
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
              Corporate reporting lines and team directory modeled after Workday. Drill down from Executive Command to Section Leadership and performing artists.
            </p>
          </div>

          {/* Quick Tree Controls: Responsive 3-Col Equal Grid on Mobile, Flex on Desktop */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full sm:w-auto sm:flex sm:items-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={expandAll}
              className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 h-8.5 rounded-full px-2 sm:px-3 justify-center w-full sm:w-auto"
              title="Expand all branches"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#D97736] shrink-0" />
              <span className="truncate">Expand All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAll}
              className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 h-8.5 rounded-full px-2 sm:px-3 justify-center w-full sm:w-auto"
              title="Collapse all branches"
            >
              <Minimize2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">Collapse All</span>
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'havenly' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'tree' ? 'compact' : 'tree')}
              className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 h-8.5 rounded-full px-2 sm:px-3.5 justify-center w-full sm:w-auto font-semibold shadow-xs"
              title="Toggle Tree / Grid View"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{viewMode === 'tree' ? 'Tree View' : 'Grid View'}</span>
            </Button>
          </div>
        </div>

        {/* Search & Section Filter Bar: Stack neatly and allow smooth horizontal scroll on mobile */}
        <div className="mt-5 pt-4 border-t border-border/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search member, rank, or role..."
              className="pl-9 h-9 text-xs rounded-full bg-background/70 w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          {/* Section Filter Pills */}
          <div className="w-full sm:w-auto overflow-hidden">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 w-full max-w-full touch-pan-x">
              {['All', 'Trumpet', 'Saxophone', 'Euphonium', 'Trombone', 'Dish', 'SideDrum'].map(sec => (
                <button
                  key={sec}
                  onClick={() => setSelectedSection(sec)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border font-medium transition-all shrink-0 cursor-pointer',
                    selectedSection === sec
                      ? 'bg-[#D97736] text-white border-[#D97736] shadow-sm font-semibold'
                      : 'bg-background/60 text-muted-foreground border-border/70 hover:bg-muted'
                  )}
                >
                  {sec === 'SideDrum' ? 'SideDrum/BaseDrum' : sec}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Workday Breadcrumbs Level Indicator */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground font-mono overflow-x-auto no-scrollbar">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-sans font-bold">
            Level 1: Executive Command (Major)
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" />
          <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 font-sans font-bold">
            Level 2: Section Leadership (Section Majors)
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" />
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-sans font-bold">
            Level 3: Performing Artists / Members
          </span>
        </div>
      </div>

      {/* ========================================================
          WORKDAY TREE VIEW MODE
         ======================================================== */}
      {viewMode === 'tree' ? (
        <div className="w-full flex flex-col items-center">
          {/* LEVEL 1: OVERALL MAJOR / EXECUTIVE COMMAND */}
          {majors.length > 0 && (
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap items-center justify-center gap-6">
                {majors.map(major => (
                  <WorkdayEmployeeCard
                    key={major.id}
                    user={major}
                    isExecutive
                    directReportsCount={filteredSections.length}
                    highlighted={matchesSearch(major)}
                    onClick={() => setSelectedUserForDetail(major)}
                  />
                ))}
              </div>

              {/* Vertical Trunk Line from Major to Level 2 */}
              <div className="w-0.5 h-10 bg-gradient-to-b from-[#D97736] to-border" />
            </div>
          )}

          {/* LEVEL 2 CONNECTOR: HORIZONTAL TRUNK BAR */}
          <div className="w-full max-w-5xl relative flex justify-center">
            {/* Horizontal branch line connecting Level 2 nodes */}
            <div className="absolute top-0 left-12 right-12 h-0.5 bg-border" />
          </div>

          {/* LEVEL 2: SECTION MAJORS (SECTION LEADS) */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-6 pt-6">
            {filteredSections.map(({ section, majorRole, icon, color, accentBorder }) => {
              const majorUser = users.find(u => u.role === majorRole);
              const players = users.filter(
                u =>
                  u.section === section &&
                  u.role !== majorRole &&
                  u.id !== majorUser?.id &&
                  u.role !== 'Major' &&
                  u.role !== 'Overall Major'
              );
              const isExpanded = expandedSections[section] !== false;

              return (
                <div key={section} className="flex flex-col items-center relative">
                  {/* Vertical hook up to horizontal trunk */}
                  <div className="w-0.5 h-6 bg-border -mt-6 mb-2" />

                  {/* Section Major Card */}
                  {majorUser ? (
                    <WorkdayEmployeeCard
                      user={majorUser}
                      sectionIcon={icon}
                      directReportsCount={players.length}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleSection(section)}
                      highlighted={matchesSearch(majorUser)}
                      onClick={() => setSelectedUserForDetail(majorUser)}
                    />
                  ) : (
                    <div className="w-72 p-4 rounded-2xl border border-dashed border-border text-center text-xs text-muted-foreground bg-card/40">
                      {section} Major Position Vacant
                    </div>
                  )}

                  {/* Connecting Stem to Section Players (Level 3) */}
                  {isExpanded && players.length > 0 && (
                    <div className="w-full flex flex-col items-center mt-3">
                      {/* Stem from Major to Players branch */}
                      <div className="w-0.5 h-6 bg-border" />

                      {/* Level 3: Section Players Container */}
                      <div className="w-full space-y-2.5 pt-1 pl-4 border-l-2 border-dashed border-border/80 ml-6">
                        {players.map(player => {
                          const isPlayerTreasurer =
                            player.rank?.toLowerCase().includes('treasurer') ||
                            player.name.includes('TAHA MAZHARBHAI KUNDAWALA') ||
                            player.name.includes('HUSAIN JUJARBHAI KUNDAWALA');

                          return (
                            <div
                              key={player.id}
                              onClick={() => setSelectedUserForDetail(player)}
                              className={cn(
                                'group relative flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer bg-card/90 dark:bg-[#1E0F08]/90 hover:border-[#D97736]/60 hover:shadow-md',
                                matchesSearch(player)
                                  ? 'border-[#D97736] ring-1 ring-[#D97736]/30'
                                  : 'border-border/70'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                                  {player.avatar ? (
                                    <img
                                      src={player.avatar}
                                      alt={player.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{player.name.charAt(0)}</span>
                                  )}
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-background" />
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="font-semibold text-xs text-foreground dark:text-amber-100 group-hover:text-[#D97736] transition-colors">
                                      {player.name}
                                    </h5>
                                    {isPlayerTreasurer && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                        <Coins className="w-2.5 h-2.5" /> Treasurer
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground dark:text-amber-200/70 font-mono">
                                    {player.rank || 'Performing Artist'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono">
                                  {player.section}
                                </Badge>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#D97736] group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Collapsed indicator badge */}
                  {!isExpanded && players.length > 0 && (
                    <button
                      onClick={() => toggleSection(section)}
                      className="mt-2 text-[11px] font-semibold text-[#D97736] hover:underline flex items-center gap-1"
                    >
                      <span>Show {players.length} assigned members</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================
            COMPACT DEPARTMENT GRID MODE
           ======================================================== */
        <div className="space-y-6">
          {/* Executive Command Card in Grid View */}
          {majors.length > 0 && (selectedSection === 'All' || selectedSection === 'Command') && (
            <Card className="border border-amber-500/40 bg-amber-500/5">
              <div className="p-4 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-foreground">Executive Command</h4>
                    <p className="text-xs text-muted-foreground">{majors.length} Band Major{majors.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Badge variant="gold" className="text-xs">
                  Command
                </Badge>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {majors.map(m => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedUserForDetail(m)}
                    className="flex items-center justify-between p-3 rounded-xl border border-amber-500/30 bg-background/80 hover:bg-muted/40 cursor-pointer text-xs transition-colors"
                  >
                    <div>
                      <span className="font-bold text-foreground">{m.name}</span>
                      <p className="text-[10px] text-muted-foreground font-mono">{m.rank || 'Major'}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Profile
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSections.map(({ section, majorRole, icon }) => {
              const majorUser = users.find(u => u.role === majorRole);
              const players = users.filter(
                u =>
                  u.section === section &&
                  u.role !== majorRole &&
                  u.id !== majorUser?.id &&
                  u.role !== 'Major' &&
                  u.role !== 'Overall Major'
              );

              return (
                <Card key={section} className="border border-border/80 flex flex-col">
                  <div className="p-4 border-b bg-muted/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-background border shadow-xs">{icon}</div>
                      <div>
                        <h4 className="font-bold text-base text-foreground">{section} Section</h4>
                        <p className="text-xs text-muted-foreground">{players.length} Assigned Members</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {section}
                    </Badge>
                  </div>

                  {majorUser && (
                    <div className="p-4 bg-background/50 border-b border-border/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97736]">
                          Section Major
                        </span>
                        <h5 className="font-bold text-sm text-foreground">{majorUser.name}</h5>
                        <p className="text-xs text-muted-foreground">{majorUser.rank}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUserForDetail(majorUser)}
                        className="text-xs h-7"
                      >
                        Profile
                      </Button>
                    </div>
                  )}

                  <div className="p-4 space-y-2 flex-1">
                    {players.map(p => {
                      const isPlayerTreasurer =
                        p.rank?.toLowerCase().includes('treasurer') ||
                        p.name.includes('TAHA MAZHARBHAI KUNDAWALA') ||
                        p.name.includes('HUSAIN JUJARBHAI KUNDAWALA');

                      return (
                        <div
                          key={p.id}
                          onClick={() => setSelectedUserForDetail(p)}
                          className="flex items-center justify-between p-2 rounded-lg border border-border/50 hover:bg-muted/40 cursor-pointer text-xs transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-foreground">{p.name}</span>
                              {isPlayerTreasurer && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <Coins className="w-2.5 h-2.5" /> Treasurer
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{p.rank || 'Member'}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          WORKDAY EMPLOYEE DETAIL MODAL / DRAWER
         ======================================================== */}
      {selectedUserForDetail && (
        <Dialog open={!!selectedUserForDetail} onOpenChange={() => setSelectedUserForDetail(null)}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <Badge variant="havenly-pill" className="text-[10px]">
                Workday Employee Profile
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">ID: {selectedUserForDetail.id}</span>
            </div>
            <DialogTitle className="font-serif text-2xl pt-2">
              {selectedUserForDetail.name}
            </DialogTitle>
            <DialogDescription>{selectedUserForDetail.rank || 'Band Member'}</DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {/* Top Identity Row */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/40 border border-border/80">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#D97736] p-0.5 bg-background shrink-0">
                {selectedUserForDetail.avatar ? (
                  <img
                    src={selectedUserForDetail.avatar}
                    alt={selectedUserForDetail.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-[#D97736]/20 flex items-center justify-center font-bold text-lg text-[#D97736] rounded-full">
                    {selectedUserForDetail.name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-base text-foreground">{selectedUserForDetail.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="gold" className="text-[10px] py-0">
                    {selectedUserForDetail.role}
                  </Badge>
                  {(selectedUserForDetail.rank?.toLowerCase().includes('treasurer') ||
                    selectedUserForDetail.name.includes('TAHA MAZHARBHAI KUNDAWALA') ||
                    selectedUserForDetail.name.includes('HUSAIN JUJARBHAI KUNDAWALA')) && (
                    <Badge variant="emerald" className="text-[10px] py-0 flex items-center gap-1">
                      <Coins className="w-2.5 h-2.5" /> Treasurer
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">• {selectedUserForDetail.section} Section</span>
                </div>
                <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active Member
                </p>
              </div>
            </div>

            {/* Profile Field Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Email Address</span>
                <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#D97736]" /> {selectedUserForDetail.email}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Contact Number</span>
                <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#D97736]" /> {selectedUserForDetail.phone || '+91 98200 00000'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Joined Cadence</span>
                <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#D97736]" /> {selectedUserForDetail.joinedDate || '2020-01-01'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/80 bg-card/60">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Band Rank</span>
                <p className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D97736]" /> {selectedUserForDetail.rank || 'Member'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUserForDetail(null)}
              className="rounded-full text-xs"
            >
              Close Profile
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}

// ====================================================================
// WORKDAY-STYLE EMPLOYEE NODE CARD COMPONENT
// ====================================================================
interface WorkdayEmployeeCardProps {
  user: User;
  isExecutive?: boolean;
  isTreasurer?: boolean;
  sectionIcon?: React.ReactNode;
  directReportsCount?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  highlighted?: boolean;
  onClick?: () => void;
}

function WorkdayEmployeeCard({
  user,
  isExecutive,
  isTreasurer,
  sectionIcon,
  directReportsCount = 0,
  isExpanded,
  onToggleExpand,
  highlighted,
  onClick,
}: WorkdayEmployeeCardProps) {
  return (
    <div className="relative group flex flex-col items-center">
      <div
        onClick={onClick}
        className={cn(
          'w-72 sm:w-80 cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 shadow-md hover:shadow-xl bg-card/95 dark:bg-[#25130B]/95 backdrop-blur-md',
          isExecutive
            ? 'border-2 border-amber-500/70 shadow-amber-500/10'
            : isTreasurer
            ? 'border-2 border-emerald-500/60 shadow-emerald-500/10'
            : 'border-border/80 hover:border-[#D97736]/60',
          highlighted && 'ring-2 ring-[#D97736] ring-offset-2'
        )}
      >
        {/* Top colored accent stripe */}
        <div
          className={cn(
            'h-1.5 w-full',
            isExecutive
              ? 'bg-gradient-to-r from-amber-400 to-[#D97736]'
              : isTreasurer
              ? 'bg-gradient-to-r from-emerald-400 to-teal-600'
              : 'bg-gradient-to-r from-[#D97736] to-[#C26330]'
          )}
        />

        <div className="p-4 sm:p-5">
          {/* Header Row: Avatar, Online Dot & Role Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border/80 bg-background flex items-center justify-center font-bold text-sm shadow-sm">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#D97736]">{user.name.charAt(0)}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>

            <div className="flex flex-col items-end">
              <span
                className={cn(
                  'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border',
                  isExecutive
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-400'
                    : isTreasurer
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-400'
                    : 'border-[#D97736]/40 bg-[#D97736]/15 text-[#D97736]'
                )}
              >
                {isExecutive ? 'Band Major' : isTreasurer ? 'Treasurer' : 'Section Lead'}
              </span>

              {directReportsCount > 0 && (
                <span className="text-[10px] font-medium text-muted-foreground mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#D97736]" /> {directReportsCount} reports
                </span>
              )}
            </div>
          </div>

          {/* Member Name & Job Title */}
          <div className="mt-3">
            <h4 className="font-serif font-bold text-base sm:text-lg text-foreground dark:text-amber-50 group-hover:text-[#D97736] transition-colors leading-tight">
              {user.name}
            </h4>
            <p className="text-xs text-muted-foreground dark:text-amber-200/70 mt-0.5 font-medium">{user.rank}</p>
          </div>

          {/* Section & Department Tag */}
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground dark:text-amber-200/80">
              {sectionIcon || <Building2 className="w-3.5 h-3.5 text-[#D97736]" />}
              <span className="font-medium text-foreground dark:text-amber-100">{user.section} Section</span>
            </div>

            <span className="text-[10px] font-mono text-muted-foreground dark:text-amber-200/60">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Workday Expand/Collapse Toggle Node Button on the Bottom Stem */}
      {directReportsCount > 0 && onToggleExpand && (
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="relative -bottom-3 z-20 flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 border-[#D97736] shadow-md text-[#D97736] hover:bg-[#D97736] hover:text-white transition-all transform hover:scale-110 text-xs font-bold"
          title={isExpanded ? 'Collapse team' : 'Expand team'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
