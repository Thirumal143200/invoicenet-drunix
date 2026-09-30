import React, { useState, useEffect } from 'react';
import {
  FraudAlert,
  FraudMetrics,
  UserPersona,
  AlertSeverity,
  InvestigationStatus,
  AnomalyType,
} from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ExternalLink,
  X,
  Send,
  Eye,
  Hash,
  Layers,
  FileText,
  User,
  Activity,
  AlertOctagon,
  ChevronRight,
  Info,
} from 'lucide-react';

interface FraudCenterViewProps {
  currentPersona: UserPersona;
  onInspectInvoiceProof?: (invoiceId: string) => void;
}

export const FraudCenterView: React.FC<FraudCenterViewProps> = ({
  currentPersona,
  onInspectInvoiceProof,
}) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);

  // Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Investigation Note input
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [statusUpdateMsg, setStatusUpdateMsg] = useState<string | null>(null);

  const fetchAlertsAndMetrics = async () => {
    try {
      setLoading(true);
      const headers = {
        'x-user-role': currentPersona.role,
        'x-user-id': currentPersona.name,
        'x-user-org': currentPersona.org,
      };

      const [alertsRes, metricsRes] = await Promise.all([
        fetch('/api/fraud/alerts', { headers }),
        fetch('/api/fraud/metrics', { headers }),
      ]);

      const alertsData = await alertsRes.json();
      const metricsData = await metricsRes.json();

      if (alertsData.success) setAlerts(alertsData.data);
      if (metricsData.success) setMetrics(metricsData.data);

      // If an alert is currently selected, refresh its details
      if (selectedAlert) {
        const updated = alertsData.data.find((a: FraudAlert) => a.id === selectedAlert.id);
        if (updated) setSelectedAlert(updated);
      }
    } catch (err) {
      console.error('Failed to load fraud center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndMetrics();
  }, [currentPersona]);

  const handleScanLedger = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/fraud/scan', {
        method: 'POST',
        headers: {
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchAlertsAndMetrics();
      }
    } catch (err) {
      console.error('Ledger scan failed:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !newNote.trim() || submittingNote) return;

    try {
      setSubmittingNote(true);
      const res = await fetch(`/api/fraud/alerts/${selectedAlert.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
        body: JSON.stringify({ note: newNote.trim() }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setSelectedAlert(data.data);
        setNewNote('');
        fetchAlertsAndMetrics();
      }
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleUpdateStatus = async (newStatus: InvestigationStatus) => {
    if (!selectedAlert) return;

    try {
      const res = await fetch(`/api/fraud/alerts/${selectedAlert.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
        body: JSON.stringify({
          status: newStatus,
          notes: `Case status changed to ${newStatus} by ${currentPersona.name} (${currentPersona.role}).`,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setSelectedAlert(data.data);
        setStatusUpdateMsg(`Status updated to ${newStatus}`);
        setTimeout(() => setStatusUpdateMsg(null), 3000);
        fetchAlertsAndMetrics();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && alert.status !== filterStatus) return false;
    if (filterType !== 'ALL' && alert.anomalyType !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match =
        alert.invoiceNumber.toLowerCase().includes(term) ||
        alert.headline.toLowerCase().includes(term) ||
        alert.supplierOrg.toLowerCase().includes(term) ||
        alert.buyerOrg.toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  const getSeverityBadge = (sev: AlertSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping mr-0.5"></span>
            <span>CRITICAL</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-royal border border-blue-200">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: InvestigationStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            OPEN
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            UNDER REVIEW
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            RESOLVED
          </span>
        );
      case 'FALSE_POSITIVE':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            FALSE POSITIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-navy via-slate-900 to-royal text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-lg bg-royal/80 border border-royal-border flex items-center justify-center text-white shadow-inner">
            <ShieldAlert className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Fraud & Anomaly Detection Center
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                DRUNIX Sentinel Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Deterministic consensus validation & statistical anomaly detection across all registered receivables
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleScanLedger}
            disabled={scanning}
            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all border border-white/20 cursor-pointer disabled:opacity-50"
            title="Scan DRUNIX ledger for new pattern anomalies"
          >
            <Activity className={`h-4 w-4 text-sky-300 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning Ledger...' : 'Scan Ledger Now'}</span>
          </button>

          <button
            onClick={fetchAlertsAndMetrics}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Refresh alerts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>Total Anomalies</span>
            <AlertOctagon className="h-4 w-4 text-royal" />
          </div>
          <div className="text-2xl font-bold font-mono text-navy mt-1">
            {metrics?.totalAlerts ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Evaluated on-chain</div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1 border-rose-200">
          <div className="text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>High & Critical Risk</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            {metrics?.highSeverityCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Priority review needed</div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
          <div className="text-xs font-semibold text-indigo-700 flex items-center justify-between">
            <span>Active Investigations</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {metrics?.underReviewCases ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {metrics?.openCases ?? 0} open, {metrics?.underReviewCases ?? 0} under review
          </div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
          <div className="text-xs font-semibold text-emerald-700 flex items-center justify-between">
            <span>Resolved Cases</span>
            <CheckCircle2 className="h-4 w-4 text-emerald" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald mt-1">
            {metrics?.resolvedCases ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">Auditor verified & closed</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl enterprise-card bg-white space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice number, supplier, or buyer..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-softGray-border focus:outline-none focus:ring-1 focus:ring-royal bg-slate-50/50"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" />
              <span className="font-semibold text-navy">Filters:</span>
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-softGray-border text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-royal"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-softGray-border text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-royal"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="FALSE_POSITIVE">False Positive</option>
            </select>

            {/* Anomaly Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-softGray-border text-xs bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-royal"
            >
              <option value="ALL">All Anomaly Types</option>
              <option value="REPEATED_FINANCING_ATTEMPT">Double Financing</option>
              <option value="UNUSUAL_INVOICE_AMOUNT">Amount Outlier</option>
              <option value="REPEATED_INVOICE_REFERENCE">Duplicate Reference</option>
              <option value="PAYMENT_DETAILS_MODIFICATION">GSTIN Revision</option>
              <option value="UNUSUAL_TRANSACTION_FREQUENCY">Velocity Surge</option>
              <option value="INVOICE_HISTORY_INCONSISTENCY">Date Inconsistency</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="enterprise-card bg-white overflow-hidden shadow-xs rounded-xl">
        <div className="px-5 py-3 border-b border-softGray-border bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-navy uppercase tracking-wider">
              Detected Anomalies & Investigation Queue
            </span>
            <span className="text-xs font-mono font-semibold text-slate-500">
              ({filteredAlerts.length} records)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Neutral non-accusatory evaluation standard active
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-royal" />
            <span>Loading anomaly detection records...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ShieldCheck className="h-10 w-10 text-emerald mx-auto" />
            <div className="text-sm font-bold text-navy">No Anomalies Found</div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All analyzed receivables on the DRUNIX distributed ledger comply with standard statistical thresholds and multi-party endorsement rules.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-softGray-border">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    {getSeverityBadge(alert.severity)}
                    {getStatusBadge(alert.status)}
                    <span className="font-mono text-xs font-bold text-navy">
                      {alert.invoiceNumber}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      ID: <strong className="font-mono text-slate-700">{alert.id}</strong>
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      Detected: {new Date(alert.detectedAt).toLocaleDateString()} {new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-navy flex items-center space-x-1.5">
                    <span>{alert.headline}</span>
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {alert.evidence.description}
                  </p>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-1">
                    <span>
                      Counter-parties: <strong className="text-slate-700">{alert.supplierOrg}</strong> → <strong className="text-slate-700">{alert.buyerOrg}</strong>
                    </span>
                    <span>
                      Amount: <strong className="font-mono text-royal font-bold">₹{alert.amount.toLocaleString('en-IN')}</strong>
                    </span>
                    {alert.investigationNotes.length > 0 && (
                      <span className="text-indigo-600 font-semibold">
                        💬 {alert.investigationNotes.length} note(s)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAlert(alert);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-royal font-semibold text-xs flex items-center space-x-1 shadow-2xs transition-all"
                  >
                    <span>Investigate</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investigation Detail Workspace Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-softGray-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-navy to-slate-900 text-white flex items-center justify-between border-b border-softGray-border">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-lg bg-royal/80 border border-royal-border flex items-center justify-center text-white shadow-inner">
                  <ShieldAlert className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      Case Investigation Workspace: {selectedAlert.id}
                    </h2>
                    {getSeverityBadge(selectedAlert.severity)}
                    {getStatusBadge(selectedAlert.status)}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Target: Invoice <strong className="text-white font-mono">{selectedAlert.invoiceNumber}</strong> ({selectedAlert.invoiceId})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlert(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Split 2 columns */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
              {/* Left Column: Evidence Breakdown (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Headline Banner */}
                <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Observed Anomaly
                  </div>
                  <h3 className="text-sm font-bold text-navy leading-snug">
                    {selectedAlert.headline}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {selectedAlert.evidence.description}
                  </p>
                </div>

                {/* Evidence Metrics Table */}
                {selectedAlert.evidence.metrics && (
                  <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                      <Activity className="h-3 w-3 text-royal" />
                      <span>Quantitative Evidence Metrics</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(selectedAlert.evidence.metrics).map(([key, val]) => (
                        <div key={key} className="p-2.5 rounded-lg bg-softGray border border-softGray-border">
                          <span className="text-[11px] text-slate-500 font-semibold block capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </span>
                          <span className="font-mono font-bold text-navy mt-0.5 block">
                            {typeof val === 'number' && val > 1000 ? `₹${val.toLocaleString('en-IN')}` : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {selectedAlert.evidence.expectedValue && (
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2 rounded bg-amber-50 border border-amber-200">
                          <span className="text-[10px] text-amber-800 font-bold block">Observed Value</span>
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {selectedAlert.evidence.observedValue}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] text-emerald-800 font-bold block">Expected Benchmark</span>
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {selectedAlert.evidence.expectedValue}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Gemini Natural Language Explanation */}
                {selectedAlert.geminiExplanation && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-royal">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span>Gemini Objective Evidence Brief</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {selectedAlert.geminiExplanation}
                    </p>
                  </div>
                )}

                {/* DRUNIX Blockchain Proof */}
                {selectedAlert.evidence.drunixProof && (
                  <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Hash className="h-3 w-3 text-emerald" />
                        <span>DRUNIX On-Chain Verification Proof</span>
                      </span>
                      {onInspectInvoiceProof && (
                        <button
                          onClick={() => onInspectInvoiceProof(selectedAlert.invoiceId)}
                          className="text-[10px] text-royal font-semibold hover:underline flex items-center space-x-1"
                        >
                          <span>Full Ledger Proof</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-1 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Block Height:</span>
                        <span className="font-bold text-navy">#{selectedAlert.evidence.drunixProof.blockNumber}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Transaction ID:</span>
                        <span className="font-bold text-slate-700 truncate max-w-[220px]">
                          {selectedAlert.evidence.drunixProof.txId}
                        </span>
                      </div>
                      {selectedAlert.evidence.drunixProof.signatureHash && (
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Signature Hash:</span>
                          <span className="text-slate-600 truncate max-w-[220px]">
                            {selectedAlert.evidence.drunixProof.signatureHash}
                          </span>
                        </div>
                      )}
                      {selectedAlert.evidence.drunixProof.documentHash && (
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Doc SHA-256:</span>
                          <span className="text-slate-600 truncate max-w-[220px]">
                            {selectedAlert.evidence.drunixProof.documentHash.slice(0, 20)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Case Actions & Audit Trail (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Case Status Action Card */}
                <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Update Case Status
                  </div>

                  {statusUpdateMsg && (
                    <div className="p-2 rounded bg-emerald-50 text-emerald-800 text-xs font-semibold text-center border border-emerald-200">
                      {statusUpdateMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        selectedAlert.status === 'UNDER_REVIEW'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      }`}
                    >
                      Under Review
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('RESOLVED')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        selectedAlert.status === 'RESOLVED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      Resolve Case
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('FALSE_POSITIVE')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        selectedAlert.status === 'FALSE_POSITIVE'
                          ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      False Positive
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('OPEN')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                        selectedAlert.status === 'OPEN'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      Re-open Case
                    </button>
                  </div>
                </div>

                {/* Investigation Notes Thread */}
                <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Investigation Notes</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({selectedAlert.investigationNotes.length})
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedAlert.investigationNotes.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-2">
                        No notes recorded yet. Add initial observations below.
                      </p>
                    ) : (
                      selectedAlert.investigationNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-2.5 rounded-lg bg-softGray/80 border border-softGray-border text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span className="font-semibold text-navy">
                              {note.author} ({note.role})
                            </span>
                            <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700 leading-snug">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-100">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add investigation observation or verification note..."
                      rows={2}
                      className="w-full p-2 text-xs rounded-lg border border-softGray-border focus:outline-none focus:ring-1 focus:ring-royal resize-none bg-slate-50/50"
                    />
                    <button
                      type="submit"
                      disabled={!newNote.trim() || submittingNote}
                      className="w-full py-1.5 rounded-lg bg-royal hover:bg-royal-hover disabled:bg-slate-300 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{submittingNote ? 'Saving Note...' : 'Add Note to Case'}</span>
                    </button>
                  </form>
                </div>

                {/* Audit Trail Timeline */}
                <div className="p-4 rounded-xl bg-white border border-softGray-border shadow-2xs space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-royal" />
                    <span>Immutable Audit Trail</span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
                    {selectedAlert.auditTrail.map((entry) => (
                      <div
                        key={entry.id}
                        className="pl-3 border-l-2 border-softGray-border text-[11px] space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                          <span className="font-semibold text-slate-700">{entry.actorId}</span>
                          <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="font-mono text-navy font-bold text-[10px]">
                          {entry.action} {entry.newStatus ? `→ ${entry.newStatus}` : ''}
                        </div>
                        {entry.notes && (
                          <div className="text-slate-600 text-[10px] italic">{entry.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-white border-t border-softGray-border flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center space-x-1">
                <Info className="h-3.5 w-3.5 text-royal" />
                <span>DRUNIX transactions remain immutably preserved. Case updates log to auditor trail.</span>
              </span>
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-1.5 rounded-lg bg-softGray hover:bg-slate-200 text-navy font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
