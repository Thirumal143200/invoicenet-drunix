import React from 'react';
import { UserPersona } from '../types';
import { Plus, RefreshCw, ShieldAlert, Cpu, Sparkles, Bot, Bell, LogIn, LogOut, UserCheck } from 'lucide-react';

interface HeaderProps {
  currentPersona: UserPersona;
  activeTab: 'INVOICES' | 'NETWORK' | 'ANALYTICS' | 'FRAUD_CENTER' | 'CASH_FLOW' | 'RISK_ENGINE' | 'COPILOT' | 'FINANCING' | 'AUDIT_TRAIL';
  blockHeight: number;
  unreadCount?: number;
  authenticatedUser?: any | null;
  onOpenCreateInvoice: () => void;
  onOpenDocIntelligence: () => void;
  onOpenCopilot: () => void;
  onOpenDoubleFinancing: () => void;
  onOpenAuthModal: () => void;
  onOpenNotifications: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  activeTab,
  blockHeight,
  unreadCount = 0,
  authenticatedUser,
  onOpenCreateInvoice,
  onOpenDocIntelligence,
  onOpenCopilot,
  onOpenDoubleFinancing,
  onOpenAuthModal,
  onOpenNotifications,
  onLogout,
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
      case 'COPILOT':
        return 'AI Financial Copilot Workspace';
      case 'FINANCING':
        return 'DRUNIX Invoice Financing Exchange';
      case 'AUDIT_TRAIL':
        return 'Consortium Operations & Audit Trail';
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
      case 'COPILOT':
        return 'Natural-language queries grounded on DRUNIX distributed ledger records & AI risk engine';
      case 'FINANCING':
        return 'Submit receivables for competitive financier bids, review discount APRs, and track disbursements';
      case 'AUDIT_TRAIL':
        return 'Immutable event log of user logins, invoice submissions, multi-party endorsements, and payments';
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
        <div className="flex items-center space-x-2.5">
          {/* Authenticated User Status or Demo Persona Badge */}
          {authenticatedUser ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs shadow-xs">
              <div className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-navy" data-testid="auth-user-name">
                  {authenticatedUser.fullName}
                </span>
              </div>
              <span
                data-testid="auth-user-role"
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                  authenticatedUser.role === 'SUPPLIER'
                    ? 'bg-blue-50 text-royal border-blue-200'
                    : authenticatedUser.role === 'BUYER'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : authenticatedUser.role === 'FINANCIER'
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {authenticatedUser.role}
              </span>
              <span className="hidden xl:inline text-slate-500 text-[11px] truncate max-w-[150px]">
                {authenticatedUser.organizationName || currentPersona.org}
              </span>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-softGray border border-softGray-border text-xs">
              <span className="font-semibold text-navy">{currentPersona.name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600 font-mono text-[11px] font-semibold">{currentPersona.orgMsp}</span>
            </div>
          )}

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
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-slate-600 hover:text-navy transition-colors shadow-sm relative"
            title="In-App Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Sign In / Logout Button */}
          {authenticatedUser ? (
            <button
              onClick={onLogout}
              data-testid="logout-button"
              className="px-3 py-2 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
              title={`Signed in as ${authenticatedUser.fullName} (${authenticatedUser.role}) - Click to sign out`}
            >
              <LogOut className="h-3.5 w-3.5 text-rose-600" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              data-testid="signin-button"
              className="px-3 py-2 rounded-lg bg-royal hover:bg-royal-hover text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Sign In or Register Account"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          )}

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
