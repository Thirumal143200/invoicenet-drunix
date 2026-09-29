import React from 'react';
import { UserPersona, PersonaRole } from '../types';
import {
  Layers,
  Database,
  BarChart3,
  ShieldAlert,
  Server,
  Building2,
  Briefcase,
  Store,
  Eye,
  CheckCircle2,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  currentPersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
  personas: UserPersona[];
  activeTab: 'INVOICES' | 'NETWORK' | 'ANALYTICS' | 'FRAUD_CENTER' | 'CASH_FLOW' | 'RISK_ENGINE';
  onSelectTab: (tab: 'INVOICES' | 'NETWORK' | 'ANALYTICS' | 'FRAUD_CENTER' | 'CASH_FLOW' | 'RISK_ENGINE') => void;
  blockHeight: number;
  invoiceCount: number;
  onOpenDoubleFinancingModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPersona,
  onSelectPersona,
  personas,
  activeTab,
  onSelectTab,
  blockHeight,
  invoiceCount,
  onOpenDoubleFinancingModal,
}) => {
  const getPersonaIcon = (role: PersonaRole) => {
    switch (role) {
      case 'SUPPLIER':
        return <Store className="h-4 w-4" />;
      case 'BUYER':
        return <Building2 className="h-4 w-4" />;
      case 'FINANCIER':
        return <Briefcase className="h-4 w-4" />;
      case 'EXPLORER':
        return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <aside className="w-64 bg-navy text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-navy-light select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-navy-light/60">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-royal flex items-center justify-center text-white shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">Invoice<span className="text-royal-light font-extrabold">Net</span></span>
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              DRUNIX DLT • Citi 2026
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="px-4 py-5 space-y-1">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Navigation
        </div>

        <button
          onClick={() => onSelectTab('INVOICES')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'INVOICES'
              ? 'bg-royal text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Layers className="h-4 w-4" />
            <span>Receivables Ledger</span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'INVOICES' ? 'bg-royal-hover text-white' : 'bg-navy-light text-slate-300'
            }`}
          >
            {invoiceCount}
          </span>
        </button>

        <button
          onClick={() => onSelectTab('NETWORK')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'NETWORK'
              ? 'bg-royal text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>DRUNIX Consensus & Blocks</span>
        </button>

        <button
          onClick={() => onSelectTab('ANALYTICS')}
          className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'ANALYTICS'
              ? 'bg-royal text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Financial ROI & Analytics</span>
        </button>

        <button
          onClick={() => onSelectTab('FRAUD_CENTER')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'FRAUD_CENTER'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Fraud & Anomaly Center</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-rose-500/30 text-rose-200 border border-rose-400/30 font-bold">
            Live
          </span>
        </button>

        <button
          onClick={() => onSelectTab('CASH_FLOW')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'CASH_FLOW'
              ? 'bg-royal text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span>Cash-Flow & Forecasting</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-bold">
            AI
          </span>
        </button>

        <button
          onClick={() => onSelectTab('RISK_ENGINE')}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'RISK_ENGINE'
              ? 'bg-royal text-white shadow-sm'
              : 'text-slate-300 hover:bg-navy-light hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <Cpu className="h-4 w-4 text-purple-400" />
            <span>AI Risk Engine</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-purple-500/30 text-purple-200 border border-purple-400/30 font-bold">
            0-100
          </span>
        </button>
      </div>

      {/* Active Persona / Role Switcher */}
      <div className="px-4 py-4 border-t border-navy-light/60">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2.5">
          Select Active Persona
        </div>
        <div className="space-y-1.5">
          {personas.map((persona) => {
            const isSelected = currentPersona.role === persona.role;
            return (
              <button
                key={persona.role}
                onClick={() => {
                  onSelectPersona(persona);
                  if (persona.role === 'EXPLORER') onSelectTab('NETWORK');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-navy-surface text-white border border-royal/40 font-semibold'
                    : 'text-slate-400 hover:bg-navy-light/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div className={`p-1.5 rounded ${isSelected ? 'text-royal-light bg-royal/20' : 'text-slate-400 bg-navy-dark'}`}>
                    {getPersonaIcon(persona.role)}
                  </div>
                  <div className="truncate">
                    <div className="truncate leading-tight text-white">{persona.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{persona.org.split(' ')[0]}</div>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-royal-light flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hackathon Defense Tool */}
      <div className="px-4 py-3">
        <button
          onClick={onOpenDoubleFinancingModal}
          className="w-full py-2.5 px-3 rounded-lg bg-navy-surface hover:bg-navy-light text-amber-300 border border-amber-600/30 hover:border-amber-500/60 font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
        >
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>Double-Financing Test</span>
        </button>
      </div>

      {/* DRUNIX Network Status Footer */}
      <div className="mt-auto p-4 border-t border-navy-light/60 bg-navy-dark text-[11px] font-mono text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Channel:</span>
          </span>
          <span className="text-slate-200">invoicenet</span>
        </div>

        <div className="flex items-center justify-between">
          <span>Engine:</span>
          <span className="text-slate-200">YugabyteDB SQL</span>
        </div>

        <div className="flex items-center justify-between">
          <span>Consensus:</span>
          <span className="text-emerald-400 font-bold">Block #{blockHeight}</span>
        </div>
      </div>
    </aside>
  );
};
