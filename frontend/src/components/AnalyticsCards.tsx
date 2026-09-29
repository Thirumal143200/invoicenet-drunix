import React from 'react';
import { AnalyticsMetrics } from '../types';
import { IndianRupee, TrendingDown, Clock, ShieldCheck, ArrowUpRight, Zap } from 'lucide-react';

interface AnalyticsCardsProps {
  metrics: AnalyticsMetrics | null;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Capital Unlocked */}
      <div className="p-5 enterprise-card">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Trapped Capital Unlocked</span>
          <div className="p-2 rounded-lg bg-blue-50 text-royal">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-navy tracking-tight">
          ₹{(metrics.totalFinancedINR / 100000).toFixed(2)} <span className="text-sm font-semibold text-slate-500">Lakh</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald font-semibold mt-2.5">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>Immediate liquidity for working capital</span>
        </div>
      </div>

      {/* Metric 2: APR Reduction */}
      <div className="p-5 enterprise-card">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">DRUNIX Factoring APR</span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald tracking-tight flex items-baseline space-x-2">
          <span>{metrics.averageDiscountRateAPR}%</span>
          <span className="text-xs font-medium text-slate-400 line-through">22.0% traditional</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-emerald font-semibold mt-2.5">
          <Zap className="h-3.5 w-3.5" />
          <span>~50% lower borrowing cost for MSMEs</span>
        </div>
      </div>

      {/* Metric 3: Funding Velocity */}
      <div className="p-5 enterprise-card">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Financing Turnaround</span>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-navy tracking-tight flex items-baseline space-x-1">
          <span>{metrics.averageFundingTurnaroundHours}</span>
          <span className="text-sm font-normal text-slate-500">Hours</span>
        </div>
        <div className="text-xs text-slate-500 mt-2.5">
          vs 14-21 business days in manual factoring
        </div>
      </div>

      {/* Metric 4: Double-Financing Fraud */}
      <div className="p-5 enterprise-card">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Double-Financing Rate</span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-navy tracking-tight font-mono">
          0.00%
        </div>
        <div className="text-xs text-slate-500 mt-2.5">
          Cryptographically prevented by DRUNIX ledger
        </div>
      </div>
    </div>
  );
};
