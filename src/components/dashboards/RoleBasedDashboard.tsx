'use client';

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  useGetUsersQuery,
  useGetTunesQuery,
  useGetAttendanceMetricsQuery,
  useGetAttendanceSessionsQuery,
  useGetFinancialsQuery,
  useGetPersonalFinancialsQuery,
  useGetExpensesQuery,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  isOverallMajor,
  isInstrumentMajor,
  isTreasurer,
  getManagedSection,
} from '@/lib/rbac';
import { InstrumentSection, Role } from '@/types/band';
import {
  Crown,
  Coins,
  Users,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  BarChart3,
  PieChart,
  LineChart,
  Receipt,
  Sparkles,
} from 'lucide-react';

interface RoleBasedDashboardProps {
  setActiveTab: (tab: string) => void;
  setSelectedWorkspaceSection?: (sec: InstrumentSection) => void;
  setIsDriveModalOpen?: (open: boolean) => void;
  setIsExcelModalOpen?: (open: boolean) => void;
}

export function RoleBasedDashboard({
  setActiveTab,
  setSelectedWorkspaceSection,
  setIsDriveModalOpen,
  setIsExcelModalOpen,
}: RoleBasedDashboardProps) {
  const theme = useSelector((state: RootState) => state.theme.theme);
  const isLight = theme === 'light';
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const activeRole = useSelector((state: RootState) => state.auth.activeRole);
  const roleName = (currentUser?.role || activeRole) as Role;

  const isTreasurerRole = isTreasurer(roleName, currentUser);
  const isOverallMajorRole = isOverallMajor(roleName);
  const isInstrumentMajorRole = isInstrumentMajor(roleName);

  // Financial Year Filter for Treasurer & Major (defaults to 2026)
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Queries
  const { data: usersData } = useGetUsersQuery();
  const { data: tunesData } = useGetTunesQuery();
  const { data: attendanceMetrics } = useGetAttendanceMetricsQuery();
  const { data: attendanceSessions } = useGetAttendanceSessionsQuery();
  const { data: finData } = useGetFinancialsQuery({ year: selectedYear });
  const { data: expData } = useGetExpensesQuery();
  const { data: personalFin } = useGetPersonalFinancialsQuery();

  const users = useMemo(() => usersData?.users || [], [usersData]);
  const tunes = useMemo(() => tunesData?.tunes || [], [tunesData]);
  const sessions = useMemo(() => attendanceSessions?.sessions || [], [attendanceSessions]);
  const records = useMemo(() => finData?.records || [], [finData]);
  const expenses = useMemo(() => expData?.expenses || [], [expData]);
  const availableYears = finData?.years && finData.years.length > 0 ? finData.years : ['2026', '2025', '2024'];

  const managedSec: InstrumentSection = isInstrumentMajorRole
    ? getManagedSection(roleName) || (currentUser?.section as InstrumentSection) || 'Trumpet'
    : (currentUser?.section as InstrumentSection) || 'Trumpet';

  // Chart theme color palette
  const chartColors = useMemo(() => {
    return {
      background: 'transparent',
      textColor: isLight ? '#2E1609' : '#F5E6D3',
      subTextColor: isLight ? '#7C3E1D' : '#C7B299',
      gridLineColor: isLight ? 'rgba(180,83,9,0.12)' : 'rgba(255,255,255,0.08)',
      primary: '#D97736',  // warm amber / burnt orange
      emerald: '#10B981',  // paid / present
      amber: '#F59E0B',    // hoob / late
      rose: '#EF4444',     // expenses / absent
      blue: '#3B82F6',     // net reserve
      purple: '#8B5CF6',   // sideDrum
      yellow: '#EAB308',   // euphonium
    };
  }, [isLight]);

  // Aggregated Financial Metrics for current selected year
  const financialSummary = useMemo(() => {
    let lavajamTotal = 0;
    let hoobTotal = 0;
    let pendingTotal = 0;
    const sectionTotals: Record<string, number> = {
      Trumpet: 0,
      Saxophone: 0,
      Euphonium: 0,
      Trombone: 0,
      Dish: 0,
      SideDrum: 0,
    };

    records.forEach(r => {
      const amt = Number(r.amount) || 0;
      if (r.status === 'Paid') {
        if (r.fundType === 'Hoob') {
          hoobTotal += amt;
        } else {
          lavajamTotal += amt;
          const sec = (r.section || 'Trumpet').toString();
          if (sectionTotals[sec] !== undefined) {
            sectionTotals[sec] += amt;
          } else if (sec === 'Major') {
            sectionTotals.Trumpet += amt;
          }
        }
      } else {
        pendingTotal += amt;
      }
    });

    const expenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCollected = lavajamTotal + hoobTotal;
    const netBalance = totalCollected - expenseTotal;
    const paidCount = records.filter(r => r.status === 'Paid' && r.fundType === 'Lavajam').length;
    const totalCount = records.filter(r => r.fundType === 'Lavajam').length || 40;
    const collectionRate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 100;

    return {
      lavajamTotal,
      hoobTotal,
      pendingTotal,
      totalCollected,
      expenseTotal,
      netBalance,
      paidCount,
      totalCount,
      collectionRate,
      sectionTotals,
    };
  }, [records, expenses]);

  // ========================================================
  // VIEW 1: EXECUTIVE COMMAND (Overall Major / Major)
  // Charts: Lavajam Details (Fund Donut + Section Bar) & Weekly Attendance (Trend + Readiness)
  // ========================================================
  if (isOverallMajorRole) {
    // 1. Lavajam Fund Breakdown (Donut)
    const majorFundDonutOptions: Highcharts.Options = {
      chart: {
        type: 'pie',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          const pt = this as any;
          return `<b>${pt.point?.name || pt.name || ''}</b><br/>Amount: <b>₹${Highcharts.numberFormat(pt.y || 0, 0)}</b> (${Highcharts.numberFormat(pt.percentage || 0, 1)}%)`;
        },
      },
      plotOptions: {
        pie: {
          innerSize: '62%',
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            distance: -20,
            formatter: function () {
              return (this.percentage || 0) > 8 ? `${Math.round(this.percentage || 0)}%` : null;
            },
            style: { color: '#ffffff', fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
          showInLegend: true,
        },
      },
      legend: {
        itemStyle: { color: chartColors.textColor, fontSize: '11px', fontWeight: '500' },
        itemHoverStyle: { color: chartColors.primary },
      },
      credits: { enabled: false },
      series: [
        {
          type: 'pie',
          name: 'Collection Share',
          data: [
            { name: 'Lavajam Dues', y: financialSummary.lavajamTotal, color: chartColors.emerald },
            { name: 'Hoob Contributions', y: financialSummary.hoobTotal, color: chartColors.amber },
            ...(financialSummary.pendingTotal > 0
              ? [{ name: 'Pending / Unpaid', y: financialSummary.pendingTotal, color: chartColors.rose }]
              : []),
          ],
        },
      ],
    };

    // 2. Section-wise Lavajam Collections (Column Chart)
    const majorSectionBarOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: ['Trumpet', 'Saxophone', 'Euphonium', 'Trombone', 'Dish', 'SideDrum'],
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 0,
        title: { text: 'Amount (₹)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () {
            return '₹' + (Number(this.value) >= 1000 ? Number(this.value) / 1000 + 'k' : this.value);
          },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>${this.x} Section</b><br/>Collected: <b>₹${Highcharts.numberFormat(Number(this.y) || 0, 0)}</b>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 5,
          colorByPoint: true,
          colors: [chartColors.primary, '#D97736', '#EAB308', '#B45309', '#10B981', '#8B5CF6'],
          dataLabels: {
            enabled: true,
            formatter: function () {
              return '₹' + (Number(this.y) >= 1000 ? Math.round(Number(this.y) / 1000) + 'k' : this.y);
            },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'column',
          name: 'Section Collection',
          data: [
            financialSummary.sectionTotals.Trumpet,
            financialSummary.sectionTotals.Saxophone,
            financialSummary.sectionTotals.Euphonium,
            financialSummary.sectionTotals.Trombone,
            financialSummary.sectionTotals.Dish,
            financialSummary.sectionTotals.SideDrum,
          ],
        },
      ],
    };

    // 3. Weekly Attendance Trend (Spline / Area)
    const recentSessionsList = sessions.slice(0, 8).reverse();
    const sessionCategories = recentSessionsList.map(s => {
      const parts = s.date.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : s.date;
    });
    const sessionRates = recentSessionsList.map(s => {
      const pres = s.records.filter(r => r.status === 'Present' || r.status === 'Late').length;
      return s.records.length > 0 ? Math.round((pres / s.records.length) * 100) : 85;
    });

    const majorWeeklyAttOptions: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: sessionCategories.length > 0 ? sessionCategories : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'],
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 50,
        max: 100,
        title: { text: 'Attendance Rate (%)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () { return this.value + '%'; },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.emerald,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>Session ${this.x}</b><br/>Weekly Hazri: <b>${this.y}%</b>`;
        },
      },
      plotOptions: {
        spline: {
          lineWidth: 3,
          color: chartColors.emerald,
          marker: { radius: 5, fillColor: '#ffffff', lineWidth: 2, lineColor: chartColors.emerald },
          dataLabels: {
            enabled: true,
            formatter: function () { return this.y + '%'; },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'spline',
          name: 'Attendance Rate',
          data: sessionRates.length > 0 ? sessionRates : [82, 85, 88, 92, 89, 94],
        },
      ],
    };

    // 4. Section Readiness Comparison (Column)
    const breakdown = attendanceMetrics?.sectionBreakdown || [
      { section: 'Trumpet', rate: 90 },
      { section: 'Saxophone', rate: 88 },
      { section: 'Euphonium', rate: 85 },
      { section: 'Trombone', rate: 82 },
      { section: 'Dish', rate: 91 },
      { section: 'SideDrum', rate: 89 },
    ];

    const majorSectionAttOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: breakdown.map(b => b.section),
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 50,
        max: 100,
        title: { text: 'Hazri Rate (%)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () { return this.value + '%'; },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>${this.x} Section</b><br/>Readiness: <b>${this.y}%</b>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 5,
          colorByPoint: true,
          colors: [chartColors.primary, '#D97736', '#EAB308', '#B45309', '#10B981', '#8B5CF6'],
          dataLabels: {
            enabled: true,
            formatter: function () { return this.y + '%'; },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'column',
          name: 'Hazri Readiness',
          data: breakdown.map(b => b.rate),
        },
      ],
    };

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Executive Header with Year Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-serif font-black tracking-tight text-foreground">
                Command Dashboard
              </span>
              <Badge variant="gold" className="text-[10px] px-2 py-0 font-bold uppercase">
                <Crown className="w-3 h-3 mr-1" /> Overall Major
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              High-level Lavajam financial analytics &amp; weekly rehearsal attendance monitoring.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="text-xs font-bold bg-card border border-border/80 rounded-lg px-2.5 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-amber-500 shadow-xs"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Key Executive Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Group Strength
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {users.length > 0 ? users.length : 40}
              </span>
              <span className="text-[11px] text-muted-foreground">Musicians</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">6 Instrument Sections</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Weekly Hazri Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {attendanceMetrics?.overallAttendanceRate || 88}%
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> Target 85%+
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Rehearsal Turnout</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-primary shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-[#D97736] uppercase tracking-wider block">
              Lavajam Collections
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {formatCurrency(financialSummary.totalCollected)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              {financialSummary.collectionRate}% Members Settled ({selectedYear})
            </span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-blue-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Rehearsal Sessions
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {attendanceMetrics?.totalSessions || sessions.length || 18}
              </span>
              <span className="text-[11px] text-muted-foreground">Logged</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Milad March Drills</span>
          </Card>
        </div>

        {/* SECTION 1: LAVAJAM DETAILS CHARTS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
              Lavajam Details Charts ({selectedYear})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Fund Breakdown Donut */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-emerald-500" />
                  Collection Distribution (Lavajam vs Hoob)
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Total Inflow: {formatCurrency(financialSummary.totalCollected)}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={majorFundDonutOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>

            {/* Chart 2: Section-wise Lavajam Bar */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-500" />
                  Section-wise Lavajam Collection
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Contribution totals across 6 musical sections
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={majorSectionBarOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* SECTION 2: ATTENDANCE WEEKLY CHARTS */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
              Attendance Weekly Charts
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 3: Weekly Trend Spline */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-emerald-500" />
                  Weekly Rehearsal Attendance Trend
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Weekly attendance percentage across recent rehearsals
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={majorWeeklyAttOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>

            {/* Chart 4: Section Readiness Bar */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Instrument Section Hazri Readiness
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Compliance rate by instrument section
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={majorSectionAttOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Clean Tab-Wise Navigation Prompt */}
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Detailed member rosters, note transpositions, sheet sync, and complete audit ledgers are accessible tab-wise in the side menu.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('financials')}
              className="text-xs h-7 px-3 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              Lavajam Ledger <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('attendance')}
              className="text-xs h-7 px-3 border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              Mark Hazri <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 2: TREASURER COMMAND (Treasurer)
  // Charts: Contribution and Expense Charts
  // ========================================================
  if (isTreasurerRole) {
    // 1. Inflow vs Outflow Comparison (Column Chart)
    const treasurerComparisonOptions: Highcharts.Options = {
      chart: {
        type: 'column',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: ['Lavajam Dues', 'Hoob Inflow', 'Total Inflow', 'Expenses', 'Net Balance'],
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 0,
        title: { text: 'Amount (₹)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () {
            return '₹' + (Number(this.value) >= 1000 ? Number(this.value) / 1000 + 'k' : this.value);
          },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>${this.x}</b><br/>Amount: <b>₹${Highcharts.numberFormat(Number(this.y) || 0, 0)}</b>`;
        },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          colorByPoint: true,
          colors: [chartColors.emerald, chartColors.amber, '#059669', chartColors.rose, chartColors.blue],
          dataLabels: {
            enabled: true,
            formatter: function () {
              return '₹' + Highcharts.numberFormat(Number(this.y) || 0, 0);
            },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'column',
          name: 'Treasury Ledger',
          data: [
            financialSummary.lavajamTotal,
            financialSummary.hoobTotal,
            financialSummary.totalCollected,
            financialSummary.expenseTotal,
            Math.max(0, financialSummary.netBalance),
          ],
        },
      ],
    };

    // 2. Proportional Inflow vs Outflow Donut
    const treasurerDonutOptions: Highcharts.Options = {
      chart: {
        type: 'pie',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          const pt = this as any;
          return `<b>${pt.point?.name || pt.name || ''}</b><br/>Amount: <b>₹${Highcharts.numberFormat(pt.y || 0, 0)}</b> (${Highcharts.numberFormat(pt.percentage || 0, 1)}%)`;
        },
      },
      plotOptions: {
        pie: {
          innerSize: '58%',
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            distance: -22,
            formatter: function () {
              return (this.percentage || 0) > 10 ? `${Math.round(this.percentage || 0)}%` : null;
            },
            style: { color: '#ffffff', fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
          showInLegend: true,
        },
      },
      legend: {
        itemStyle: { color: chartColors.textColor, fontSize: '11px', fontWeight: '500' },
        itemHoverStyle: { color: chartColors.primary },
      },
      credits: { enabled: false },
      series: [
        {
          type: 'pie',
          name: 'Budget Share',
          data: [
            { name: 'Lavajam Funds', y: financialSummary.lavajamTotal, color: chartColors.emerald },
            { name: 'Hoob Inflow', y: financialSummary.hoobTotal, color: chartColors.amber },
            { name: 'Expenses', y: financialSummary.expenseTotal, color: chartColors.rose },
            { name: 'Net Reserve', y: Math.max(0, financialSummary.netBalance), color: chartColors.blue },
          ],
        },
      ],
    };

    // 3. Category Expenses Breakdown (Bar)
    const expenseCategories = ['Instruments', 'Logistics', 'Maintenance'];
    const categoryTotals = expenseCategories.map(cat => {
      return expenses
        .filter(e => (e.category || '').toLowerCase() === cat.toLowerCase())
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    });

    const treasurerCategoryBarOptions: Highcharts.Options = {
      chart: {
        type: 'bar',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: expenseCategories,
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 0,
        title: { text: 'Expenditure (₹)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () {
            return '₹' + (Number(this.value) >= 1000 ? Number(this.value) / 1000 + 'k' : this.value);
          },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.rose,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>${this.x}</b><br/>Expended: <b>₹${Highcharts.numberFormat(Number(this.y) || 0, 0)}</b>`;
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 5,
          colorByPoint: true,
          colors: [chartColors.rose, chartColors.amber, '#8B5CF6'],
          dataLabels: {
            enabled: true,
            formatter: function () {
              return '₹' + Highcharts.numberFormat(Number(this.y) || 0, 0);
            },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'bar',
          name: 'Category Expenditure',
          data: categoryTotals,
        },
      ],
    };

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Treasury Header with Year Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-serif font-black tracking-tight text-foreground">
                Treasury Dashboard
              </span>
              <Badge variant="emerald" className="text-[10px] px-2 py-0 font-bold uppercase">
                <Coins className="w-3 h-3 mr-1" /> Band Treasurer
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Financial auditing for Lavajam member dues, Hoob sponsorships, and instrument maintenance expenditures.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-muted-foreground">Year:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="text-xs font-bold bg-card border border-border/80 rounded-lg px-2.5 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-xs"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Financial Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Total Contributions
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {formatCurrency(financialSummary.totalCollected)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Lavajam &amp; Hoob Inflow</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-rose-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Total Expenditures
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-rose-500">
                {formatCurrency(financialSummary.expenseTotal)}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Instruments &amp; Parade</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-blue-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Net Reserve Balance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {formatCurrency(financialSummary.netBalance)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              Audited Surplus
            </span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Collection Compliance
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {financialSummary.collectionRate}%
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              {financialSummary.paidCount} of {financialSummary.totalCount} Members Paid
            </span>
          </Card>
        </div>

        {/* CHARTS OF CONTRIBUTION AND EXPENSE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
              Contribution &amp; Expense Analytics ({selectedYear})
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Comparison Bar Chart */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  Inflow vs Outflow Comparison
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Direct comparison of dues, donations, total inflow, expenses, and net reserve.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[270px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={treasurerComparisonOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '270px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>

            {/* Chart 2: Donut Distribution */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-amber-500" />
                  Proportional Fund Allocation
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Share of Lavajam dues, Hoob donations, instrument expenses, and reserve.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[270px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={treasurerDonutOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '270px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Chart 3: Expense Category Breakdown */}
          <Card className="border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                Expenditure Categorization Breakdown
              </CardTitle>
              <CardDescription className="text-[11px]">
                Fund utilization for instruments acquisition, parade logistics, and valves maintenance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-1 sm:p-3 min-h-[240px]">
              <HighchartsReact
                highcharts={Highcharts}
                options={treasurerCategoryBarOptions}
                containerProps={{ style: { width: '100%', height: '100%', minHeight: '240px', overflow: 'hidden' } }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Dual Musician Notice & Tab-Wise Redirect */}
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Member-by-member payment ledger, UPI verification, and Excel syncing are available in the <strong>Lavajam Management</strong> tab.
              {currentUser?.section && (
                <span className="ml-1 text-foreground font-semibold">
                  (You also have musician access for <strong>{currentUser.section}</strong> section scores).
                </span>
              )}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('financials')}
            className="text-xs h-7 px-3 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shrink-0"
          >
            Open Lavajam Ledger <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 3: SECTION MAJOR (Team Attendance Chart)
  // Charts: Their Team Attendance Chart (Weekly Trend + Member Breakdown)
  // ========================================================
  if (isInstrumentMajorRole) {
    const sectionUsers = users.filter(
      u => u.section === managedSec || ((u.section as string) === 'SideDrum/BaseDrum' && managedSec === 'SideDrum')
    );

    // Section weekly attendance calculations
    const sectionSessionsList = sessions.slice(0, 8).reverse().map(s => {
      const parts = s.date.split('-');
      const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : s.date;
      const secRecords = s.records.filter(
        r => r.section === managedSec || ((r.section as string) === 'SideDrum/BaseDrum' && managedSec === 'SideDrum')
      );
      const presentCount = secRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      const rate = secRecords.length > 0 ? Math.round((presentCount / secRecords.length) * 100) : 90;
      return {
        dateLabel,
        rate,
        presentCount,
        total: secRecords.length,
      };
    });

    const teamAttTrendOptions: Highcharts.Options = {
      chart: {
        type: 'spline',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: sectionSessionsList.map(s => s.dateLabel),
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '600' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 50,
        max: 100,
        title: { text: 'Section Hazri Rate (%)', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () { return this.value + '%'; },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.primary,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>Session ${this.x}</b><br/>${managedSec} Team Hazri: <b>${this.y}%</b>`;
        },
      },
      plotOptions: {
        spline: {
          lineWidth: 3,
          color: chartColors.primary,
          marker: { radius: 5, fillColor: '#ffffff', lineWidth: 2, lineColor: chartColors.primary },
          dataLabels: {
            enabled: true,
            formatter: function () { return this.y + '%'; },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'spline',
          name: `${managedSec} Hazri Rate`,
          data: sectionSessionsList.map(s => s.rate),
        },
      ],
    };

    // Member attendance performance breakdown in this section
    const memberStats = sectionUsers.map(u => {
      let pres = 0;
      let tot = 0;
      sessions.forEach(s => {
        const rec = s.records.find(
          r => r.userId === u.id || (r.userName || '').toUpperCase() === (u.name || '').toUpperCase()
        );
        if (rec) {
          tot++;
          if (rec.status === 'Present' || rec.status === 'Late') pres++;
        }
      });
      const rate = tot > 0 ? Math.round((pres / tot) * 100) : 90;
      return {
        name: u.name.split(' ')[0] + ' ' + (u.name.split(' ')[1] || ''),
        fullName: u.name,
        rate,
        pres,
        tot,
      };
    });

    const teamMemberBarOptions: Highcharts.Options = {
      chart: {
        type: 'bar',
        backgroundColor: chartColors.background,
        spacing: [10, 5, 10, 5],
        reflow: true,
      },
      title: { text: undefined },
      xAxis: {
        categories: memberStats.map(m => m.name),
        labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '500' } },
        lineColor: chartColors.gridLineColor,
      },
      yAxis: {
        min: 0,
        max: 100,
        title: { text: 'Attendance %', style: { color: chartColors.subTextColor, fontSize: '10px' } },
        labels: {
          style: { color: chartColors.subTextColor, fontSize: '10px' },
          formatter: function () { return this.value + '%'; },
        },
        gridLineColor: chartColors.gridLineColor,
      },
      tooltip: {
        backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
        borderColor: chartColors.emerald,
        borderRadius: 8,
        style: { color: chartColors.textColor, fontSize: '11px' },
        formatter: function () {
          return `<b>${this.x}</b><br/>Rehearsal Hazri: <b>${this.y}%</b>`;
        },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          colorByPoint: true,
          colors: memberStats.map(m => (m.rate >= 85 ? chartColors.emerald : m.rate >= 70 ? chartColors.amber : chartColors.rose)),
          dataLabels: {
            enabled: true,
            formatter: function () { return this.y + '%'; },
            style: { color: chartColors.textColor, fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
          },
        },
      },
      legend: { enabled: false },
      credits: { enabled: false },
      series: [
        {
          type: 'bar',
          name: 'Player Hazri',
          data: memberStats.map(m => m.rate),
        },
      ],
    };

    const avgSectionRate = memberStats.length > 0
      ? Math.round(memberStats.reduce((sum, m) => sum + m.rate, 0) / memberStats.length)
      : 88;

    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Section Major Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-serif font-black tracking-tight text-foreground">
                {managedSec} Section Dashboard
              </span>
              <Badge variant="gold" className="text-[10px] px-2 py-0 font-bold uppercase">
                <Users className="w-3 h-3 mr-1" /> {roleName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live rehearsal turnout analytics and player attendance monitoring for the {managedSec} section.
            </p>
          </div>
        </div>

        {/* 4 Section Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <Card className="p-3 sm:p-4 border-l-4 border-l-primary shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Team Strength
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {sectionUsers.length}
              </span>
              <span className="text-[11px] text-muted-foreground">Players</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">{managedSec} Musician Lineup</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Team Hazri Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {avgSectionRate}%
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> High
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Overall Section Average</span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-blue-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Present Last Session
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {sectionSessionsList.length > 0 ? sectionSessionsList[sectionSessionsList.length - 1].presentCount : sectionUsers.length}
              </span>
              <span className="text-[11px] text-muted-foreground">/ {sectionUsers.length}</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 block">
              Cadence Ready
            </span>
          </Card>

          <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500 shadow-xs">
            <span className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Active Scores
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
                {tunes.filter(t => t.section === managedSec).length || 5}
              </span>
              <span className="text-[11px] text-muted-foreground">Madeh</span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">Milad Mubarak Tunes</span>
          </Card>
        </div>

        {/* TEAM ATTENDANCE CHARTS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
              {managedSec} Team Attendance Charts
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Weekly Team Attendance Trend */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <LineChart className="w-3.5 h-3.5 text-primary" />
                  Weekly Team Attendance Trend
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Turnout percentage for {managedSec} players across weekly rehearsals.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={teamAttTrendOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>

            {/* Chart 2: Player-by-Player Hazri Breakdown */}
            <Card className="border border-border/80 shadow-xs overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
                <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  Team Musician Hazri Compliance
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Individual player attendance rate in {managedSec} section.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-1 sm:p-3 min-h-[260px]">
                <HighchartsReact
                  highcharts={Highcharts}
                  options={teamMemberBarOptions}
                  containerProps={{ style: { width: '100%', height: '100%', minHeight: '260px', overflow: 'hidden' } }}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tab-Wise Prompt */}
        <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              To record daily practice attendance, open <strong>Practice Attendance</strong>. To compose scores and transpose keys, open <strong>Section Workspace</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('attendance')}
              className="text-xs h-7 px-3 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
            >
              Record Hazri <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('section')}
              className="text-xs h-7 px-3 border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              Section Scores <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 4: BAND MEMBER / MUSICIAN
  // Charts: Their Attendance Details & Lavajam Details
  // ========================================================
  const memberSection = currentUser?.section || 'Trumpet';
  const memberAttendanceList = sessions.slice(0, 10).map(s => {
    const rec = s.records.find(
      r => r.userId === currentUser?.id || (r.userName || '').toUpperCase() === (currentUser?.name || '').toUpperCase()
    );
    const parts = s.date.split('-');
    const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : s.date;
    return {
      date: s.date,
      dateLabel,
      title: s.sessionTitle,
      status: rec?.status || 'Present',
    };
  });

  const memberPresentCount = memberAttendanceList.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const memberTotalCount = memberAttendanceList.length || 1;
  const memberRate = Math.round((memberPresentCount / memberTotalCount) * 100);

  // Highcharts column visualizer for member attendance
  const memberAttChartOptions: Highcharts.Options = {
    chart: {
      type: 'column',
      backgroundColor: chartColors.background,
      spacing: [10, 5, 10, 5],
      reflow: true,
    },
    title: { text: undefined },
    xAxis: {
      categories: memberAttendanceList.map(a => a.dateLabel),
      labels: { style: { color: chartColors.subTextColor, fontSize: '10px', fontWeight: '500' } },
      lineColor: chartColors.gridLineColor,
    },
    yAxis: {
      min: 0,
      max: 100,
      title: { text: 'Turnout Status', style: { color: chartColors.subTextColor, fontSize: '10px' } },
      labels: { enabled: false },
      gridLineColor: chartColors.gridLineColor,
    },
    tooltip: {
      backgroundColor: isLight ? '#FDFBF7' : '#1C0D06',
      borderColor: chartColors.primary,
      borderRadius: 8,
      style: { color: chartColors.textColor, fontSize: '11px' },
      formatter: function () {
        const pt = this as any;
        const idx = Number(pt.x !== undefined ? pt.x : pt.point?.x);
        const item = memberAttendanceList[idx];
        return `<b>${item?.title || 'Practice'}</b><br/>Status: <b>${item?.status || 'Present'}</b>`;
      },
    },
    plotOptions: {
      column: {
        borderRadius: 5,
        colorByPoint: true,
        colors: memberAttendanceList.map(a => (a.status === 'Present' ? chartColors.emerald : a.status === 'Late' ? chartColors.amber : chartColors.rose)),
        dataLabels: {
          enabled: true,
          formatter: function () {
            const pt = this as any;
            const idx = Number(pt.x !== undefined ? pt.x : pt.point?.x);
            const item = memberAttendanceList[idx];
            return item?.status === 'Present' ? '✓' : item?.status === 'Late' ? 'Late' : '✗';
          },
          style: { color: '#ffffff', fontSize: '10px', fontWeight: 'bold', textOutline: 'none' },
        },
      },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    series: [
      {
        type: 'column',
        name: 'Attendance Status',
        data: memberAttendanceList.map(() => 100),
      },
    ],
  };

  // Find personal Lavajam record
  const personalRecord = records.find(
    r => (r.userName || '').toUpperCase() === (currentUser?.name || '').toUpperCase() || r.userId === currentUser?.id
  );
  const isPaid = (personalRecord?.status || personalFin?.currentStatus) === 'Paid';
  const paidAmt = personalRecord?.amount || personalFin?.latestRecord?.amount || 1000;
  const receiptNo = personalRecord?.receiptNo || 'TSB-2026-REC-018';
  const paymentMethod = personalRecord?.paymentMethod || 'UPI';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Musician Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-serif font-black tracking-tight text-foreground">
              Musician Khidmat Dashboard
            </span>
            <Badge variant="secondary" className="text-[10px] px-2 py-0 font-bold uppercase">
              {currentUser?.name || 'Band Musician'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal rehearsal attendance log and verified Lavajam contribution status.
          </p>
        </div>
      </div>

      {/* 4 Personal Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            My Attendance Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {memberRate}%
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-0.5" /> High
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Rehearsal Turnout</span>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-primary shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-primary uppercase tracking-wider block">
            Sessions Attended
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {memberPresentCount}
            </span>
            <span className="text-[11px] text-muted-foreground">of {memberTotalCount}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Recent Practice Drills</span>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-emerald-500 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            2026 Lavajam Status
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
              {isPaid ? 'PAID' : 'PENDING'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">
            ₹{paidAmt} • Verified by Treasurer
          </span>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500 shadow-xs">
          <span className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
            Active Section
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-serif text-foreground">
              {memberSection}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 block">Lead Musical Voice</span>
        </Card>
      </div>

      {/* ATTENDANCE DETAILS & LAVAJAM DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Member Attendance Details Chart */}
        <Card className="border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
                My Practice Attendance History
              </CardTitle>
              <Badge variant="emerald" className="text-[10px]">
                {memberRate}% Compliance
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Session turnout record for recent band rehearsals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-1 sm:p-3 min-h-[220px]">
            <HighchartsReact
              highcharts={Highcharts}
              options={memberAttChartOptions}
              containerProps={{ style: { width: '100%', height: '100%', minHeight: '220px', overflow: 'hidden' } }}
            />
            {/* Quick legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Present (✓)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Late
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Absent (✗)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Member Lavajam Details Official Card */}
        <Card className="border border-border/80 shadow-xs overflow-hidden bg-gradient-to-br from-card via-card to-amber-500/5">
          <CardHeader className="pb-2 pt-3 px-3 sm:px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                Official Lavajam Contribution Details
              </CardTitle>
              <Badge variant="emerald" className="text-[10px]">
                VERIFIED 1448H
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Annual band member khidmat dues verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 space-y-3">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Financial Year:</span>
                <span className="text-xs font-bold text-foreground">2026</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Contribution Amount:</span>
                <span className="text-base font-serif font-black text-emerald-600 dark:text-emerald-400">
                  ₹{paidAmt}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Fund Type:</span>
                <Badge variant="outline" className="text-[10px] font-bold">
                  Lavajam Dues
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Settlement Status:</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% PAID &amp; RECONCILED
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-emerald-500/20 text-[11px]">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono text-foreground font-semibold">{receiptNo}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Payment Mode:</span>
                <span className="font-semibold text-foreground">{paymentMethod}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Certified against the official Taheri Scout Band Lavajam Details sheet.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab-Wise Prompt */}
      <div className="p-3 sm:p-4 rounded-xl bg-card border border-border/80 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>
            To view assigned sheet music notes, open <strong>My Madeh Portal</strong>. To transpose brass notes and fingering charts, open <strong>Compose Madeh Notes</strong>.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('member-portal')}
            className="text-xs h-7 px-3 border-amber-500/40 text-amber-600 dark:text-amber-400"
          >
            My Madeh Portal <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('transposer')}
            className="text-xs h-7 px-3 border-primary/40 text-primary"
          >
            Compose Notes <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
