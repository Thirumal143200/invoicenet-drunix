import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPersona,
  InvoiceReminder,
  ReminderSummary,
  ReminderPreference,
} from '../types';
import {
  Bell,
  BellRing,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Mail,
  RefreshCw,
  Sliders,
  Check,
  CheckCheck,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  X,
  Send,
  AlertCircle,
  Sparkles,
  Info,
  DollarSign,
  Building,
} from 'lucide-react';

interface InvoiceRemindersViewProps {
  currentPersona: UserPersona;
  onInspectInvoiceProof?: (invoiceId: string) => void;
  onRefreshLedger?: () => void;
}

export const InvoiceRemindersView: React.FC<InvoiceRemindersViewProps> = ({
  currentPersona,
  onInspectInvoiceProof,
  onRefreshLedger,
}) => {
  const [reminders, setReminders] = useState<InvoiceReminder[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UPCOMING' | 'DUE_TODAY' | 'OVERDUE' | 'UNREAD'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Preferences Modal
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<ReminderPreference | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('invoicenet_auth_token');
    const headers: Record<string, string> = {
      'x-user-role': currentPersona.role,
      'x-user-id': currentPersona.name,
      'x-user-org': currentPersona.org,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchRemindersAndSummary = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [remindersRes, summaryRes] = await Promise.all([
        fetch('/api/reminders?limit=100', { headers }),
        fetch('/api/reminders/summary', { headers }),
      ]);

      const remData = await remindersRes.json();
      const sumData = await summaryRes.json();

      if (remData.success) {
        setReminders(remData.data);
      }
      if (sumData.success) {
        setSummary(sumData.data);
      }
    } catch (err) {
      console.warn('Failed to load reminders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/reminders/preferences', { headers });
      const data = await res.json();
      if (data.success) {
        setPreferences(data.data);
      }
    } catch (err) {
      console.warn('Failed to load preferences:', err);
    }
  };

  useEffect(() => {
    fetchRemindersAndSummary();
    fetchPreferences();
  }, [currentPersona]);

  // Run automated scan on-demand
  const triggerAutomatedScan = async () => {
    try {
      setIsScanning(true);
      setScanMessage(null);
      const headers = getAuthHeaders();
      const res = await fetch('/api/reminders/process', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggerReason: 'USER_INTERFACE_TRIGGER' }),
      });
      const data = await res.json();
      if (data.success) {
        setScanMessage(data.message);
        await fetchRemindersAndSummary();
        if (onRefreshLedger) onRefreshLedger();
      }
    } catch (err) {
      console.error('Scan trigger failed:', err);
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  // Mark single reminder as read
  const handleMarkRead = async (id: string) => {
    try {
      const headers = getAuthHeaders();
      await fetch(`/api/reminders/${id}/read`, {
        method: 'PUT',
        headers,
      });
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_read: true, read_at: new Date().toISOString() } : r))
      );
      if (summary) {
        setSummary({ ...summary, unreadCount: Math.max(0, summary.unreadCount - 1) });
      }
    } catch (err) {
      console.warn('Failed to mark reminder read:', err);
    }
  };

  // Mark all reminders as read
  const handleMarkAllRead = async () => {
    try {
      const headers = getAuthHeaders();
      await fetch('/api/reminders/read-all', {
        method: 'PUT',
        headers,
      });
      setReminders((prev) => prev.map((r) => ({ ...r, is_read: true })));
      if (summary) {
        setSummary({ ...summary, unreadCount: 0 });
      }
    } catch (err) {
      console.warn('Failed to mark all read:', err);
    }
  };

  // Save updated preferences
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;
    try {
      setSavingPrefs(true);
      const headers = getAuthHeaders();
      const res = await fetch('/api/reminders/preferences', {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      const data = await res.json();
      if (data.success) {
        setPreferences(data.data);
        setIsPrefModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  // Toggle interval in preferences
  const toggleInterval = (interval: number) => {
    if (!preferences) return;
    const exists = preferences.enabled_intervals.includes(interval);
    const updatedIntervals = exists
      ? preferences.enabled_intervals.filter((i) => i !== interval)
      : [...preferences.enabled_intervals, interval].sort((a, b) => a - b);
    setPreferences({ ...preferences, enabled_intervals: updatedIntervals });
  };

  // Filtered and searched reminders
  const filteredReminders = useMemo(() => {
    return reminders.filter((rem) => {
      // Filter tab
      if (activeFilter === 'UPCOMING' && rem.interval_days >= 0) return false;
      if (activeFilter === 'DUE_TODAY' && rem.interval_days !== 0) return false;
      if (activeFilter === 'OVERDUE' && rem.interval_days <= 0) return false;
      if (activeFilter === 'UNREAD' && rem.is_read) return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const num = rem.invoice_number.toLowerCase();
        const type = rem.reminder_type.toLowerCase();
        const buyer = rem.metadata?.buyerOrg?.toLowerCase() || '';
        const supplier = rem.metadata?.supplierOrg?.toLowerCase() || '';
        if (!num.includes(q) && !type.includes(q) && !buyer.includes(q) && !supplier.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [reminders, activeFilter, searchQuery]);

  const getReminderBadge = (type: string, intervalDays: number) => {
    if (intervalDays < 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="h-3 w-3 text-sky-500" />
          <span>{intervalDays === -7 ? '7 Days Before' : '3 Days Before'}</span>
        </span>
      );
    }
    if (intervalDays === 0) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <AlertCircle className="h-3 w-3 text-amber-600" />
          <span>Due Today</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
        <AlertTriangle className="h-3 w-3 text-rose-600" />
        <span>
          {intervalDays === 1 ? '1 Day Overdue' : intervalDays === 3 ? '3 Days Overdue' : '7 Days Overdue'}
        </span>
      </span>
    );
  };

  const getEmailStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Check className="h-2.5 w-2.5" />
            <span>Delivered</span>
          </span>
        );
      case 'MOCKED':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Mail className="h-2.5 w-2.5" />
            <span>Simulated</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertCircle className="h-2.5 w-2.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] text-slate-400 font-mono">In-App Only</span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Actions */}
      <div className="p-6 enterprise-card bg-gradient-to-r from-navy via-slate-900 to-navy-surface text-white border-0 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-royal/10 pointer-events-none rounded-l-full blur-2xl"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-royal/40 text-royal-light border border-royal/50">
                DRUNIX Automated Protection
              </span>
              <span className="text-xs text-slate-400 font-medium">PostgreSQL Idempotent Scheduler</span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
              Automated Invoice Reminders & Overdue Alerts
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Continuous due-date monitoring across <strong>-7d, -3d, due-date, +1d, +3d, and +7d</strong> intervals.
              Reminders are automatically sent to buyers and suppliers, strictly suppressed upon invoice settlement,
              and cryptographically tracked with zero duplicates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={triggerAutomatedScan}
              disabled={isScanning}
              className="px-3.5 py-2 rounded-lg bg-royal hover:bg-royal-hover disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-sm"
              title="Execute immediate scan of all open invoices against reminder rules"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Evaluating...' : 'Run Scan Now'}</span>
            </button>

            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center space-x-1.5 transition-all"
              title="Configure reminder intervals, email preferences, and alert thresholds"
            >
              <Sliders className="h-3.5 w-3.5 text-royal-light" />
              <span>Preferences</span>
            </button>

            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs flex items-center space-x-1.5 transition-all"
              title="Mark all notifications as read"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Mark All Read</span>
            </button>
          </div>
        </div>

        {scanMessage && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Upcoming Reminders */}
        <div className="p-5 enterprise-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Reminders</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy mt-2 font-mono">
            {summary ? summary.upcomingCount : 0}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-sky-600 mt-1 font-medium">
            <span>7-day & 3-day maturity alerts</span>
          </div>
        </div>

        {/* Card 2: Due Today */}
        <div className="p-5 enterprise-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Today</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2 font-mono">
            {summary ? summary.dueTodayCount : 0}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-amber-600 mt-1 font-medium">
            <span>Matures on current calendar date</span>
          </div>
        </div>

        {/* Card 3: Critical Overdue */}
        <div className="p-5 enterprise-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Critical Overdue</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono">
            {summary ? summary.overdueCount : 0}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-rose-600 mt-1 font-medium">
            <span>+1d, +3d, and +7d overdue notices</span>
          </div>
        </div>

        {/* Card 4: Delivery Channels */}
        <div className="p-5 enterprise-card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notifications Dispatched</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-navy mt-2 font-mono">
            {summary ? summary.totalReminders : 0}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1 font-mono">
            <span className="text-emerald-700 font-bold">{summary?.deliveredEmailsCount || 0} Delivered</span>
            <span className="text-slate-400">•</span>
            <span className="text-rose-600 font-semibold">{summary?.failedEmailsCount || 0} Failed</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="enterprise-card overflow-hidden">
        {/* Filter and Search Bar */}
        <div className="p-4 border-b border-softGray-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/60">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-royal text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Reminders ({reminders.length})
            </button>

            <button
              onClick={() => setActiveFilter('UPCOMING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'UPCOMING'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Upcoming ({summary?.upcomingCount || 0})
            </button>

            <button
              onClick={() => setActiveFilter('DUE_TODAY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'DUE_TODAY'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Due Today ({summary?.dueTodayCount || 0})
            </button>

            <button
              onClick={() => setActiveFilter('OVERDUE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Overdue ({summary?.overdueCount || 0})
            </button>

            <button
              onClick={() => setActiveFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'UNREAD'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Unread Only ({summary?.unreadCount || 0})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice or counterparty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-royal focus:border-royal text-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Reminders Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal"></div>
              <p className="text-xs text-slate-500 font-medium">Loading automated reminders & notifications...</p>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="text-center p-12 space-y-3">
              <div className="inline-flex p-3 rounded-full bg-slate-100 text-slate-400">
                <Bell className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-navy">No reminders found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'ALL'
                  ? 'No notifications match your current filter criteria. Try clearing search or selecting a different tab.'
                  : 'All invoices are currently current with no pending reminder intervals. Click "Run Scan Now" to evaluate open ledger receivables.'}
              </p>
              <button
                onClick={triggerAutomatedScan}
                className="px-3.5 py-1.5 rounded-lg bg-softGray hover:bg-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center space-x-1.5 transition-colors"
              >
                <RefreshCw className="h-3 w-3 text-royal" />
                <span>Evaluate Open Invoices</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-softGray-border bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Counterparty</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Reminder Type</th>
                  <th className="py-3 px-4">Channels</th>
                  <th className="py-3 px-4">Dispatched</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredReminders.map((rem) => {
                  const isUnread = !rem.is_read;
                  return (
                    <tr
                      key={rem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isUnread ? 'bg-royal/5 font-medium' : 'bg-white'
                      }`}
                    >
                      {/* Invoice Number */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-royal animate-pulse flex-shrink-0" />
                          )}
                          <button
                            onClick={() => onInspectInvoiceProof && onInspectInvoiceProof(rem.invoice_id)}
                            className="font-bold font-mono text-royal hover:underline flex items-center space-x-1 text-left"
                            title="Inspect on-chain cryptographic proof"
                          >
                            <span>{rem.invoice_number}</span>
                            <ExternalLink className="h-3 w-3 text-slate-400" />
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          ID: {rem.invoice_id}
                        </span>
                      </td>

                      {/* Counterparty */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy flex items-center space-x-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[180px]">
                            {rem.recipient_role === 'BUYER'
                              ? rem.metadata?.supplierOrg || 'TechParts Manufacturing'
                              : rem.metadata?.buyerOrg || 'AutoWorks Industries'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Recipient: {rem.recipient_role} ({rem.recipient_email})
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        <span className="font-bold font-mono text-navy">
                          ₹{rem.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {rem.currency || 'INR'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700">
                          {new Date(rem.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {rem.interval_days < 0
                            ? `Due in ${Math.abs(rem.interval_days)} days`
                            : rem.interval_days === 0
                            ? 'Matures today'
                            : `${rem.interval_days} days overdue`}
                        </span>
                      </td>

                      {/* Reminder Type Badge */}
                      <td className="py-3 px-4">
                        {getReminderBadge(rem.reminder_type, rem.interval_days)}
                      </td>

                      {/* Channels & Delivery Status */}
                      <td className="py-3 px-4 space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">Email:</span>
                          {getEmailStatusBadge(rem.email_delivery_status)}
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">In-App:</span>
                          <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                            <Check className="h-2.5 w-2.5" />
                            <span>Active</span>
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {new Date(rem.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(rem.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isUnread ? (
                            <button
                              onClick={() => handleMarkRead(rem.id)}
                              className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-royal border border-royal/30 text-[11px] font-semibold flex items-center space-x-1 shadow-2xs"
                              title="Mark this reminder as read"
                            >
                              <Check className="h-3 w-3" />
                              <span>Mark Read</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
                              <span>Read</span>
                            </span>
                          )}

                          <button
                            onClick={() => onInspectInvoiceProof && onInspectInvoiceProof(rem.invoice_id)}
                            className="p-1 text-slate-400 hover:text-navy rounded hover:bg-slate-100 transition-colors"
                            title="Inspect on-chain DRUNIX ledger record"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reminder Preferences Modal */}
      {isPrefModalOpen && preferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-royal/10 text-royal">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy">Reminder Preferences & Policy</h3>
                  <p className="text-xs text-slate-500">Configure alert rules for {currentPersona.org}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPrefModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePreferences} className="p-6 space-y-5 text-xs text-slate-700">
              {/* Delivery Channels */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                  Delivery Channels
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.email_enabled}
                      onChange={(e) => setPreferences({ ...preferences, email_enabled: e.target.checked })}
                      className="rounded border-slate-300 text-royal focus:ring-royal h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-navy block">Email Alerts</span>
                      <span className="text-[11px] text-slate-500">SMTP / Simulated</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={preferences.in_app_enabled}
                      onChange={(e) => setPreferences({ ...preferences, in_app_enabled: e.target.checked })}
                      className="rounded border-slate-300 text-royal focus:ring-royal h-4 w-4"
                    />
                    <div>
                      <span className="font-semibold text-navy block">In-App Alerts</span>
                      <span className="text-[11px] text-slate-500">Drawer & bell</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Monitored Intervals */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                  Automated Reminder Intervals
                </label>
                <p className="text-[11px] text-slate-500">
                  Select which timing thresholds should generate notifications:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {[
                    { label: '7 Days Before', val: -7 },
                    { label: '3 Days Before', val: -3 },
                    { label: 'On Due Date', val: 0 },
                    { label: '1 Day Overdue', val: 1 },
                    { label: '3 Days Overdue', val: 3 },
                    { label: '7 Days Overdue', val: 7 },
                  ].map((item) => {
                    const isChecked = preferences.enabled_intervals.includes(item.val);
                    return (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => toggleInterval(item.val)}
                        className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-royal/10 border-royal text-royal font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs">{item.label}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-royal" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Overdue Alerts Toggle */}
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-900 block text-xs">Enable Overdue Payment Alerts</span>
                  <span className="text-[11px] text-rose-700">
                    Send urgent follow-ups for invoices reaching 1, 3, and 7 days past due.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.overdue_alerts_enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, overdue_alerts_enabled: e.target.checked })
                  }
                  className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
              </div>

              {/* Minimum Amount Threshold */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-navy block">
                  Minimum Amount Threshold (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={preferences.minimum_amount}
                    onChange={(e) =>
                      setPreferences({ ...preferences, minimum_amount: Number(e.target.value) || 0 })
                    }
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-royal"
                    placeholder="e.g. 0 for all invoices"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Only invoices with amount greater than or equal to this threshold will generate reminders.
                </span>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPrefModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="px-4 py-2 rounded-lg bg-royal hover:bg-royal-hover text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  {savingPrefs && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save Preferences</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
