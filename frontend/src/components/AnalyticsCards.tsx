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
      {/* Metric 1 */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Capital Unlocked</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          ₹{(metrics.totalFinancedINR / 100000).toFixed(2)} <span className="text-sm font-normal text-slate-400">Lakh</span>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mt-2 font-medium">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span>Instant liquidity to MSMEs</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">DRUNIX Financing APR</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingDown className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-emerald-400 tracking-tight">
          {metrics.averageDiscountRateAPR}% <span className="text-xs font-normal text-slate-400 line-through">22.0%</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-emerald-400 mt-2 font-medium">
          <Zap className="h-3.5 w-3.5" />
          <span>Save ~11% APR in capital costs</span>
        </div>
      </div>

      {/* Metric 3 */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Funding Turnaround</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {metrics.averageFundingTurnaroundHours} <span className="text-sm font-normal text-slate-400">Hours</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-indigo-300 mt-2">
          <span>vs 21 days traditional factoring</span>
        </div>
      </div>

      {/* Metric 4 */}
      <div className="p-5 rounded-2xl glass-card border border-slate-800 relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Double-Financing Rate</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-cyan-400 tracking-tight font-mono">
          0.00%
        </div>
        <div className="flex items-center space-x-1 text-xs text-slate-400 mt-2">
          <span>Enforced by DRUNIX ledger consensus</span>
        </div>
      </div>
    </div>
  );
};
