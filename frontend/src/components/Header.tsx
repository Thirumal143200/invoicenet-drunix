import React from 'react';
import { UserPersona } from '../types';
import { Plus, RefreshCw, ShieldAlert, Cpu, Sparkles, Bot } from 'lucide-react';

interface HeaderProps {
  currentPersona: UserPersona;
  activeTab: 'INVOICES' | 'NETWORK' | 'ANALYTICS' | 'FRAUD_CENTER' | 'CASH_FLOW' | 'RISK_ENGINE';
  blockHeight: number;
  onOpenCreateInvoice: () => void;
  onOpenDocIntelligence: () => void;
  onOpenCopilot: () => void;
  onOpenDoubleFinancing: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  activeTab,
  blockHeight,
  onOpenCreateInvoice,
  onOpenDocIntelligence,
  onOpenCopilot,
  onOpenDoubleFinancing,
  onRefresh,
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'INVOICES':
        return 'MSME Receivables Ledger';
      case 'NETWORK':
        return 'DRUNIX Consensus & Distributed Ledger Explorer';
      case 'ANALYTICS':
        return 'Working Capital Impact & Pricing Analytics';
      case 'FRAUD_CENTER':
        return 'Fraud & Anomaly Detection Center';
      case 'CASH_FLOW':
        return 'Cash-Flow Forecasting & Liquidity Runway';
      case 'RISK_ENGINE':
        return 'AI-Powered Invoice Risk Engine';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'INVOICES':
        return 'Multi-party verified invoices on DRUNIX DLT with cryptographic buyer endorsement';
      case 'NETWORK':
        return 'Live peer nodes, Raft orderer, and YugabyteDB state query matrix';
      case 'ANALYTICS':
        return 'Comparative factoring APR benchmarks and liquidity velocity for Indian MSMEs';
      case 'FRAUD_CENTER':
        return 'Continuous deterministic rules, statistical outlier detection, and auditor investigation queue';
      case 'CASH_FLOW':
        return 'Predictive cash flow modeling, confidence intervals, scenario simulation & DRUNIX factoring acceleration';
      case 'RISK_ENGINE':
        return 'Explainable 0-100 risk scoring index, PO reconciliation, and Google Gemini 2.5 Flash underwriting synthesis';
    }
  };

  return (
    <header className="bg-white border-b border-softGray-border sticky top-0 z-30 px-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title & Subtitle */}
        <div>
          <h1 className="text-xl font-bold text-navy tracking-tight">{getTabTitle()}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{getTabSubtitle()}</p>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3">
          {/* Active Persona Badge */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-softGray border border-softGray-border text-xs">
            <span className="font-semibold text-navy">{currentPersona.name}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 font-mono text-[11px] font-semibold">{currentPersona.orgMsp}</span>
          </div>

          {/* AI Smart Upload & Create Invoice Actions */}
          {currentPersona.role === 'SUPPLIER' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={onOpenDocIntelligence}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-royal to-indigo-600 hover:from-royal-hover hover:to-indigo-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
                title="AI Document Intelligence: Upload invoice PDF/Image with Gemini OCR & PO verification"
              >
                <Cpu className="h-4 w-4 text-sky-200" />
                <span>AI Smart Upload</span>
              </button>

              <button
                onClick={onOpenCreateInvoice}
                className="px-3 py-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Manual</span>
              </button>
            </div>
          )}

          {/* AI Copilot Action - Available for all roles */}
          <button
            onClick={onOpenCopilot}
            className="px-3.5 py-2 rounded-lg bg-navy hover:bg-slate-800 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm border border-slate-700/80 group"
            title="Ask InvoiceNet AI Copilot (DRUNIX Grounded)"
          >
            <Sparkles className="h-4 w-4 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>AI Copilot</span>
            <span className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 rounded bg-royal text-blue-100 font-semibold ml-0.5">
              Role: {currentPersona.role}
            </span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-slate-600 hover:text-navy transition-colors shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
