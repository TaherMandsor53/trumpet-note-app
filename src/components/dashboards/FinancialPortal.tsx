'use client';

import React, { useState } from 'react';
import {
  useGetFinancialsQuery,
  useCreateFinancialRecordMutation,
  useUpdateFinancialRecordMutation,
  useDeleteFinancialRecordMutation,
  useGetUsersQuery,
} from '@/store/api/bandApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Search,
  Receipt,
  Trash2,
  Edit2,
  FileSpreadsheet,
} from 'lucide-react';

export function FinancialPortal() {
  const { data, isLoading, refetch } = useGetFinancialsQuery();
  const { data: usersData } = useGetUsersQuery();
  const [createRecord, { isLoading: isCreating }] = useCreateFinancialRecordMutation();
  const [updateRecord] = useUpdateFinancialRecordMutation();
  const [deleteRecord] = useDeleteFinancialRecordMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [formUserId, setFormUserId] = useState('');
  const [formMonth, setFormMonth] = useState('September');
  const [formYear, setFormYear] = useState(2026);
  const [formAmount, setFormAmount] = useState(1500);
  const [formStatus, setFormStatus] = useState<'Paid' | 'Pending'>('Paid');
  const [formMethod, setFormMethod] = useState<'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [formRef, setFormRef] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const records = data?.records || [];
  const metrics = data?.metrics || {
    totalCollected: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
    collectionRate: 0,
    totalRecords: 0,
  };

  const users = usersData?.users || [];

  const filteredRecords = records.filter(r => {
    const matchesSearch =
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.transactionRef?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesSection = sectionFilter === 'All' || r.section === sectionFilter;

    return matchesSearch && matchesStatus && matchesSection;
  });

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserId) return;

    try {
      await createRecord({
        userId: formUserId,
        year: Number(formYear),
        month: formMonth,
        amount: Number(formAmount),
        status: formStatus,
        paymentMethod: formStatus === 'Paid' ? formMethod : undefined,
        transactionRef: formRef || undefined,
        notes: formNotes || undefined,
      }).unwrap();

      setIsAddModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      console.error('Failed to create financial record', err);
    }
  };

  const handleToggleStatus = async (recordId: string, currentStatus: 'Paid' | 'Pending') => {
    const nextStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      await updateRecord({
        id: recordId,
        status: nextStatus,
        paymentMethod: nextStatus === 'Paid' ? 'Cash' : undefined,
      }).unwrap();
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contribution record?')) {
      await deleteRecord(id);
    }
  };

  const resetForm = () => {
    setFormUserId('');
    setFormAmount(1500);
    setFormStatus('Paid');
    setFormRef('');
    setFormNotes('');
  };

  const handleExportExcel = () => {
    window.open('/api/excel/export?type=financials', '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading Lavajam financial ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-1">
            <Coins className="w-3.5 h-3.5" /> Lavajam Band Contribution Portal
          </div>
          <h2 className="text-2xl font-serif font-black tracking-tight text-foreground">
            Financial Ledger & Collections
          </h2>
          <p className="text-xs text-muted-foreground">
            Authorized for Overall Major & Treasurer. Real-time collection tracking & audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-xs gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export to Excel
          </Button>
          <Button variant="emerald" size="sm" onClick={() => setIsAddModalOpen(true)} className="text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Record Contribution
          </Button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-muted-foreground font-medium">Total Collected</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">
            {formatCurrency(metrics.totalCollected)}
          </p>
          <p className="text-[10px] text-emerald-500 font-medium mt-1">
            {metrics.paidCount} contributions cleared
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <p className="text-xs text-muted-foreground font-medium">Outstanding / Pending</p>
          <p className="text-2xl font-serif font-bold text-rose-500 mt-1">
            {formatCurrency(metrics.totalPending)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {metrics.pendingCount} members pending
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-xs text-muted-foreground font-medium">Collection Clearance Rate</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-serif text-foreground">
              {metrics.collectionRate}%
            </span>
            <span className="text-[10px] text-muted-foreground">cleared</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${metrics.collectionRate}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-xs text-muted-foreground font-medium">Standard Contribution</p>
          <p className="text-2xl font-serif font-bold text-foreground mt-1">₹1,500</p>
          <p className="text-[10px] text-muted-foreground mt-1">Per member / month</p>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search member name, receipt number, transaction ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs w-32"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
          </Select>

          <Select
            value={sectionFilter}
            onChange={e => setSectionFilter(e.target.value)}
            className="text-xs w-36"
          >
            <option value="All">All Sections</option>
            <option value="Trumpet">Trumpet</option>
            <option value="Saxophone">Saxophone</option>
            <option value="Euphonium">Euphonium</option>
            <option value="Dish">Dish</option>
            <option value="SideDrum">SideDrum/BaseDrum</option>
          </Select>
        </div>
      </div>

      {/* Ledger DataTable & Mobile Cards */}
      <Card className="border border-border overflow-hidden">
        {/* Mobile Ledger Cards (Visible on Phones & Tablets < 768px) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {filteredRecords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs p-4 rounded-xl border border-dashed">
              No contribution records matching the current filters.
            </div>
          ) : (
            filteredRecords.map(record => (
              <div
                key={record.id}
                className="p-3.5 rounded-xl border border-border/70 bg-card/80 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="font-bold text-sm text-foreground break-words">{record.userName}</div>
                    <div className="text-xs font-mono text-muted-foreground">
                      {record.receiptNo || 'Pending Issue'} • {formatDate(record.paidAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(record.id, record.status)}
                      className="cursor-pointer transition-transform hover:scale-105"
                      title="Click to toggle status"
                    >
                      <Badge
                        variant={record.status === 'Paid' ? 'emerald' : 'destructive'}
                        className="text-[10px] font-bold"
                      >
                        {record.status}
                      </Badge>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(record.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive bg-muted/20"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] py-0">
                      {record.section}
                    </Badge>
                    <span className="text-muted-foreground font-mono">
                      {record.month} {record.year}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-foreground">
                      {formatCurrency(record.amount)}
                    </span>
                    {record.paymentMethod && (
                      <span className="block text-[10px] text-muted-foreground font-mono">
                        {record.paymentMethod}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (Hidden on Phones < 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="py-3 px-4">Receipt / Date</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    No contribution records matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-foreground">
                        {record.receiptNo || 'Pending Issue'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {formatDate(record.paidAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">
                      {record.userName}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">
                        {record.section}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-medium">
                      {record.month} {record.year}
                    </td>
                    <td className="py-3 px-4 font-bold text-foreground">
                      {formatCurrency(record.amount)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {record.paymentMethod ? (
                        <span className="font-medium text-foreground">
                          {record.paymentMethod}
                          {record.transactionRef && (
                            <span className="block text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                              {record.transactionRef}
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(record.id, record.status)}
                        className="cursor-pointer transition-transform hover:scale-105"
                        title="Click to toggle status"
                      >
                        <Badge
                          variant={record.status === 'Paid' ? 'emerald' : 'destructive'}
                          className="text-[10px] font-bold"
                        >
                          {record.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(record.id)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            Record Lavajam Band Contribution
          </DialogTitle>
          <DialogDescription>
            Log a verified contribution payment from a band member into the central ledger.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-muted-foreground mb-1 block">
              Select Band Member
            </label>
            <Select
              value={formUserId}
              onChange={e => setFormUserId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Year</label>
              <Input
                type="number"
                value={formYear}
                onChange={e => setFormYear(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Month</label>
              <Select value={formMonth} onChange={e => setFormMonth(e.target.value)}>
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December',
                ].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">
                Amount (INR ₹)
              </label>
              <Input
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="font-medium text-muted-foreground mb-1 block">Status</label>
              <Select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </Select>
            </div>
          </div>

          {formStatus === 'Paid' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-muted-foreground mb-1 block">
                  Payment Method
                </label>
                <Select
                  value={formMethod}
                  onChange={e => setFormMethod(e.target.value as any)}
                >
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="Cash">Cash at Practice</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cheque">Cheque</option>
                </Select>
              </div>
              <div>
                <label className="font-medium text-muted-foreground mb-1 block">
                  Transaction Ref / Receipt Note
                </label>
                <Input
                  value={formRef}
                  onChange={e => setFormRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Cash receipt"
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-medium text-muted-foreground mb-1 block">
              Internal Notes
            </label>
            <Input
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              placeholder="e.g. Uniform maintenance, instrument tuning fund"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="emerald" disabled={isCreating}>
              {isCreating ? 'Saving...' : 'Save Contribution'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
