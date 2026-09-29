import React from 'react';
import { UserPersona } from '../types';
import { Plus, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';

interface HeaderProps {
  currentPersona: UserPersona;
  activeTab: 'INVOICES' | 'NETWORK' | 'ANALYTICS';
  blockHeight: number;
  onOpenCreateInvoice: () => void;
  onOpenDoubleFinancing: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPersona,
  activeTab,
  blockHeight,
  onOpenCreateInvoice,
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

          {/* Create Invoice Action */}
          {currentPersona.role === 'SUPPLIER' && (
            <button
              onClick={onOpenCreateInvoice}
              className="px-4 py-2 rounded-lg bg-royal hover:bg-royal-hover text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Invoice</span>
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
