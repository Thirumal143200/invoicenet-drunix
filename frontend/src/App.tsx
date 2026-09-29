import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AnalyticsCards } from './components/AnalyticsCards';
import { InvoiceTable } from './components/InvoiceTable';
import { BlockchainProofModal } from './components/BlockchainProofModal';
import { DoubleFinancingDemoModal } from './components/DoubleFinancingDemoModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { NetworkExplorerView } from './components/NetworkExplorerView';
import { Invoice, AnalyticsMetrics, UserPersona } from './types';
import { Plus, ShieldAlert, RefreshCw, Layers, BarChart3, Database, CheckCircle2 } from 'lucide-react';

const PERSONAS: UserPersona[] = [
  {
    role: 'SUPPLIER',
    name: 'Priya Sharma',
    org: 'TechParts Manufacturing Pvt. Ltd.',
    orgMsp: 'SupplierMSP',
    badgeColor: 'cyan',
  },
  {
    role: 'BUYER',
    name: 'Rajesh Kumar',
    org: 'AutoWorks Industries Ltd.',
    orgMsp: 'BuyerMSP',
    badgeColor: 'emerald',
  },
  {
    role: 'FINANCIER',
    name: 'Ananya Patel',
    org: 'QuickFund Capital',
    orgMsp: 'FinancierMSP',
    badgeColor: 'indigo',
  },
  {
    role: 'EXPLORER',
    name: 'Jury Auditor',
    org: 'DRUNIX Network Consensus Node',
    orgMsp: 'NetworkAuditor',
    badgeColor: 'amber',
  },
];

export const App: React.FC = () => {
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(PERSONAS[0]);
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'NETWORK' | 'ANALYTICS'>('INVOICES');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [blockHeight, setBlockHeight] = useState<number>(1045);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedProofInvoice, setSelectedProofInvoice] = useState<Invoice | null>(null);
  const [isDoubleFinancingModalOpen, setIsDoubleFinancingModalOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchData = async () => {
    try {
      const [invRes, metricRes, statusRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/analytics/metrics'),
        fetch('/api/blockchain/status'),
      ]);

      const invData = await invRes.json();
      const metricData = await metricRes.json();
      const statusData = await statusRes.json();

      if (invData.success) setInvoices(invData.data);
      if (metricData.success) setMetrics(metricData.data);
      if (statusData.success && statusData.data.currentBlockHeight) {
        setBlockHeight(statusData.data.currentBlockHeight);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTION_REQUIRED') {
      if (currentPersona.role === 'BUYER') return inv.status === 'CREATED' || inv.status === 'FINANCED';
      if (currentPersona.role === 'SUPPLIER') return inv.status === 'ACCEPTED';
      if (currentPersona.role === 'FINANCIER') return inv.status === 'ACCEPTED' || inv.status === 'FINANCING_REQUESTED';
    }
    return inv.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans">
      <Navbar
        currentPersona={currentPersona}
        onSelectPersona={(p) => {
          setCurrentPersona(p);
          if (p.role === 'EXPLORER') setActiveTab('NETWORK');
        }}
        personas={PERSONAS}
        blockHeight={blockHeight}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Active Persona Banner */}
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-lg">
              {currentPersona.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">{currentPersona.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {currentPersona.orgMsp}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{currentPersona.org}</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {currentPersona.role === 'SUPPLIER' && (
              <button
                onClick={() => setIsCreateInvoiceModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-cyan-500/10 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Create Invoice</span>
              </button>
            )}

            {/* Double-Financing Defense Simulator (Accessible anytime for jury demonstration) */}
            <button
              onClick={() => setIsDoubleFinancingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm"
              title="Demonstrate DRUNIX double-pledging prevention for hackathon jury"
            >
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Double-Financing Attack Test</span>
            </button>

            <button
              onClick={fetchData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh ledger state"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top-Level Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'INVOICES'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Receivables Ledger ({invoices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('NETWORK')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'NETWORK'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>DRUNIX Network & Blocks</span>
          </button>

          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
              activeTab === 'ANALYTICS'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Quantitative MSME Impact</span>
          </button>
        </div>

        {/* Tab 1: INVOICES VIEW */}
        {activeTab === 'INVOICES' && (
          <div className="space-y-6">
            <AnalyticsCards metrics={metrics} />

            {/* Filter Pills */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'All Invoices' },
                  { id: 'ACTION_REQUIRED', label: `Pending My Action (${currentPersona.role})` },
                  { id: 'CREATED', label: 'Awaiting Buyer' },
                  { id: 'ACCEPTED', label: 'Accepted' },
                  { id: 'FINANCED', label: 'Financed' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterStatus === f.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </div>
            </div>

            <InvoiceTable
              invoices={filteredInvoices}
              currentPersona={currentPersona}
              onInspectProof={(inv) => setSelectedProofInvoice(inv)}
              onRefresh={fetchData}
            />
          </div>
        )}

        {/* Tab 2: NETWORK & BLOCKS VIEW */}
        {activeTab === 'NETWORK' && <NetworkExplorerView />}

        {/* Tab 3: QUANTITATIVE ANALYTICS VIEW */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            <AnalyticsCards metrics={metrics} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Cost of Capital Comparison (Factoring APR)
                </h3>
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Traditional NBFC / Offline Factoring</span>
                      <span className="text-rose-400 font-bold">22.0% APR</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full w-[90%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">TReDS (Tier 1 Large Corporates only)</span>
                      <span className="text-amber-400 font-bold">14.5% APR</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full w-[60%]"></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-cyan-300 font-semibold">InvoiceNet on DRUNIX (Tier 2/3 MSMEs)</span>
                      <span className="text-emerald-400 font-bold">11.0% APR</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full w-[45%]"></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
                  Because DRUNIX provides cryptographic multi-org endorsement, financiers don’t have to price in 
                  unverified invoice fraud or double-financing risks, directly translating into a <strong>~50% reduction in interest rates</strong>.
                </p>
              </div>

              <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Settlement & Verification Velocity
                </h3>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-xs text-slate-400 font-semibold">Traditional Bank Verification</div>
                    <div className="text-2xl font-bold text-rose-400 font-mono mt-1">14 - 21</div>
                    <div className="text-[11px] text-slate-500">Business Days</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                    <div className="text-xs text-cyan-300 font-semibold">DRUNIX Multi-Org Endorsement</div>
                    <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">&lt; 3.5</div>
                    <div className="text-[11px] text-emerald-500 font-semibold">Hours (Atomic Commit)</div>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-white">YugabyteDB SQL Analytics: </span>
                  Every trade invoice state transition is directly queryable via standard SQL on DRUNIX, 
                  allowing financiers to run risk scoring and liquidity forecasting across portfolios in milliseconds.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <BlockchainProofModal
        invoice={selectedProofInvoice}
        onClose={() => setSelectedProofInvoice(null)}
      />

      <DoubleFinancingDemoModal
        invoices={invoices}
        isOpen={isDoubleFinancingModalOpen}
        onClose={() => setIsDoubleFinancingModalOpen(false)}
      />

      <CreateInvoiceModal
        isOpen={isCreateInvoiceModalOpen}
        onClose={() => setIsCreateInvoiceModalOpen(false)}
        onInvoiceCreated={fetchData}
        currentPersona={currentPersona}
      />
    </div>
  );
};
