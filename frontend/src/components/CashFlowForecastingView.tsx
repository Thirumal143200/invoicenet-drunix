import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPersona,
  CashFlowForecastResult,
  ForecastScenario,
  PaymentForecastResult,
  PredictedPaymentItem,
  DailyCashFlowPoint,
} from '../types';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle,
  Zap,
  Clock,
  Sparkles,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowRight,
  Check,
} from 'lucide-react';

interface CashFlowForecastingViewProps {
  currentPersona: UserPersona;
  onInspectInvoiceProof?: (invoiceId: string) => void;
}

export const CashFlowForecastingView: React.FC<CashFlowForecastingViewProps> = ({
  currentPersona,
  onInspectInvoiceProof,
}) => {
  // Navigation between the 30-day payment forecast and the scenario simulation
  const [activeSubTab, setActiveSubTab] = useState<'PAYMENT_FORECAST' | 'SCENARIO_RUNWAY'>('PAYMENT_FORECAST');

  // Payment Forecast (30-day daily cash flow chart and invoice predictions)
  const [paymentForecast, setPaymentForecast] = useState<PaymentForecastResult | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Scenario Runway State (Macro 7-30-90 day buckets and Gemini analysis)
  const [macroForecast, setMacroForecast] = useState<CashFlowForecastResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<ForecastScenario>('BASELINE');
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Filters for Forecasted Payments Table
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ON_TIME' | 'POTENTIAL_LATE' | 'OVERDUE'>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | 'NEXT_7_DAYS' | 'NEXT_14_DAYS' | 'NEXT_30_DAYS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Payment Prediction & 30-Day Timeline
  const fetchPaymentForecast = async () => {
    try {
      setLoadingForecast(true);
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'x-user-role': currentPersona.role,
        'x-user-id': currentPersona.name,
        'x-user-org': currentPersona.org,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if (directionFilter !== 'ALL') params.append('direction', directionFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (dateRangePreset !== 'ALL') params.append('dateRange', dateRangePreset);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/cashflow/payment-forecast?${params.toString()}`, { headers });
      const data = await res.json();

      if (data.success && data.data) {
        setPaymentForecast(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch payment forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  // Fetch Macro Scenario Runway
  const fetchMacroForecast = async (scenario: ForecastScenario = activeScenario) => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'x-user-role': currentPersona.role,
        'x-user-id': currentPersona.name,
        'x-user-org': currentPersona.org,
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({ scenario });
      const res = await fetch(`/api/cashflow/forecast?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.success && data.data) {
        setMacroForecast(data.data);
      }
    } catch (err) {
      console.error('Failed to load macro scenario forecast:', err);
    }
  };

  useEffect(() => {
    fetchPaymentForecast();
    fetchMacroForecast(activeScenario);
  }, [currentPersona, directionFilter, statusFilter, dateRangePreset, searchQuery]);

  const handleScenarioChange = (newScenario: ForecastScenario) => {
    setActiveScenario(newScenario);
    fetchMacroForecast(newScenario);
  };

  const isSupplier = currentPersona.role === 'SUPPLIER';
  const isBuyer = currentPersona.role === 'BUYER';
  const isFinancier = currentPersona.role === 'FINANCIER';

  // 30-Day chart calculations
  const chartMaxAmount = useMemo(() => {
    if (!paymentForecast?.dailyTimeline30Days) return 100000;
    let maxVal = 0;
    for (const pt of paymentForecast.dailyTimeline30Days) {
      maxVal = Math.max(maxVal, pt.incomingAmount, pt.outgoingAmount, Math.abs(pt.netAmount));
    }
    return maxVal > 0 ? maxVal : 100000;
  }, [paymentForecast?.dailyTimeline30Days]);

  const selectedDayPoint = useMemo(() => {
    if (selectedDayIndex === null || !paymentForecast?.dailyTimeline30Days) return null;
    return paymentForecast.dailyTimeline30Days[selectedDayIndex] || null;
  }, [selectedDayIndex, paymentForecast?.dailyTimeline30Days]);

  // Filtered late payments for highlight box
  const potentialLatePayments = useMemo(() => {
    if (!paymentForecast?.predictedPayments) return [];
    return paymentForecast.predictedPayments.filter((p) => p.isPotentialLate && p.status !== 'SETTLED');
  }, [paymentForecast?.predictedPayments]);

  const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-navy via-slate-900 to-royal text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-royal/80 border border-royal-border flex items-center justify-center text-white shadow-inner flex-shrink-0">
            <TrendingUp className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                AI Payment Prediction & 30-Day Cash Flow Forecasting
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                DRUNIX DLT Verified
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {isSupplier
                ? 'Empirical buyer settlement lag analysis, expected settlement dates, overdue risk factors & 30-day liquidity inflows.'
                : isBuyer
                ? 'Scheduled payable obligations, cash-outflow timing, supplier dispute mitigants & early settlement discounts.'
                : 'Consortium-wide settlement predictions, underwritten portfolio cash flow curves & repayment schedules.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setShowMethodologyModal(true)}
            aria-label="View prediction methodology and transparency"
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all border border-white/20 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-sky-300" />
            <span>Methodology</span>
          </button>

          <button
            onClick={() => {
              fetchPaymentForecast();
              fetchMacroForecast();
            }}
            aria-label="Refresh payment forecasts"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh forecast data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Sub-Tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-softGray-border pb-1">
        <button
          onClick={() => setActiveSubTab('PAYMENT_FORECAST')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'PAYMENT_FORECAST'
              ? 'bg-royal text-white shadow-xs'
              : 'text-slate-600 hover:text-navy hover:bg-softGray'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>30-Day Daily Cash Flow & Payment Predictions</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SCENARIO_RUNWAY')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 cursor-pointer ${
            activeSubTab === 'SCENARIO_RUNWAY'
              ? 'bg-royal text-white shadow-xs'
              : 'text-slate-600 hover:text-navy hover:bg-softGray'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Macro Scenario Runway & Gemini Synthesis</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: 30-DAY CASH FLOW CHART & PAYMENT PREDICTIONS DASHBOARD         */}
      {/* ========================================================================= */}
      {activeSubTab === 'PAYMENT_FORECAST' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>30-Day Inflows</span>
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-1">
                {formatINR(paymentForecast?.summary.totalForecastedIncoming30d ?? 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                Forecasted incoming cash
              </div>
            </div>

            <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                <span>30-Day Outflows</span>
                <ArrowDownRight className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 mt-1">
                {formatINR(paymentForecast?.summary.totalForecastedOutgoing30d ?? 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                Forecasted outgoing cash
              </div>
            </div>

            <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
              <div className="text-xs font-semibold text-royal flex items-center justify-between">
                <span>Net 30-Day Cash</span>
                <DollarSign className="h-4 w-4 text-royal" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-royal mt-1">
                {formatINR(paymentForecast?.summary.netCashFlow30d ?? 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                Net operational cash runway
              </div>
            </div>

            <div className="p-4 rounded-xl enterprise-card bg-white space-y-1 border-rose-200">
              <div className="text-xs font-semibold text-rose-700 flex items-center justify-between">
                <span>At-Risk / Late</span>
                <AlertTriangle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 mt-1">
                {formatINR(paymentForecast?.summary.totalAtRiskAmount ?? 0)}
              </div>
              <div className="text-[11px] text-slate-500">
                {paymentForecast?.summary.potentialLateInvoicesCount ?? 0} invoice(s) delayed
              </div>
            </div>

            <div className="p-4 rounded-xl enterprise-card bg-white space-y-1 border-blue-200 col-span-2 lg:col-span-1">
              <div className="text-xs font-semibold text-navy flex items-center justify-between">
                <span>Settlement Velocity</span>
                <ShieldCheck className="h-4 w-4 text-royal" />
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-navy mt-1">
                {paymentForecast?.summary.overallOnTimeRate ?? 100}%
              </div>
              <div className="text-[11px] text-slate-500">
                Estimated on-time probability
              </div>
            </div>
          </div>

          {/* 30-DAY DAILY CASH FLOW INTERACTIVE CHART */}
          <div className="enterprise-card bg-white p-6 rounded-2xl space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-softGray-border">
              <div>
                <h3 className="text-sm font-bold text-navy flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-royal" />
                  <span>30-Day Daily Cash Flow & Settlement Projection Chart</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily forecasted cash inflows and outflows mapped from expected payment dates with cumulative liquidity curve
                </p>
              </div>

              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1.5">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block"></span>
                  <span className="text-slate-600 font-medium">Incoming Inflow</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-3 w-3 rounded-sm bg-amber-500 inline-block"></span>
                  <span className="text-slate-600 font-medium">Outgoing Outflow</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="h-0.5 w-4 bg-royal inline-block"></span>
                  <span className="text-royal font-semibold">Cumulative Net</span>
                </span>
              </div>
            </div>

            {/* Interactive Daily Bar Visualizer */}
            <div className="relative pt-4 pb-2">
              <div
                className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1.5 items-end h-56 px-1 border-b border-slate-200"
                role="region"
                aria-label="30-day cash flow bar chart"
              >
                {paymentForecast?.dailyTimeline30Days.map((pt, idx) => {
                  const incomingHeight = Math.min(100, Math.round((pt.incomingAmount / chartMaxAmount) * 100));
                  const outgoingHeight = Math.min(100, Math.round((pt.outgoingAmount / chartMaxAmount) * 100));
                  const hasActivity = pt.incomingAmount > 0 || pt.outgoingAmount > 0;
                  const isSelected = selectedDayIndex === idx;

                  return (
                    <button
                      key={pt.date}
                      type="button"
                      onClick={() => setSelectedDayIndex(isSelected ? null : idx)}
                      aria-label={`${pt.dayLabel}: Incoming ₹${pt.incomingAmount}, Outgoing ₹${pt.outgoingAmount}, Net ₹${pt.netAmount}`}
                      className={`flex flex-col items-center justify-end h-full w-full rounded-t-md transition-all group relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-royal ${
                        isSelected ? 'bg-royal/10 ring-1 ring-royal' : 'hover:bg-slate-100/80'
                      }`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                        <div className="bg-navy text-white text-[10px] rounded-lg py-1.5 px-2.5 shadow-lg whitespace-nowrap font-mono space-y-0.5">
                          <div className="font-bold text-royal-light font-sans">{pt.dayLabel} ({pt.dayOfWeek})</div>
                          {pt.incomingAmount > 0 && <div className="text-emerald-400">+{formatINR(pt.incomingAmount)} in</div>}
                          {pt.outgoingAmount > 0 && <div className="text-amber-400">-{formatINR(pt.outgoingAmount)} out</div>}
                          <div className="text-slate-300 border-t border-slate-700 pt-0.5">Cum: {formatINR(pt.cumulativeCashFlow)}</div>
                          <div className="text-[9px] text-slate-400 font-sans">{pt.transactionsCount} settlement(s)</div>
                        </div>
                        <div className="w-2 h-2 bg-navy rotate-45 -mt-1"></div>
                      </div>

                      {/* Bar stacks */}
                      <div className="w-full flex items-end justify-center space-x-0.5 px-0.5 h-full">
                        {/* Incoming Bar */}
                        <div
                          style={{ height: `${Math.max(incomingHeight > 0 ? 6 : 0, incomingHeight)}%` }}
                          className={`w-full max-w-[12px] bg-emerald-500 rounded-t-sm transition-all duration-300 ${
                            isSelected ? 'bg-emerald-600 brightness-110' : 'group-hover:bg-emerald-600'
                          }`}
                        />
                        {/* Outgoing Bar */}
                        <div
                          style={{ height: `${Math.max(outgoingHeight > 0 ? 6 : 0, outgoingHeight)}%` }}
                          className={`w-full max-w-[12px] bg-amber-500 rounded-t-sm transition-all duration-300 ${
                            isSelected ? 'bg-amber-600 brightness-110' : 'group-hover:bg-amber-600'
                          }`}
                        />
                      </div>

                      {/* Bottom Date Indicator */}
                      <div className="mt-1.5 text-[9px] font-mono font-medium text-slate-500 truncate w-full text-center">
                        {pt.date.slice(8, 10)}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Day Labels Axis */}
              <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-2 px-1">
                <span>Today ({paymentForecast?.dailyTimeline30Days[0]?.dayLabel || 'Day 0'})</span>
                <span>Day +15</span>
                <span>Day +30 ({paymentForecast?.dailyTimeline30Days[30]?.dayLabel || 'Day 30'})</span>
              </div>
            </div>

            {/* Selected Day Inspector */}
            {selectedDayPoint && (
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 animate-in fade-in duration-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-royal" />
                    <span className="text-xs font-bold text-navy">
                      Detailed Forecast for {selectedDayPoint.dayLabel} ({selectedDayPoint.dayOfWeek}) - Day +{selectedDayPoint.dayIndex}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-emerald-700 font-bold">In: +{formatINR(selectedDayPoint.incomingAmount)}</span>
                    <span className="text-amber-700 font-bold">Out: -{formatINR(selectedDayPoint.outgoingAmount)}</span>
                    <span className="text-royal font-bold">Net: {formatINR(selectedDayPoint.netAmount)}</span>
                  </div>
                </div>

                {selectedDayPoint.transactions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedDayPoint.transactions.map((tx) => (
                      <div key={tx.invoiceId} className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-navy">{tx.invoiceNumber}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                tx.direction === 'INCOMING'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {tx.direction}
                            </span>
                            {tx.isPotentialLate && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Late Risk
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{tx.counterParty}</div>
                        </div>
                        <div className="font-mono font-bold text-navy text-sm">
                          {formatINR(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    No individual trade maturities or settlement transactions scheduled for this date.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* POTENTIAL LATE PAYMENTS & EXPLAINABILITY FACTORS */}
          {potentialLatePayments.length > 0 && (
            <div className="enterprise-card bg-white rounded-2xl overflow-hidden shadow-xs border border-rose-200">
              <div className="px-6 py-4 bg-rose-50/70 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2.5 text-rose-900">
                  <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">
                      Potential Late Payments Detected ({potentialLatePayments.length})
                    </h3>
                    <p className="text-xs text-rose-700">
                      Invoices predicted to exceed contractual due date based on counterparty historical payment velocity
                    </p>
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-rose-700 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                  At-Risk: {formatINR(paymentForecast?.summary.totalAtRiskAmount ?? 0)}
                </div>
              </div>

              <div className="divide-y divide-softGray-border">
                {potentialLatePayments.map((item) => {
                  const isExpanded = expandedInvoiceId === item.id;
                  return (
                    <div key={item.id} className="p-5 space-y-3 hover:bg-slate-50/60 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-navy text-sm">{item.invoiceNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.riskLevel === 'CRITICAL'
                                  ? 'bg-rose-600 text-white'
                                  : item.riskLevel === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {item.riskLevel} Late Risk
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              +{item.predictedDelayDays}d Expected Delay
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">
                            Counterparty: <strong className="text-navy">{item.counterParty}</strong>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-xs text-slate-500">Contractual Due: {item.originalDueDate.slice(0, 10)}</div>
                            <div className="text-xs font-bold text-rose-600 font-mono">
                              Exp. Payment: {item.expectedPaymentDate.slice(0, 10)}
                            </div>
                          </div>
                          <div className="font-mono font-bold text-base text-navy">
                            {formatINR(item.amount)}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedInvoiceId(isExpanded ? null : item.id)}
                            className="p-1.5 rounded-lg bg-softGray hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Toggle prediction explainability factors"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Explainability Factors Breakdown */}
                      {isExpanded && (
                        <div className="p-4 rounded-xl bg-softGray/80 border border-softGray-border space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-navy flex items-center space-x-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-royal" />
                              <span>Prediction Explainability & Risk Attribution Factors</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              Confidence: {Math.round(item.confidenceScore * 100)}% ({item.isEstimated ? 'Contractual Estimate' : 'Empirical Model'})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {item.predictionFactors.map((fac, fIdx) => (
                              <div key={fIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{fac.factor}</span>
                                  <span className="font-mono font-semibold text-royal text-[11px] bg-blue-50 px-1.5 py-0.2 rounded">
                                    {fac.impact}
                                  </span>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed">{fac.description}</p>
                              </div>
                            ))}
                          </div>

                          {/* Recommended Action */}
                          <div className="p-3 bg-white rounded-lg border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center space-x-2 text-navy">
                              <Zap className="h-4 w-4 text-royal flex-shrink-0" />
                              <span><strong>Recommended Mitigation:</strong> {item.recommendedAction}</span>
                            </div>
                            {onInspectInvoiceProof && (
                              <button
                                onClick={() => onInspectInvoiceProof(item.id)}
                                className="px-2.5 py-1 rounded bg-royal text-white font-semibold text-[11px] hover:bg-royal-hover transition-colors flex items-center space-x-1 flex-shrink-0 cursor-pointer"
                              >
                                <span>Inspect Proof</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FORECASTED PAYMENTS LIST WITH COMPLETE FILTERS */}
          <div className="enterprise-card bg-white rounded-2xl shadow-xs overflow-hidden space-y-4 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-softGray-border">
              <div>
                <h3 className="text-sm font-bold text-navy flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-royal" />
                  <span>Forecasted Incoming & Outgoing Payments Ledger</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Expected settlement schedules with counterparty lag attribution and date filtering
                </p>
              </div>

              {/* Filter Controls Bar */}
              <div className="flex items-center flex-wrap gap-2">
                {/* Direction Filter */}
                <select
                  value={directionFilter}
                  onChange={(e) => setDirectionFilter(e.target.value as any)}
                  aria-label="Filter payment direction"
                  className="px-3 py-1.5 rounded-lg border border-softGray-border bg-softGray text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal cursor-pointer"
                >
                  <option value="ALL">All Directions</option>
                  <option value="INCOMING">Incoming (Inflows)</option>
                  <option value="OUTGOING">Outgoing (Outflows)</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  aria-label="Filter invoice status"
                  className="px-3 py-1.5 rounded-lg border border-softGray-border bg-softGray text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ON_TIME">On-Time</option>
                  <option value="POTENTIAL_LATE">Potential Late</option>
                  <option value="OVERDUE">Overdue</option>
                </select>

                {/* Date Horizon Preset */}
                <select
                  value={dateRangePreset}
                  onChange={(e) => setDateRangePreset(e.target.value as any)}
                  aria-label="Filter forecast date range"
                  className="px-3 py-1.5 rounded-lg border border-softGray-border bg-softGray text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal cursor-pointer"
                >
                  <option value="ALL">All Horizons</option>
                  <option value="NEXT_7_DAYS">Next 7 Days</option>
                  <option value="NEXT_14_DAYS">Next 14 Days</option>
                  <option value="NEXT_30_DAYS">Next 30 Days</option>
                </select>

                {/* Search Box */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search invoices by number or counterparty"
                    className="pl-8 pr-3 py-1.5 rounded-lg border border-softGray-border bg-softGray text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-royal w-36 sm:w-48"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs" aria-label="Forecasted payments table">
                <thead className="bg-softGray text-slate-600 uppercase tracking-wider font-bold border-b border-softGray-border">
                  <tr>
                    <th className="py-3 px-4">Invoice / Counterparty</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4">Contractual Due</th>
                    <th className="py-3 px-4">Predicted Payment</th>
                    <th className="py-3 px-4">Predicted Delay</th>
                    <th className="py-3 px-4">Risk & Model</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-softGray-border font-sans">
                  {paymentForecast?.predictedPayments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Invoice & Counterparty */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-navy text-xs">{item.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-500 font-sans mt-0.5 truncate max-w-[180px]">
                          {item.counterParty}
                        </div>
                      </td>

                      {/* Direction */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.direction === 'INCOMING'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.direction === 'INCOMING' ? 'Incoming (Inflow)' : 'Outgoing (Outflow)'}
                        </span>
                      </td>

                      {/* Contractual Due */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.originalDueDate.slice(0, 10)}
                      </td>

                      {/* Predicted Payment */}
                      <td className="py-3.5 px-4 font-mono font-bold text-navy">
                        {item.expectedPaymentDate.slice(0, 10)}
                      </td>

                      {/* Predicted Delay */}
                      <td className="py-3.5 px-4 font-mono">
                        {item.isOverdue ? (
                          <span className="text-rose-600 font-bold">Past Due ({item.predictedDelayDays}d)</span>
                        ) : item.predictedDelayDays > 0 ? (
                          <span className="text-amber-700 font-bold">+{item.predictedDelayDays}d delay</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">On-Time (0d)</span>
                        )}
                      </td>

                      {/* Risk & Model Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                              item.riskLevel === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : item.riskLevel === 'HIGH'
                                ? 'bg-rose-100 text-rose-800'
                                : item.riskLevel === 'MEDIUM'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.riskLevel}
                          </span>
                          {item.isEstimated && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                              title="Rule-based contractual estimate due to limited historical settlement records (N < 2)"
                            >
                              Estimate
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-navy text-sm">
                        {formatINR(item.amount)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {onInspectInvoiceProof && (
                          <button
                            onClick={() => onInspectInvoiceProof(item.id)}
                            className="px-2.5 py-1 rounded bg-white border border-softGray-border hover:bg-softGray text-royal font-semibold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Proof</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {paymentForecast?.predictedPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        No forecasted invoices match the current filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Methodology & Transparency Notice */}
            <div className="p-3.5 rounded-xl bg-softGray/80 border border-softGray-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Info className="h-4 w-4 text-royal flex-shrink-0" />
                <span>
                  <strong>Algorithm Transparency:</strong> {paymentForecast?.methodology.disclaimer}
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500 flex-shrink-0">
                Settlements Analyzed: {paymentForecast?.methodology.historicalSettlementsAnalyzed ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: MACRO SCENARIO SIMULATION & LIQUIDITY RUNWAY                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'SCENARIO_RUNWAY' && (
        <div className="space-y-6">
          {/* Scenario Analysis Selector */}
          <div className="p-4 rounded-xl enterprise-card bg-white space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                  Cash-Flow Scenario Simulation
                </h3>
                <p className="text-[11px] text-slate-500">
                  Toggle operational scenarios to observe dynamic working capital impacts
                </p>
              </div>

              <div className="flex items-center space-x-1.5 bg-softGray p-1 rounded-lg border border-softGray-border flex-wrap gap-y-1">
                {[
                  { id: 'BASELINE', label: 'Contractual Baseline', icon: Calendar },
                  { id: 'EARLY_PAYMENT', label: 'Early Settlement (-14d)', icon: ArrowUpRight },
                  { id: 'DELAYED_PAYMENT', label: '30-Day Delay Stress Test', icon: ArrowDownRight },
                  { id: 'DRUNIX_FINANCING', label: 'DRUNIX Instant Factoring', icon: Zap },
                ].map((sc) => {
                  const Icon = sc.icon;
                  const isSelected = activeScenario === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleScenarioChange(sc.id as ForecastScenario)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-royal text-white shadow-xs'
                          : 'text-slate-600 hover:text-navy hover:bg-slate-200/60'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{sc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Forecast Horizons Timeline Card */}
          <div className="enterprise-card bg-white p-6 space-y-5 rounded-xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-softGray-border">
              <div>
                <h3 className="text-sm font-bold text-navy flex items-center space-x-2">
                  <span>Forecast Horizon Timeline (7, 30, and 90 Days)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-royal font-semibold border border-blue-200">
                    Scenario: {activeScenario}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periodic cash inflow milestones with statistical confidence intervals
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <span className="h-3 w-3 rounded-sm bg-royal inline-block"></span>
                  <span>Expected</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="h-3 w-3 rounded-sm bg-blue-200 inline-block"></span>
                  <span>Confidence Band (±15%)</span>
                </span>
              </div>
            </div>

            {/* Timeline Horizon Bars */}
            <div className="space-y-4">
              {macroForecast?.timelineBuckets.map((bucket, idx) => {
                const maxVal = macroForecast.horizonSummary.next90Days || 1;
                const pct = Math.min(100, Math.round((bucket.expectedAmount / maxVal) * 100));

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-softGray/60 border border-softGray-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-navy">{bucket.periodLabel}</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          ({bucket.daysRange})
                        </span>
                        {bucket.isRuleBasedEstimate && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200"
                            title="Rule-based contractual due-date projection (insufficient historical data for statistical adjustment)"
                          >
                            Contractual Baseline
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-[11px] text-slate-500">
                          Invoices: <strong className="text-navy">{bucket.invoicesCount}</strong>
                        </span>
                        <span className="font-mono text-sm font-bold text-royal">
                          ₹{bucket.expectedAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Visual Horizon Bar */}
                    <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${Math.max(4, pct)}%` }}
                        className="h-full bg-gradient-to-r from-royal to-indigo-600 rounded-full transition-all duration-500"
                      ></div>
                    </div>

                    {/* Confidence Interval Info */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>
                        Conservative: <strong className="font-mono text-slate-700">₹{bucket.conservativeAmount.toLocaleString('en-IN')}</strong>
                      </span>
                      <span>
                        Confidence: <strong className="font-mono text-navy font-semibold">{Math.round(bucket.confidenceScore * 100)}%</strong>
                      </span>
                      <span>
                        Optimistic: <strong className="font-mono text-slate-700">₹{bucket.optimisticAmount.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Summary Row */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-navy">Aggregate 90-Day Liquidity Forecast: </span>
                <span className="text-slate-700">
                  Total projected cash turnover over the next quarter under the <strong>{activeScenario}</strong> scenario.
                </span>
              </div>
              <div className="font-mono font-bold text-base text-royal">
                ₹{macroForecast?.horizonSummary.next90Days.toLocaleString('en-IN') ?? '0'}
              </div>
            </div>
          </div>

          {/* Gemini Financial Insights Brief */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-navy text-white shadow-md space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
              <Sparkles className="h-4 w-4" />
              <span>Gemini Executive Financial Brief</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-300 font-semibold">
                Grounded Analysis
              </span>
            </div>

            <div className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line space-y-2">
              {macroForecast?.geminiInsightsBrief}
            </div>
          </div>
        </div>
      )}

      {/* Methodology Transparency Modal */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-softGray-border space-y-4">
            <div className="flex items-center justify-between border-b border-softGray-border pb-3">
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-royal" />
                <h3 className="text-sm font-bold text-navy">
                  Forecasting Methodology & Transparency
                </h3>
              </div>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-navy cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <span className="font-bold text-navy block mb-0.5">Calculation Approach:</span>
                <p>
                  {paymentForecast?.methodology.approach || macroForecast?.methodologyExplanation.approach}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-softGray border border-softGray-border space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Historical Settlement Records:</span>
                  <span className="font-mono font-bold text-navy">
                    {paymentForecast?.methodology.historicalSettlementsAnalyzed ?? 0} verified settlements
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Counterparty Lag Parameter:</span>
                  <span className="font-mono font-bold text-navy">
                    +{paymentForecast?.summary.averageCounterpartyLagDays ?? 2} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Empirical Adjustment Status:</span>
                  <span className="font-bold text-emerald">
                    {paymentForecast?.methodology.hasSufficientHistory ? 'Empirical Lag Adjustment' : 'Contractual Baseline (Sparse History N < 2)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-navy block mb-1">Key Operational & Compliance Notes:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li><strong>DRUNIX Multi-Party Endorsements:</strong> Invoices cryptographically signed on-chain by BuyerMSP receive high-confidence classification.</li>
                  <li><strong>No Fabricated Data Guarantee:</strong> If historical records for a buyer are fewer than 2 settlements, the engine transparently falls back to contractual maturity without claiming an AI model was trained.</li>
                  <li><strong>Tenant Isolation:</strong> Predictions are strictly isolated by enterprise identity. Non-admin roles never access counterparties' private trade commitments.</li>
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-softGray-border flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-royal text-white font-semibold text-xs hover:bg-royal-hover transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
