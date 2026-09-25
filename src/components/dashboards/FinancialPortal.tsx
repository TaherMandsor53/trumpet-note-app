'use client';

import React, { useState } from 'react';
import {
  useGetFinancialsQuery,
  useCreateFinancialRecordMutation,
  useUpdateFinancialRecordMutation,
  useDeleteFinancialRecordMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetUsersQuery,
} from '@/store/api/bandApi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ThemedDatePicker } from '@/components/ui/ThemedDatePicker';
import { LavajamCharts } from '@/components/financial/LavajamCharts';
import { formatCurrency, formatDate } from '@/lib/utils';
import { LavajamRecord, LavajamStatus, ExpenseRecord } from '@/types/band';
import {
  Coins,
  TrendingDown,
  Plus,
  Search,
  Receipt,
  Trash2,
  Edit2,
  FileSpreadsheet,
  ArrowUpDown,
  CreditCard,
  Building,
} from 'lucide-react';

export function FinancialPortal() {
  // Active Tab: 'contributions' or 'expenses'
  const [activeTab, setActiveTab] = useState<'contributions' | 'expenses'>('contributions');

  // Year filter state (defaults to '2026')
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Queries & Mutations
  const { data: finData, isLoading: isFinLoading, refetch: refetchFin } = useGetFinancialsQuery({ year: selectedYear });
  const { data: expData, isLoading: isExpLoading, refetch: refetchExp } = useGetExpensesQuery();
  const { data: usersData } = useGetUsersQuery();

  const [createFinancialRecord, { isLoading: isCreatingFin }] = useCreateFinancialRecordMutation();
  const [updateFinancialRecord, { isLoading: isUpdatingFin }] = useUpdateFinancialRecordMutation();
  const [deleteFinancialRecord] = useDeleteFinancialRecordMutation();

  const [createExpense, { isLoading: isCreatingExp }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdatingExp }] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [sectionFilter, setSectionFilter] = useState('All');

  // Modal States
  const [isAddContributionOpen, setIsAddContributionOpen] = useState(false);
  const [isEditContributionOpen, setIsEditContributionOpen] = useState(false);
  const [editingContribution, setEditingContribution] = useState<LavajamRecord | null>(null);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);

  // Contribution Form State
  const [fundType, setFundType] = useState<'Lavajam' | 'Hoob'>('Lavajam');
  const [formUserId, setFormUserId] = useState('');
  const [formHoobName, setFormHoobName] = useState('');
  const [formYear, setFormYear] = useState('2026');
  const [formAmount, setFormAmount] = useState(1000);
  const [formStatus, setFormStatus] = useState<LavajamStatus>('Paid');

  // Expense Form State
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDate, setExpDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [expCategory, setExpCategory] = useState('Instruments');
  const [expNotes, setExpNotes] = useState('');

  const records = finData?.records || [];
  const expenses = expData?.expenses || [];
  const users = usersData?.users || [];
  const availableYears = finData?.years && finData.years.length > 0 ? finData.years : ['2026', '2025', '2024'];

  // Helper to resolve Section display (MUFADDAL ABIZARBHAI VALINABU displays 'Major' instead of 'Trumpet')
  const getDisplaySection = (record: LavajamRecord) => {
    const uName = (record.userName || '').toUpperCase();
    if (uName.includes('VALINABU')) return 'Major';
    return record.section || 'General';
  };

  // Helper to resolve and align accurate Role with Member Name
  const getMemberRole = (record: LavajamRecord) => {
    if (record.fundType === 'Hoob') return 'Hoob Contributor';
    const normRec = (record.userName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normRec.includes('valinabu')) return 'Major';

    const matchedUser = users.find(u => {
      if (record.userId && u.id === record.userId) return true;
      const normU = (u.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return normU === normRec || normU.includes(normRec) || normRec.includes(normU);
    });

    if (matchedUser) {
      if (matchedUser.role === 'Treasurer' && matchedUser.section === 'Trumpet') {
        return 'Treasurer & Trumpet Member';
      }
      if (matchedUser.role === 'Treasurer' && matchedUser.section === 'SideDrum') {
        return 'Treasurer & SideDrum Member';
      }
      return matchedUser.role || matchedUser.rank || 'Band Member';
    }
    return record.role || 'Band Member';
  };

  // Filtered records for Contributions
  const filteredContributions = records.filter(r => {
    // Strictly exclude M ISMAIL SH YUSUFBHAI ZOZWALA and HUSSAIN HANNANBHAI MULLAMITHAWALA
    const uName = (r.userName || '').toUpperCase();
    if (uName.includes('ZOZWALA')) return false;
    if (uName.includes('HUSSAIN HANNANBHAI') || (uName.includes('HUSSAIN') && uName.includes('MULLAMITHAWALA'))) return false;

    const displaySec = getDisplaySection(r);
    const memberRole = getMemberRole(r);

    const matchesSearch =
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fundType && r.fundType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      displaySec.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memberRole.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSection = sectionFilter === 'All' || displaySec === sectionFilter || r.section === sectionFilter;

    return matchesSearch && matchesStatus && matchesSection;
  });

  // Filtered records for Expenses
  const filteredExpenses = expenses.filter(e => {
    return (
      e.expenseDetails.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.date && e.date.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.category && e.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Reset Contribution Form
  const resetContributionForm = () => {
    setFundType('Lavajam');
    setFormUserId('');
    setFormHoobName('');
    setFormYear(selectedYear);
    setFormAmount(1000);
    setFormStatus('Paid');
  };

  // Reset Expense Form
  const resetExpenseForm = () => {
    setExpName('');
    setExpAmount('');
    const now = new Date();
    setExpDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    setExpCategory('Instruments');
    setExpNotes('');
  };

  // Open Edit Contribution
  const handleOpenEditContribution = (rec: LavajamRecord) => {
    setEditingContribution(rec);
    setFundType(rec.fundType === 'Hoob' ? 'Hoob' : 'Lavajam');
    setFormUserId(rec.userId || '');
    setFormHoobName(rec.fundType === 'Hoob' ? rec.userName : '');
    setFormYear(String(rec.year || selectedYear));
    setFormAmount(rec.amount);
    setFormStatus(rec.status);
    setIsEditContributionOpen(true);
  };

  // Open Edit Expense
  const handleOpenEditExpense = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setExpName(exp.expenseDetails);
    setExpAmount(exp.amount);

    let parsedDate = exp.date || '';
    if (parsedDate && parsedDate.includes('/')) {
      const parts = parsedDate.split('/');
      if (parts.length === 3) {
        parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    setExpDate(parsedDate || new Date().toISOString().split('T')[0]);
    setExpCategory(exp.category || 'Instruments');
    setExpNotes(exp.notes || '');
    setIsEditExpenseOpen(true);
  };

  // Handle Save Contribution (POST)
  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const memberObj = fundType === 'Lavajam' ? users.find(u => u.id === formUserId) : null;
      const contributorName = fundType === 'Lavajam' ? (memberObj?.name || '') : formHoobName.trim();

      if (!contributorName) {
        alert(fundType === 'Lavajam' ? 'Please select a band member.' : 'Please enter contributor name.');
        return;
      }

      const amt = Number(formAmount) || 0;
      const isMufaddal = (contributorName || '').toUpperCase().includes('VALINABU');
      const resolvedSection = isMufaddal ? 'Major' : (memberObj?.section || (fundType === 'Hoob' ? 'External / Hoob' : 'General'));

      await createFinancialRecord({
        fundType,
        userId: fundType === 'Lavajam' ? formUserId : undefined,
        userName: contributorName,
        section: resolvedSection,
        role: isMufaddal ? 'Major' : (memberObj?.role || undefined),
        year: formYear,
        amount: amt,
        status: amt > 0 ? 'Paid' : 'Unpaid',
      }).unwrap();

      setIsAddContributionOpen(false);
      resetContributionForm();
      refetchFin();
    } catch (err) {
      console.error('Failed to create contribution record', err);
      alert('Failed to save contribution. Please try again.');
    }
  };

  // Handle Update Contribution (PUT)
  const handleUpdateContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;

    try {
      const memberObj = fundType === 'Lavajam' ? users.find(u => u.id === formUserId) : null;
      const contributorName = fundType === 'Lavajam' ? (memberObj?.name || editingContribution.userName) : formHoobName.trim();

      const amt = Number(formAmount) || 0;
      const isMufaddal = (contributorName || '').toUpperCase().includes('VALINABU');
      const resolvedSection = isMufaddal ? 'Major' : (fundType === 'Lavajam' && memberObj ? memberObj.section : (editingContribution.section || 'External / Hoob'));

      await updateFinancialRecord({
        id: editingContribution.id,
        originalName: editingContribution.userName,
        fundType,
        userId: fundType === 'Lavajam' ? formUserId : undefined,
        userName: contributorName,
        section: resolvedSection,
        role: isMufaddal ? 'Major' : (memberObj?.role || editingContribution.role),
        year: formYear,
        amount: amt,
        status: amt > 0 ? 'Paid' : 'Unpaid',
      } as any).unwrap();

      setIsEditContributionOpen(false);
      setEditingContribution(null);
      resetContributionForm();
      refetchFin();
    } catch (err) {
      console.error('Failed to update contribution record', err);
      alert('Failed to update contribution. Please try again.');
    }
  };

  // Handle Delete Contribution (DELETE)
  const handleDeleteContribution = async (rec: LavajamRecord) => {
    const isHoob = (rec.fundType || '').toLowerCase().includes('hoob');
    const confirmMsg = isHoob
      ? `Are you sure you want to delete the Hoob contribution for "${rec.userName}"?`
      : `Are you sure you want to clear the ${selectedYear} contribution for "${rec.userName}"? This will mark this member as Unpaid in Excel and Google Sheet.`;

    if (confirm(confirmMsg)) {
      try {
        await deleteFinancialRecord(`id=${rec.id}&year=${selectedYear}`).unwrap();
        refetchFin();
      } catch (err) {
        console.error('Failed to delete contribution record', err);
      }
    }
  };

  // Handle Save Expense (POST)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim()) {
      alert('Please enter expense name / details.');
      return;
    }
    try {
      await createExpense({
        date: expDate,
        expenseDetails: expName.trim(),
        amount: Number(expAmount) || 0,
        category: expCategory,
        notes: expNotes || undefined,
      }).unwrap();

      setIsAddExpenseOpen(false);
      resetExpenseForm();
      refetchExp();
    } catch (err) {
      console.error('Failed to record expense', err);
      alert('Failed to record expense. Please try again.');
    }
  };

  // Handle Update Expense (PUT)
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !expName.trim()) return;

    try {
      await updateExpense({
        id: editingExpense.id,
        originalDetails: editingExpense.expenseDetails,
        date: expDate,
        expenseDetails: expName.trim(),
        amount: Number(expAmount) || 0,
        category: expCategory,
        notes: expNotes || undefined,
      }).unwrap();

      setIsEditExpenseOpen(false);
      setEditingExpense(null);
      resetExpenseForm();
      refetchExp();
    } catch (err) {
      console.error('Failed to update expense', err);
      alert('Failed to update expense. Please try again.');
    }
  };

  // Handle Delete Expense (DELETE)
  const handleDeleteExpense = async (exp: ExpenseRecord) => {
    if (confirm(`Are you sure you want to delete the expense "${exp.expenseDetails}"? This will remove it from Excel and Google Sheet.`)) {
      try {
        await deleteExpense(exp.id).unwrap();
        refetchExp();
      } catch (err) {
        console.error('Failed to delete expense', err);
      }
    }
  };

  const handleExportExcel = () => {
    window.open('/api/excel/export?type=financials', '_blank');
  };

  if (isFinLoading || isExpLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Synchronizing Lavajam &amp; Expense ledgers with Google Sheets &amp; Excel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
            <Coins className="w-3.5 h-3.5" /> Lavajam &amp; Treasury Administration
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
            Lavajam &amp; Expense Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Strictly authorized for Major &amp; Treasurer. 100% two-way synchronized with Google Sheets &amp; Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs gap-1.5 shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export Excel
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={() => {
              resetContributionForm();
              setIsAddContributionOpen(true);
            }}
            className="text-xs gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Record Contribution
          </Button>
          <Button
            variant="havenly"
            size="sm"
            onClick={() => {
              resetExpenseForm();
              setIsAddExpenseOpen(true);
            }}
            className="text-xs gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Record Expense
          </Button>
        </div>
      </div>

      {/* Highcharts Visualizations (Pie chart & Bar graph) */}
      <LavajamCharts
        contributions={records as any}
        expenses={expenses}
      />

      {/* Tabs: [Contributions] & [Expenses] */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('contributions');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'contributions'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Contributions ({records.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('expenses');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'expenses'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            Expenses ({expenses.length})
          </button>
        </div>

        <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
          {activeTab === 'contributions' ? 'Sheet: Lavajam Details' : 'Sheet: Instrument Expenses'}
        </span>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={
              activeTab === 'contributions'
                ? 'Search member name, fund type, section...'
                : 'Search expense name, category, date...'
            }
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {activeTab === 'contributions' && (
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            {/* Year Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 py-1 shadow-xs">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Year:</span>
              <Select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="text-xs font-bold w-24 border-0 p-0 h-auto bg-transparent focus:ring-0 text-foreground"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </Select>
            </div>

            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="text-xs w-32"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </Select>

            <Select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="text-xs w-36"
            >
              <option value="All">All Sections</option>
              <option value="Major">Major</option>
              <option value="Trumpet">Trumpet</option>
              <option value="Saxophone">Saxophone</option>
              <option value="Euphonium">Euphonium</option>
              <option value="Dish">Dish</option>
              <option value="SideDrum">SideDrum/BaseDrum</option>
              <option value="External / Hoob">External / Hoob</option>
            </Select>
          </div>
        )}
      </div>

      {/* ========================================================
          TAB 1: CONTRIBUTIONS (Lavajam Details Table & Mobile Cards)
         ======================================================== */}
      {activeTab === 'contributions' && (
        <Card className="border border-border shadow-xs overflow-hidden space-y-3 p-3">
          {/* Year Overview Banner */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Year {selectedYear} Overview:</span>
              <Badge variant="emerald" className="text-[11px] font-bold">
                Paid: {finData?.metrics?.paidCount ?? records.filter(r => r.status === 'Paid').length}
              </Badge>
              <Badge variant="destructive" className="text-[11px] font-bold">
                Unpaid: {finData?.metrics?.unpaidCount ?? records.filter(r => r.status === 'Unpaid').length}
              </Badge>
            </div>
            <div className="font-bold text-foreground">
              Total Collected: <span className="text-emerald-500 font-mono">{formatCurrency(finData?.metrics?.totalCollected || records.filter(r => r.status === 'Paid').reduce((sum, r) => sum + r.amount, 0))}</span>
            </div>
          </div>

          {/* Mobile Ledger Cards (Phones & Tablets < 768px - ZERO horizontal scroll) */}
          <div className="block md:hidden space-y-2.5">
            {filteredContributions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs p-4 rounded-xl border border-dashed">
                No contribution records matching the current filters.
              </div>
            ) : (
              filteredContributions.map(record => {
                const displaySection = getDisplaySection(record);
                const memberRole = getMemberRole(record);
                const isMajorSection = displaySection === 'Major';

                return (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/90 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground break-words">{record.userName}</span>
                          {record.fundType === 'Hoob' ? (
                            <Badge variant="gold" className="text-[9px] py-0 px-1 font-bold">
                              Hoob
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium">
                              Lavajam
                            </Badge>
                          )}
                        </div>

                        {/* Role aligned with Member Name */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Role:</span>
                          <Badge
                            variant={
                              memberRole.includes('Major')
                                ? 'gold'
                                : memberRole.includes('Treasurer')
                                ? 'emerald'
                                : 'secondary'
                            }
                            className="text-[9px] py-0 px-1.5 font-medium border-border/60"
                          >
                            {memberRole}
                          </Badge>
                        </div>

                        {/* Section with Major badge for Mufaddal */}
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Section:</span>
                          {isMajorSection ? (
                            <Badge variant="gold" className="text-[9px] py-0 px-1.5 font-bold border-amber-500/40 bg-amber-500/10 text-amber-500">
                              Major
                            </Badge>
                          ) : (
                            <span className="text-foreground font-medium">{displaySection}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          variant={record.status === 'Paid' ? 'emerald' : 'destructive'}
                          className="text-[10px] font-bold"
                        >
                          {record.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditContribution(record)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary bg-muted/20"
                          title="Edit Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContribution(record)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive bg-muted/20"
                          title={record.fundType === 'Hoob' ? 'Delete Hoob Contributor' : 'Clear Contribution (Mark Unpaid)'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Year {record.year || selectedYear}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-foreground">
                          {record.amount > 0 ? formatCurrency(record.amount) : '₹0'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table (Visible on Screen >= 768px - NO Date column) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredContributions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No contribution records matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredContributions.map(record => {
                    const displaySection = getDisplaySection(record);
                    const memberRole = getMemberRole(record);
                    const isMajorSection = displaySection === 'Major';

                    return (
                      <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>{record.userName}</span>
                              {record.fundType === 'Hoob' ? (
                                <Badge variant="gold" className="text-[9px] py-0 px-1 font-bold">
                                  Hoob
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-medium">
                                  Lavajam
                                </Badge>
                              )}
                            </div>
                            {/* Role aligned with Member Name */}
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Role:</span>
                              <Badge
                                variant={
                                  memberRole.includes('Major')
                                    ? 'gold'
                                    : memberRole.includes('Treasurer')
                                    ? 'emerald'
                                    : 'secondary'
                                }
                                className="text-[9px] py-0 px-1.5 font-medium border-border/60"
                              >
                                {memberRole}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isMajorSection ? (
                            <Badge variant="gold" className="text-[10px] font-bold border-amber-500/40 bg-amber-500/10 text-amber-500">
                              Major
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {displaySection}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {record.amount > 0 ? (
                            formatCurrency(record.amount)
                          ) : (
                            <span className="text-muted-foreground font-mono">₹0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={record.status === 'Paid' ? 'emerald' : 'destructive'}
                            className="text-[10px] font-bold"
                          >
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditContribution(record)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                              title="Edit Record"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContribution(record)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              title={record.fundType === 'Hoob' ? 'Delete Hoob Contributor' : 'Clear Contribution (Mark Unpaid)'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================
          TAB 2: EXPENSES (Instrument Expenses Table & Mobile Cards)
         ======================================================== */}
      {activeTab === 'expenses' && (
        <Card className="border border-border shadow-xs overflow-hidden">
          {/* Mobile Expense Cards (Phones & Tablets < 768px - ZERO horizontal scroll) */}
          <div className="block md:hidden p-3 space-y-2.5">
            {filteredExpenses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs p-4 rounded-xl border border-dashed">
                No expense records recorded yet.
              </div>
            ) : (
              filteredExpenses.map(expense => (
                <div
                  key={expense.id}
                  className="p-3.5 rounded-xl border border-border/70 bg-card/90 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-sm text-foreground break-words">
                        {expense.expenseDetails}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {expense.date || '24/09/2026'}
                        {expense.category && ` • ${expense.category}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditExpense(expense)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary bg-muted/20"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive bg-muted/20"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                    <span className="text-muted-foreground">Expense Outflow</span>
                    <span className="font-bold text-sm text-rose-500">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Expense Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Expense Details / Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No expense records recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-foreground">
                        {expense.date || '24/09/2026'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {expense.expenseDetails}
                        {expense.notes && (
                          <div className="text-[10px] text-muted-foreground font-normal">{expense.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px]">
                          {expense.category || 'Instruments'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-500">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditExpense(expense)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================
          MODAL 1: RECORD CONTRIBUTION (Form matching Image 2)
         ======================================================== */}
      <Dialog open={isAddContributionOpen} onOpenChange={setIsAddContributionOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-500" />
            Record Lavajam Band Contribution
          </DialogTitle>
          <DialogDescription>
            Record Lavajam or Hoob contribution for year {formYear}. Updates will sync directly to Google Sheets &amp; Excel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveContribution} className="space-y-3.5 text-xs">
          {/* Fund Type Selection (Lavajam, Hoob) */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Fund Type
            </label>
            <Select
              value={fundType}
              onChange={e => setFundType(e.target.value as 'Lavajam' | 'Hoob')}
              className="w-full text-xs font-medium"
              required
            >
              <option value="Lavajam">Lavajam (Band Member Regular Dues)</option>
              <option value="Hoob">Hoob (Community / External Contribution)</option>
            </Select>
          </div>

          {/* If Lavajam: Member Dropdown; If Hoob: Name Input */}
          {fundType === 'Lavajam' ? (
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Select Band Member
              </label>
              <Select
                value={formUserId}
                onChange={e => setFormUserId(e.target.value)}
                className="w-full text-xs"
                required
              >
                <option value="">-- Choose Member --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.section} - {u.role})
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Contributor Name
              </label>
              <Input
                value={formHoobName}
                onChange={e => setFormHoobName(e.target.value)}
                placeholder="Enter unique donor or community member name"
                className="text-xs"
                required
              />
            </div>
          )}

          {/* Target Contribution Year */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Contribution Year
            </label>
            <Select
              value={formYear}
              onChange={e => setFormYear(e.target.value)}
              className="w-full text-xs font-medium"
              required
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </Select>
          </div>

          {/* Amount (INR ₹) */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Amount (INR ₹)
            </label>
            <Input
              type="number"
              value={formAmount}
              onChange={e => setFormAmount(Number(e.target.value))}
              placeholder="1000"
              className="text-xs w-full"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddContributionOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="emerald" disabled={isCreatingFin}>
              {isCreatingFin ? 'Saving...' : 'Save Contribution'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL 2: EDIT CONTRIBUTION (Popup to edit details)
         ======================================================== */}
      <Dialog open={isEditContributionOpen} onOpenChange={setIsEditContributionOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-emerald-500" />
            Edit Contribution Record
          </DialogTitle>
          <DialogDescription>
            Modify details for this contribution for Year {formYear}. Updates will sync with Excel and Google Sheets under Lavajam Details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateContribution} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Fund Type
            </label>
            <Select
              value={fundType}
              onChange={e => setFundType(e.target.value as 'Lavajam' | 'Hoob')}
              className="w-full text-xs font-medium"
              required
            >
              <option value="Lavajam">Lavajam</option>
              <option value="Hoob">Hoob</option>
            </Select>
          </div>

          {fundType === 'Lavajam' ? (
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Band Member
              </label>
              <Select
                value={formUserId}
                onChange={e => setFormUserId(e.target.value)}
                className="w-full text-xs"
              >
                <option value="">{editingContribution?.userName || '-- Choose Member --'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.section})
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Contributor Name
              </label>
              <Input
                value={formHoobName}
                onChange={e => setFormHoobName(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          )}

          {/* Target Contribution Year */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Contribution Year
            </label>
            <Select
              value={formYear}
              onChange={e => setFormYear(e.target.value)}
              className="w-full text-xs font-medium"
              required
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </Select>
          </div>

          {/* Amount (INR ₹) */}
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Amount (INR ₹)
            </label>
            <Input
              type="number"
              value={formAmount}
              onChange={e => setFormAmount(Number(e.target.value))}
              className="text-xs w-full"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditContributionOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="emerald" disabled={isUpdatingFin}>
              {isUpdatingFin ? 'Updating...' : 'Update Contribution'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL 3: RECORD EXPENSE (DatePicker, Expense Name, Amount)
         ======================================================== */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            Record Instrument Expense
          </DialogTitle>
          <DialogDescription>
            Log an instrument or operational expenditure into the Instrument Expenses sheet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Expense Date
            </label>
            <ThemedDatePicker
              value={expDate}
              onChange={setExpDate}
              label="Expense Date"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Expense Name / Details
            </label>
            <Input
              value={expName}
              onChange={e => setExpName(e.target.value)}
              placeholder="e.g. Instrument purchase, Banner express, Valve oil"
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Amount (INR ₹)
              </label>
              <Input
                type="number"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2500"
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Category
              </label>
              <Select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
                className="text-xs"
              >
                <option value="Instruments">Instruments &amp; Parts</option>
                <option value="Maintenance">Maintenance &amp; Tuning</option>
                <option value="Logistics">Logistics &amp; Transport</option>
                <option value="Uniforms">Uniforms &amp; Badges</option>
                <option value="Printing">Printing &amp; Banners</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Additional Notes
            </label>
            <Input
              value={expNotes}
              onChange={e => setExpNotes(e.target.value)}
              placeholder="e.g. Vendor name, invoice number"
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddExpenseOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="havenly" disabled={isCreatingExp}>
              {isCreatingExp ? 'Saving...' : 'Save Expense'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* ========================================================
          MODAL 4: EDIT EXPENSE
         ======================================================== */}
      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-rose-500" />
            Edit Instrument Expense
          </DialogTitle>
          <DialogDescription>
            Modify expense details. Changes will synchronize with Excel and Google Sheets under Instrument Expenses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateExpense} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Expense Date
            </label>
            <ThemedDatePicker
              value={expDate}
              onChange={setExpDate}
              label="Expense Date"
            />
          </div>

          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Expense Name / Details
            </label>
            <Input
              value={expName}
              onChange={e => setExpName(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Amount (INR ₹)
              </label>
              <Input
                type="number"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-foreground mb-1 block">
                Category
              </label>
              <Select
                value={expCategory}
                onChange={e => setExpCategory(e.target.value)}
                className="text-xs"
              >
                <option value="Instruments">Instruments &amp; Parts</option>
                <option value="Maintenance">Maintenance &amp; Tuning</option>
                <option value="Logistics">Logistics &amp; Transport</option>
                <option value="Uniforms">Uniforms &amp; Badges</option>
                <option value="Printing">Printing &amp; Banners</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-foreground mb-1 block">
              Additional Notes
            </label>
            <Input
              value={expNotes}
              onChange={e => setExpNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditExpenseOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="havenly" disabled={isUpdatingExp}>
              {isUpdatingExp ? 'Updating...' : 'Update Expense'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
