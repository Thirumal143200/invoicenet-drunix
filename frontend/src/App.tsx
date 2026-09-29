import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AnalyticsCards } from './components/AnalyticsCards';
import { InvoiceTable } from './components/InvoiceTable';
import { BlockchainProofModal } from './components/BlockchainProofModal';
import { DoubleFinancingDemoModal } from './components/DoubleFinancingDemoModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { NetworkExplorerView } from './components/NetworkExplorerView';
import { Invoice, AnalyticsMetrics, UserPersona } from './types';
import { Zap, ShieldCheck, Clock, TrendingUp, DollarSign } from 'lucide-react';

const PERSONAS: UserPersona[] = [
  {
    role: 'SUPPLIER',
    name: 'Priya Sharma',
    org: 'TechParts Manufacturing Pvt. Ltd.',
    orgMsp: 'SupplierMSP',
    badgeColor: 'royal',
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
    org: 'DRUNIX Consortium Node',
    orgMsp: 'NetworkAuditor',
    badgeColor: 'navy',
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
    <div className="flex min-h-screen bg-softGray-light font-sans text-slate-800">
      {/* Fixed Deep Navy Sidebar */}
      <Sidebar
        currentPersona={currentPersona}
        onSelectPersona={setCurrentPersona}
        personas={PERSONAS}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        blockHeight={blockHeight}
        invoiceCount={invoices.length}
        onOpenDoubleFinancingModal={() => setIsDoubleFinancingModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <Header
          currentPersona={currentPersona}
          activeTab={activeTab}
          blockHeight={blockHeight}
          onOpenCreateInvoice={() => setIsCreateInvoiceModalOpen(true)}
          onOpenDoubleFinancing={() => setIsDoubleFinancingModalOpen(true)}
          onRefresh={fetchData}
        />

        {/* Content Container */}
        <main className="flex-1 p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Active Persona Banner Info Card */}
          <div className="enterprise-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
            <div className="flex items-center space-x-3.5">
              <div className="h-10 w-10 rounded-lg bg-softGray border border-softGray-border flex items-center justify-center font-bold text-navy text-sm font-mono">
                {currentPersona.orgMsp.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-navy">{currentPersona.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-royal font-semibold border border-blue-200">
                    {currentPersona.orgMsp}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald font-semibold border border-emerald-200">
                    Endorsement Node Online
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{currentPersona.org}</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 sm:text-right">
              <span className="font-semibold text-navy">Persona Permission: </span>
              {currentPersona.role === 'SUPPLIER' && 'Can issue trade receivables & request financing'}
              {currentPersona.role === 'BUYER' && 'Can cryptographically endorse goods receipt & settle payments'}
              {currentPersona.role === 'FINANCIER' && 'Can evaluate verified receivables & discount invoices'}
              {currentPersona.role === 'EXPLORER' && 'Full ledger auditor view across all organizations'}
            </div>
          </div>

          {/* TAB 1: RECEIVABLES LEDGER */}
          {activeTab === 'INVOICES' && (
            <div className="space-y-6">
              <AnalyticsCards metrics={metrics} />

              {/* Filter Tabs */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                <div className="flex items-center space-x-1.5 bg-white border border-softGray-border p-1 rounded-lg shadow-sm">
                  {[
                    { id: 'ALL', label: 'All Invoices' },
                    { id: 'ACTION_REQUIRED', label: `Pending My Action (${currentPersona.role})` },
                    { id: 'CREATED', label: 'Awaiting Buyer' },
                    { id: 'ACCEPTED', label: 'Buyer Endorsed' },
                    { id: 'FINANCED', label: 'Financed' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterStatus(f.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        filterStatus === f.id
                          ? 'bg-royal text-white shadow-sm'
                          : 'text-slate-600 hover:text-navy hover:bg-softGray'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  Showing {filteredInvoices.length} of {invoices.length} receivables
                </div>
              </div>

              {/* Invoices Table */}
              <InvoiceTable
                invoices={filteredInvoices}
                currentPersona={currentPersona}
                onInspectProof={(inv) => setSelectedProofInvoice(inv)}
                onRefresh={fetchData}
              />
            </div>
          )}

          {/* TAB 2: NETWORK & BLOCKS */}
          {activeTab === 'NETWORK' && <NetworkExplorerView />}

          {/* TAB 3: QUANTITATIVE ANALYTICS & ROI */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-6">
              <AnalyticsCards metrics={metrics} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cost of Capital Comparison */}
                <div className="p-6 enterprise-card space-y-4">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    Cost of Capital Comparison (Factoring APR)
                  </h3>
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">Traditional NBFC / Offline Factoring</span>
                        <span className="text-rose-600 font-bold">22.0% APR</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-[90%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">TReDS (Tier 1 Large Corporates only)</span>
                        <span className="text-amber-600 font-bold">14.5% APR</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[60%]"></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-royal font-bold">InvoiceNet on DRUNIX (Tier 2/3 MSMEs)</span>
                        <span className="text-emerald font-bold">11.0% APR</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald rounded-full w-[45%]"></div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pt-3 border-t border-softGray-border">
                    Because DRUNIX provides cryptographic multi-party endorsement, financiers don’t have to price in 
                    unverified invoice fraud or double-financing risks, directly translating into a <strong>~50% reduction in interest rates</strong>.
                  </p>
                </div>

                {/* Settlement & Verification Velocity */}
                <div className="p-6 enterprise-card space-y-4">
                  <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                    Settlement & Verification Velocity
                  </h3>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-lg soft-panel text-center">
                      <div className="text-xs text-slate-500 font-semibold">Traditional Bank Verification</div>
                      <div className="text-2xl font-bold text-rose-600 font-mono mt-1">14 - 21</div>
                      <div className="text-[11px] text-slate-500">Business Days</div>
                    </div>
                    <div className="p-4 rounded-lg soft-panel text-center">
                      <div className="text-xs text-royal font-semibold">DRUNIX Multi-Org Endorsement</div>
                      <div className="text-2xl font-bold text-emerald font-mono mt-1">&lt; 3.5</div>
                      <div className="text-[11px] text-emerald font-semibold">Hours (Atomic Commit)</div>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-navy">YugabyteDB SQL Analytics: </span>
                    Every trade invoice state transition is directly queryable via standard SQL on DRUNIX, 
                    allowing financiers to run risk scoring and liquidity forecasting across portfolios in milliseconds.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

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
