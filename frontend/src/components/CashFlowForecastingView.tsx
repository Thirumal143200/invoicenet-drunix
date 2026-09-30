import React, { useState, useEffect } from 'react';
import {
  UserPersona,
  CashFlowForecastResult,
  ForecastScenario,
  ForecastBucket,
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
} from 'lucide-react';

interface CashFlowForecastingViewProps {
  currentPersona: UserPersona;
  onInspectInvoiceProof?: (invoiceId: string) => void;
}

export const CashFlowForecastingView: React.FC<CashFlowForecastingViewProps> = ({
  currentPersona,
  onInspectInvoiceProof,
}) => {
  const [forecast, setForecast] = useState<CashFlowForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<ForecastScenario>('BASELINE');
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Filters
  const [filterBuyer, setFilterBuyer] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchForecast = async (scenarioToFetch: ForecastScenario = activeScenario) => {
    try {
      setLoading(true);
      const headers = {
        'x-user-role': currentPersona.role,
        'x-user-id': currentPersona.name,
        'x-user-org': currentPersona.org,
      };

      const params = new URLSearchParams({
        scenario: scenarioToFetch,
        buyer: filterBuyer,
        status: filterStatus,
      });

      const res = await fetch(`/api/cashflow/forecast?${params.toString()}`, { headers });
      const data = await res.json();

      if (data.success && data.data) {
        setForecast(data.data);
      }
    } catch (err) {
      console.error('Failed to load cash flow forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(activeScenario);
  }, [currentPersona, activeScenario, filterBuyer, filterStatus]);

  const handleScenarioChange = (newScenario: ForecastScenario) => {
    setActiveScenario(newScenario);
  };

  const isSupplier = currentPersona.role === 'SUPPLIER';
  const isBuyer = currentPersona.role === 'BUYER';

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-navy via-slate-900 to-royal text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-lg bg-royal/80 border border-royal-border flex items-center justify-center text-white shadow-inner">
            <TrendingUp className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                AI Cash-Flow Forecasting & Liquidity Runway
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                DRUNIX Grounded
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isSupplier
                ? 'Predictive receivables cash-inflow modeling, dynamic discounting & DRUNIX factoring acceleration'
                : isBuyer
                ? 'Projected payables cash-outflow commitments and dynamic early settlement optimization'
                : 'Consortium-wide liquidity distribution, counter-party lag index & credit maturity matrix'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMethodologyModal(true)}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all border border-white/20 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-sky-300" />
            <span>Methodology</span>
          </button>

          <button
            onClick={() => fetchForecast()}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Refresh forecast"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>{isBuyer ? 'Total Commitments' : 'Total Outstanding'}</span>
            <DollarSign className="h-4 w-4 text-royal" />
          </div>
          <div className="text-2xl font-bold font-mono text-navy mt-1">
            ₹{forecast?.metrics.totalOutstanding.toLocaleString('en-IN') ?? '0'}
          </div>
          <div className="text-[11px] text-slate-500">
            {isBuyer ? 'Payable trade obligations' : 'Unsettled active receivables'}
          </div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1">
          <div className="text-xs font-semibold text-royal flex items-center justify-between">
            <span>Next 30-Day Liquidity</span>
            <Calendar className="h-4 w-4 text-royal" />
          </div>
          <div className="text-2xl font-bold font-mono text-royal mt-1">
            ₹{forecast?.horizonSummary.next30Days.toLocaleString('en-IN') ?? '0'}
          </div>
          <div className="text-[11px] text-slate-500">
            Projected 30-day cash turnover
          </div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1 border-rose-200">
          <div className="text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>Overdue Receivables</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
            ₹{forecast?.metrics.totalOverdue.toLocaleString('en-IN') ?? '0'}
          </div>
          <div className="text-[11px] text-slate-500">
            {forecast?.metrics.overdueCount ?? 0} invoice(s) past maturity
          </div>
        </div>

        <div className="p-4 rounded-xl enterprise-card bg-white space-y-1 border-emerald-200">
          <div className="text-xs font-semibold text-emerald flex items-center justify-between">
            <span>DRUNIX Instant Liquidity</span>
            <Zap className="h-4 w-4 text-emerald" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald mt-1">
            ₹{forecast?.metrics.acceleratedLiquidityPotentialINR.toLocaleString('en-IN') ?? '0'}
          </div>
          <div className="text-[11px] text-slate-500">
            Advanceable at 11.0% APR within 3.5h
          </div>
        </div>
      </div>

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
          {forecast?.timelineBuckets.map((bucket, idx) => {
            const maxVal = forecast.horizonSummary.next90Days || 1;
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
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200" title="Rule-based contractual due-date projection (insufficient historical data for statistical adjustment)">
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
            ₹{forecast?.horizonSummary.next90Days.toLocaleString('en-IN') ?? '0'}
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
          {forecast?.geminiInsightsBrief}
        </div>
      </div>

      {/* Overdue Receivables Table */}
      {forecast?.overdueInvoices && forecast.overdueInvoices.length > 0 && (
        <div className="enterprise-card bg-white overflow-hidden shadow-xs rounded-xl">
          <div className="px-5 py-3 border-b border-softGray-border bg-rose-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Overdue Receivables Requiring Action
              </span>
              <span className="text-xs font-mono font-bold">
                ({forecast.overdueInvoices.length})
              </span>
            </div>
            <span className="text-[11px] text-rose-700 font-semibold">
              Action recommended to maintain cash flow velocity
            </span>
          </div>

          <div className="divide-y divide-softGray-border">
            {forecast.overdueInvoices.map((item) => (
              <div
                key={item.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-navy">{item.invoiceNumber}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      {item.daysOverdue} days overdue
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Due: {item.dueDate.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Counter-party: <strong className="text-navy">{item.counterParty}</strong>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="font-mono font-bold text-rose-600 text-sm">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </div>
                  {onInspectInvoiceProof && (
                    <button
                      onClick={() => onInspectInvoiceProof(item.id)}
                      className="px-2.5 py-1 rounded bg-white border border-softGray-border hover:bg-softGray text-royal font-semibold text-[11px] flex items-center space-x-1"
                    >
                      <span>Proof</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Transparency Modal */}
      {showMethodologyModal && forecast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
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
                className="p-1 rounded-md text-slate-400 hover:text-navy"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <span className="font-bold text-navy block mb-0.5">Calculation Approach:</span>
                <p>{forecast.methodologyExplanation.approach}</p>
              </div>

              <div className="p-3 rounded-lg bg-softGray border border-softGray-border space-y-1">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Historical Settlement Sample:</span>
                  <span className="font-mono font-bold text-navy">
                    {forecast.methodologyExplanation.buyerSampleCount} settled invoices
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Historical Lag Parameter:</span>
                  <span className="font-mono font-bold text-navy">
                    +{forecast.metrics.averageSettlementLagDays} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Statistical Adjustment Applied:</span>
                  <span className="font-bold text-emerald">
                    {forecast.methodologyExplanation.historicalDataUsed ? 'Yes (Empirical)' : 'No (Contractual Fallback)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-navy block mb-1">Key Operational Notes:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {forecast.methodologyExplanation.notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-2 border-t border-softGray-border flex justify-end">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-4 py-1.5 rounded-lg bg-royal text-white font-semibold text-xs hover:bg-royal-hover transition-colors"
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
