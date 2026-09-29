import React, { useState, useEffect } from 'react';
import {
  UserPersona,
  InvoiceRiskAssessment,
  RiskLevel,
  Invoice,
} from '../types';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Cpu,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  Info,
  Layers,
  ArrowRight,
  HelpCircle,
  FileText,
  Lock,
} from 'lucide-react';

interface InvoiceRiskAnalysisViewProps {
  currentPersona: UserPersona;
  invoices: Invoice[];
  onRefreshData?: () => void;
}

export const InvoiceRiskAnalysisView: React.FC<InvoiceRiskAnalysisViewProps> = ({
  currentPersona,
  invoices,
  onRefreshData,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [currentAssessment, setCurrentAssessment] = useState<InvoiceRiskAssessment | null>(null);
  const [history, setHistory] = useState<InvoiceRiskAssessment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMethodologyModal, setShowMethodologyModal] = useState<boolean>(false);

  // Filter invoices authorized for current persona
  const authorizedInvoices = invoices.filter((inv) => {
    if (currentPersona.role === 'FINANCIER' || currentPersona.role === 'EXPLORER') {
      return true;
    }
    if (currentPersona.role === 'SUPPLIER') {
      return (
        inv.supplierOrg.toLowerCase().includes(currentPersona.org.toLowerCase()) ||
        currentPersona.org.toLowerCase().includes(inv.supplierOrg.toLowerCase())
      );
    }
    if (currentPersona.role === 'BUYER') {
      return (
        inv.buyerOrg.toLowerCase().includes(currentPersona.org.toLowerCase()) ||
        currentPersona.org.toLowerCase().includes(inv.buyerOrg.toLowerCase())
      );
    }
    return true;
  });

  // Fetch assessment history and seed initial selection
  useEffect(() => {
    fetchAssessments();
    if (authorizedInvoices.length > 0 && !selectedInvoiceId) {
      setSelectedInvoiceId(authorizedInvoices[0].id);
    }
  }, [currentPersona.role, currentPersona.org, invoices.length]);

  const fetchAssessments = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/risk/assessments', {
        headers: {
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setHistory(data.data);
        if (data.data.length > 0 && !currentAssessment) {
          setCurrentAssessment(data.data[0]);
          setSelectedInvoiceId(data.data[0].invoiceId);
        }
      }
    } catch (err: any) {
      console.warn('Failed to fetch risk assessments:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleRunAnalysis = async (targetId?: string) => {
    const idToAnalyze = targetId || selectedInvoiceId;
    if (!idToAnalyze) {
      setError('Please select an invoice to run risk analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/risk/analyze/${idToAnalyze}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCurrentAssessment(json.data);
        setSuccessMessage(`Risk analysis completed successfully for ${json.data.invoiceNumber}`);
        // Refresh history
        fetchAssessments();
      } else {
        setError(json.error || 'Failed to complete risk analysis.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error while contacting Risk Engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreTheme = (score: number) => {
    if (score >= 75) {
      return {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        pill: 'bg-rose-600 text-white',
        ring: 'stroke-rose-600',
        label: 'CRITICAL RISK',
        sub: 'Hold Financing • Escalate to Consortium Auditor',
      };
    }
    if (score >= 50) {
      return {
        text: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        pill: 'bg-orange-500 text-white',
        ring: 'stroke-orange-500',
        label: 'HIGH RISK',
        sub: 'Enhanced Diligence Required • Reconcile PO',
      };
    }
    if (score >= 25) {
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        pill: 'bg-amber-500 text-white',
        ring: 'stroke-amber-500',
        label: 'MEDIUM RISK',
        sub: 'Moderate Discrepancy • Standard Verification',
      };
    }
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      pill: 'bg-emerald-600 text-white',
      ring: 'stroke-emerald-600',
      label: 'LOW RISK',
      sub: 'Prime Commercial Grade • Discounting Approved',
    };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{severity}</span>;
    }
  };

  // Metrics summary
  const totalAnalyzed = history.length;
  const lowRiskCount = history.filter((h) => h.riskScore < 25).length;
  const mediumRiskCount = history.filter((h) => h.riskScore >= 25 && h.riskScore < 50).length;
  const highCriticalCount = history.filter((h) => h.riskScore >= 50).length;

  const currentTheme = currentAssessment ? getScoreTheme(currentAssessment.riskScore) : getScoreTheme(0);
  const selectedInvoice = authorizedInvoices.find((i) => i.id === selectedInvoiceId);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Cards */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-softGray-border shadow-sm">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-royal/10 text-royal rounded-lg">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy flex items-center gap-2">
                AI-Powered Invoice Risk Engine
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  DRUNIX Verified
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic multi-party rule validation & Google Gemini 2.5 Flash underwriting synthesis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => setShowMethodologyModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-royal bg-royal/5 border border-royal/20 rounded-lg hover:bg-royal/10 transition-colors flex items-center space-x-1.5"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Explainable Scoring Model</span>
          </button>
          <button
            onClick={() => {
              fetchAssessments();
              if (onRefreshData) onRefreshData();
            }}
            disabled={isLoadingHistory}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {(currentPersona.role === 'SUPPLIER' || currentPersona.role === 'BUYER') && (
        <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center space-x-2.5">
            <Lock className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              <strong>Role Access Filter Active:</strong> As a <strong>{currentPersona.role}</strong> ({currentPersona.org}), risk assessments are strictly isolated to your own registered invoices and payables. Consortium-wide portfolio underwriting is restricted to Financiers and Auditors.
            </span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-softGray-border shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Assessed</div>
          <div className="text-2xl font-bold text-navy mt-1">{totalAnalyzed}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <FileText className="h-3 w-3 text-slate-400" />
            <span>On-chain invoices</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-softGray-border shadow-sm">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Prime (Low Risk)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{lowRiskCount}</div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span>Score: 0 - 24</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-softGray-border shadow-sm">
          <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Moderate Caution</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{mediumRiskCount}</div>
          <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span>Score: 25 - 49</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-softGray-border shadow-sm">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Elevated / Critical</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{highCriticalCount}</div>
          <div className="text-[11px] text-rose-700 mt-1 flex items-center gap-1">
            <AlertOctagon className="h-3 w-3 text-rose-600" />
            <span>Score: 50 - 100</span>
          </div>
        </div>
      </div>

      {/* Analysis Trigger & Action Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-softGray-border shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Invoice for Multi-Party Risk Analysis
            </label>
            <div className="relative">
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal transition-all"
              >
                {authorizedInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — {inv.supplierOrg} → {inv.buyerOrg} (₹{inv.amount.toLocaleString('en-IN')}) [{inv.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleRunAnalysis()}
              disabled={isAnalyzing || !selectedInvoiceId}
              className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all flex items-center space-x-2 shadow-sm ${
                isAnalyzing
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-royal hover:bg-royal-hover active:scale-95'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Evaluating Risk Factors...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Execute Risk Assessment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 font-bold hover:text-rose-700">✕</button>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 font-bold hover:text-emerald-700">✕</button>
          </div>
        )}
      </div>

      {/* Main Analysis Display Panel */}
      {currentAssessment ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Risk Score Card (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 rounded-xl border bg-white shadow-sm ${currentTheme.border}`}>
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Calculated Risk Index
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${currentTheme.pill}`}>
                  {currentAssessment.riskLevel}
                </span>
              </div>

              {/* Gauge & Score Number */}
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center relative">
                  <div className={`w-36 h-36 rounded-full border-8 flex flex-col items-center justify-center ${currentTheme.bg} ${currentTheme.border}`}>
                    <span className={`text-4xl font-extrabold font-mono ${currentTheme.text}`}>
                      {currentAssessment.riskScore}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                </div>

                <div className={`mt-3 font-bold text-sm ${currentTheme.text}`}>
                  {currentTheme.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 px-4">
                  {currentTheme.sub}
                </div>
              </div>

              {/* Key Invoice Summary Metadata */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Reference:</span>
                  <span className="font-mono font-bold text-navy">{currentAssessment.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Receivable Amount:</span>
                  <span className="font-bold text-navy">₹{currentAssessment.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Supplier:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[170px]">{currentAssessment.supplierOrg}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buyer:</span>
                  <span className="font-medium text-slate-700 truncate max-w-[170px]">{currentAssessment.buyerOrg}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Evaluation Timestamp:</span>
                  <span className="text-slate-600">{new Date(currentAssessment.analyzedAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Analyst / Agent:</span>
                  <span className="font-mono text-slate-600">{currentAssessment.analyzedBy}</span>
                </div>
              </div>

              {/* DRUNIX Ledger Proof Verification Card */}
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1 font-mono">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
                  <span>DRUNIX Blockchain Proof</span>
                  <span className="text-emerald-600 font-bold">Consensus Verified</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Block Height:</span>
                  <span className="font-bold text-navy">#{currentAssessment.evidence.drunixProof.blockNumber}</span>
                </div>
                <div className="flex justify-between text-slate-600 truncate">
                  <span>Tx Hash:</span>
                  <span className="text-royal truncate ml-2">{currentAssessment.evidence.drunixProof.txId}</span>
                </div>
              </div>
            </div>

            {/* Quick Underwriting Action Recommendation */}
            <div className={`p-4 rounded-xl border ${currentTheme.bg} ${currentTheme.border}`}>
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider mb-1.5">
                <ShieldCheck className="h-4 w-4 text-navy" />
                <span className="text-navy">Recommended Underwriting Action</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {currentAssessment.recommendedAction}
              </p>
            </div>
          </div>

          {/* Right Column: Factors & Gemini Explanation (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Google Gemini Natural Language Underwriting Synthesis Card */}
            <div className="bg-gradient-to-br from-white to-royal/5 p-6 rounded-xl border border-royal/20 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-royal/10 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-royal text-white rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-navy">
                    Google Gemini 2.5 Flash Underwriting Synthesis
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-royal/10 text-royal font-bold border border-royal/20">
                  Zod-Validated Schema
                </span>
              </div>

              {/* Executive Summary */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Executive Brief
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/70 p-3 rounded-lg border border-slate-200/60">
                  {currentAssessment.explanation.executiveSummary}
                </p>
              </div>

              {/* Key Observations */}
              <div className="mb-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Key Observations
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentAssessment.explanation.keyObservations.map((obs, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/80 rounded-lg border border-slate-200/70 text-xs text-slate-700 flex items-start space-x-2"
                    >
                      <div className="mt-0.5 text-royal shrink-0">•</div>
                      <span className="leading-snug">{obs}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Underwriting Credit Assessment */}
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Credit Risk Assessment
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-200/60">
                  {currentAssessment.explanation.underwritingAssessment}
                </p>
              </div>
            </div>

            {/* Detected Risk Factors & Evidence Breakdown */}
            <div className="bg-white p-6 rounded-xl border border-softGray-border shadow-sm">
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-navy" />
                  <h3 className="text-sm font-bold text-navy">
                    Deterministic Risk Factor Breakdown ({currentAssessment.detectedFactors.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Cumulative Score Impact: <strong>+{currentAssessment.riskScore} pts</strong>
                </span>
              </div>

              {currentAssessment.detectedFactors.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  No risk factors detected. Commercial parameters fully reconciled.
                </div>
              ) : (
                <div className="space-y-3">
                  {currentAssessment.detectedFactors.map((factor) => {
                    const isMitigant = factor.scoreImpact < 0;
                    return (
                      <div
                        key={factor.id}
                        className={`p-4 rounded-lg border transition-all ${
                          isMitigant
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : factor.severity === 'CRITICAL'
                            ? 'bg-rose-50/40 border-rose-200'
                            : factor.severity === 'HIGH'
                            ? 'bg-orange-50/30 border-orange-200'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              {getSeverityBadge(factor.severity)}
                              <span className="text-xs font-bold text-navy">
                                {factor.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {factor.description}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                                isMitigant
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : factor.scoreImpact >= 20
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {factor.scoreImpact > 0 ? `+${factor.scoreImpact}` : factor.scoreImpact} pts
                            </span>
                          </div>
                        </div>

                        {/* Evidence Sub-Snippet */}
                        {factor.evidence && Object.keys(factor.evidence).length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] font-mono text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                            {Object.entries(factor.evidence).map(([k, v]) => (
                              <span key={k}>
                                <strong className="text-slate-600">{k}:</strong>{' '}
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-softGray-border">
          <Info className="h-8 w-8 text-royal mx-auto mb-2" />
          <h4 className="text-sm font-bold text-navy">No Assessment Loaded</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Select an invoice from the dropdown above and click "Execute Risk Assessment" to run the deterministic checks and Gemini underwriting analysis.
          </p>
        </div>
      )}

      {/* Assessment History Table */}
      <div className="bg-white rounded-xl border border-softGray-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-softGray-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-navy">Recent Risk Evaluations</h3>
            <p className="text-xs text-slate-500">Historical underwriting assessments recorded in this session</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {history.length} assessments
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">ID / Reference</th>
                <th className="px-6 py-3">Parties</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Score & Level</th>
                <th className="px-6 py-3">Factors</th>
                <th className="px-6 py-3">Evaluated At</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {history.map((item) => {
                const itemTheme = getScoreTheme(item.riskScore);
                const isSelected = currentAssessment?.id === item.id;
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-royal/5 font-medium' : ''
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="font-mono font-bold text-navy">{item.invoiceNumber}</div>
                      <div className="text-[10px] text-slate-400">{item.id}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-slate-800 truncate max-w-[200px]">{item.supplierOrg}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">→ {item.buyerOrg}</div>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-navy">
                      ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold text-sm ${itemTheme.text}`}>
                          {item.riskScore}/100
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${itemTheme.pill}`}>
                          {item.riskLevel}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.detectedFactors.length} factors
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(item.analyzedAt).toLocaleDateString()} {new Date(item.analyzedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setCurrentAssessment(item);
                          setSelectedInvoiceId(item.invoiceId);
                        }}
                        className="px-3 py-1 bg-royal/10 text-royal hover:bg-royal hover:text-white rounded text-xs font-semibold transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explainable Scoring Methodology Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-royal/10 text-royal rounded-lg">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-navy">
                    Explainable Risk Scoring Methodology
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transparent mathematical rule weights & validation logic
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-bold text-navy mb-1">Scoring Framework (0 to 100 Index)</h4>
                <p className="text-slate-600 leading-relaxed">
                  Every receivable evaluated on InvoiceNet begins with a baseline score of 0. Risk factors apply positive penalty points, while cryptographic endorsements apply credit mitigant reductions. The final score is bounded strictly between 0 and 100.
                </p>
              </div>

              {/* Brackets */}
              <div>
                <h4 className="font-bold text-navy mb-2 uppercase tracking-wider text-[11px]">Risk Brackets & Operational Outcomes</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="font-bold text-emerald-800">LOW (0 - 24):</span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Prime trade receivable. Approved for automated discounting advance.</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="font-bold text-amber-800">MEDIUM (25 - 49):</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">Minor parameter variance. Standard delivery confirmation required.</p>
                  </div>
                  <div className="p-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="font-bold text-orange-800">HIGH (50 - 74):</span>
                    <p className="text-[11px] text-orange-700 mt-0.5">Elevated risk. PO discrepancy or volume spike. Enhanced diligence.</p>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="font-bold text-rose-800">CRITICAL (75 - 100):</span>
                    <p className="text-[11px] text-rose-700 mt-0.5">Collision or date paradox detected. Hold all financing and escalate.</p>
                  </div>
                </div>
              </div>

              {/* Exact Rules Table */}
              <div>
                <h4 className="font-bold text-navy mb-2 uppercase tracking-wider text-[11px]">Deterministic Rules & Point Impact</h4>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between p-2 bg-rose-50/60 rounded border border-rose-200">
                    <span>Duplicate Invoice Reference Collision</span>
                    <span className="font-bold text-rose-700">+45 pts (CRITICAL)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-rose-50/60 rounded border border-rose-200">
                    <span>Duplicate Cryptographic SHA-256 Hash</span>
                    <span className="font-bold text-rose-700">+45 pts (CRITICAL)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-orange-50/60 rounded border border-orange-200">
                    <span>Statistical Amount Outlier (&gt;2.5σ or &gt;3.5x baseline)</span>
                    <span className="font-bold text-orange-700">+20 pts (HIGH)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-orange-50/60 rounded border border-orange-200">
                    <span>Commercial Date Paradox (Due Date &lt; Issue Date)</span>
                    <span className="font-bold text-orange-700">+20 pts (HIGH)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-orange-50/60 rounded border border-orange-200">
                    <span>Purchase Order Discrepancy (&gt;5% Value Variance)</span>
                    <span className="font-bold text-orange-700">+20 pts (HIGH)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-amber-50/60 rounded border border-amber-200">
                    <span>Unverified PO Reference (Not in ERP Catalog)</span>
                    <span className="font-bold text-amber-700">+15 pts (MEDIUM)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-amber-50/60 rounded border border-amber-200">
                    <span>Abnormal Payment Terms (&gt;180 Days Tenor)</span>
                    <span className="font-bold text-amber-700">+15 pts (MEDIUM)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-100 rounded border border-slate-200">
                    <span>Missing Purchase Order Linkage</span>
                    <span className="font-bold text-slate-700">+10 pts (LOW)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-100 rounded border border-slate-200">
                    <span>Pending BuyerMSP Acceptance (Draft State)</span>
                    <span className="font-bold text-slate-700">+10 pts (LOW)</span>
                  </div>
                  <div className="flex justify-between p-2 bg-emerald-50 rounded border border-emerald-300">
                    <span>BuyerMSP Cryptographic Endorsement Verified</span>
                    <span className="font-bold text-emerald-700">-10 pts (MITIGANT BONUS)</span>
                  </div>
                </div>
              </div>

              {/* AI Guardrails Disclaimer */}
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <Sparkles className="h-3.5 w-3.5 text-royal" />
                  <span>AI Guardrails & Zero-Hallucination Policy</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Google Gemini 2.5 Flash is strictly restricted to qualitative synthesis of deterministic findings. The LLM cannot modify the mathematical risk score, fabricate missing invoice records, or execute binding financing decisions.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-2 bg-royal text-white text-xs font-bold rounded-lg hover:bg-royal-hover transition-colors"
              >
                Close Model Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
