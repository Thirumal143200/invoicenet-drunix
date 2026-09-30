import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AnalyticsCards } from './components/AnalyticsCards';
import { InvoiceTable } from './components/InvoiceTable';
import { BlockchainProofModal } from './components/BlockchainProofModal';
import { DoubleFinancingDemoModal } from './components/DoubleFinancingDemoModal';
import { CreateInvoiceModal } from './components/CreateInvoiceModal';
import { DocumentReviewWorkspace } from './components/DocumentReviewWorkspace';
import { CopilotChatDrawer } from './components/CopilotChatDrawer';
import { NetworkExplorerView } from './components/NetworkExplorerView';
import { FraudCenterView } from './components/FraudCenterView';
import { CashFlowForecastingView } from './components/CashFlowForecastingView';
import { InvoiceRiskAnalysisView } from './components/InvoiceRiskAnalysisView';
import { CopilotWorkspaceView } from './components/CopilotWorkspaceView';
import { Invoice, AnalyticsMetrics, UserPersona } from './types';
import { Zap, ShieldCheck, Clock, TrendingUp, DollarSign, Bot, Sparkles } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { FinancingWorkflowView } from './components/FinancingWorkflowView';
import { AuditTrailView } from './components/AuditTrailView';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';

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
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'NETWORK' | 'ANALYTICS' | 'FRAUD_CENTER' | 'CASH_FLOW' | 'RISK_ENGINE' | 'COPILOT' | 'FINANCING' | 'AUDIT_TRAIL'>('INVOICES');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [blockHeight, setBlockHeight] = useState<number>(1045);
  const [loading, setLoading] = useState(true);

  // Authentication & Notifications State
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Modals
  const [selectedProofInvoice, setSelectedProofInvoice] = useState<Invoice | null>(null);
  const [isDoubleFinancingModalOpen, setIsDoubleFinancingModalOpen] = useState(false);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [isDocWorkspaceOpen, setIsDocWorkspaceOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Filter & Connection state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [backendState, setBackendState] = useState<'ONLINE' | 'WAKING' | 'OFFLINE'>('ONLINE');

  const checkAuth = async () => {
    const token = localStorage.getItem('invoicenet_auth_token');
    if (token) {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data?.user) {
          setAuthenticatedUser(data.data.user);
          const match = PERSONAS.find((p) => p.role === data.data.user.role);
          if (match) {
            setCurrentPersona({
              ...match,
              name: data.data.user.fullName || match.name,
              org: data.data.user.organization?.name || match.org,
            });
          }
        } else {
          localStorage.removeItem('invoicenet_auth_token');
          setAuthenticatedUser(null);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'x-user-role': currentPersona.role,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/notifications/unread/count', { headers });
      const data = await res.json();
      if (data.success && typeof data.data?.count === 'number') {
        setUnreadCount(data.data.count);
      }
    } catch {
      // ignore
    }
  };

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

      if (invData.success) {
        setInvoices(invData.data);
        setBackendState('ONLINE');
      }
      if (metricData.success) setMetrics(metricData.data);
      if (statusData.success && statusData.data.currentBlockHeight) {
        setBlockHeight(statusData.data.currentBlockHeight);
      }
    } catch (err) {
      console.warn('Backend connection pending or waking:', err);
      if (invoices.length === 0) {
        setBackendState('WAKING');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    fetchData();
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchData();
      fetchUnreadCount();
    }, 4000);
    return () => clearInterval(interval);
  }, [currentPersona.role]);

  const handleLogout = () => {
    localStorage.removeItem('invoicenet_auth_token');
    setAuthenticatedUser(null);
    fetchUnreadCount();
  };

  const handleAuthSuccess = (user: any, token: string) => {
    localStorage.setItem('invoicenet_auth_token', token);
    setAuthenticatedUser(user);
    const match = PERSONAS.find((p) => p.role === user.role);
    if (match) {
      setCurrentPersona({
        ...match,
        name: user.fullName || match.name,
        org: user.organization?.name || match.org,
      });
    }
    setIsAuthModalOpen(false);
    fetchData();
    fetchUnreadCount();
  };

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
          unreadCount={unreadCount}
          authenticatedUser={authenticatedUser}
          onOpenCreateInvoice={() => setIsCreateInvoiceModalOpen(true)}
          onOpenDocIntelligence={() => setIsDocWorkspaceOpen(true)}
          onOpenCopilot={() => setIsCopilotOpen(true)}
          onOpenDoubleFinancing={() => setIsDoubleFinancingModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onLogout={handleLogout}
          onRefresh={fetchData}
        />

        {backendState === 'WAKING' && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800 transition-all">
            <div className="flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="font-semibold">Connecting to cloud backend...</span>
              <span className="text-amber-700 hidden md:inline">
                Render free-tier web services take 30–50 seconds to wake from idle spin-down.
              </span>
            </div>
            <button
              onClick={() => fetchData()}
              className="px-2.5 py-1 bg-white border border-amber-300 rounded font-semibold text-amber-800 hover:bg-amber-100 shadow-xs transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

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

          {/* TAB 4: FRAUD & ANOMALY DETECTION CENTER */}
          {activeTab === 'FRAUD_CENTER' && (
            <FraudCenterView
              currentPersona={currentPersona}
              onInspectInvoiceProof={(invId) => {
                const found = invoices.find(
                  (i) => i.id.toLowerCase() === invId.toLowerCase() || i.invoiceNumber.toLowerCase() === invId.toLowerCase()
                );
                if (found) setSelectedProofInvoice(found);
              }}
            />
          )}

          {/* TAB 5: AI CASH-FLOW FORECASTING & RUNWAY */}
          {activeTab === 'CASH_FLOW' && (
            <CashFlowForecastingView
              currentPersona={currentPersona}
              onInspectInvoiceProof={(invId) => {
                const found = invoices.find(
                  (i) => i.id.toLowerCase() === invId.toLowerCase() || i.invoiceNumber.toLowerCase() === invId.toLowerCase()
                );
                if (found) setSelectedProofInvoice(found);
              }}
            />
          )}

          {/* TAB 6: AI-POWERED INVOICE RISK ENGINE */}
          {activeTab === 'RISK_ENGINE' && (
            <InvoiceRiskAnalysisView
              currentPersona={currentPersona}
              invoices={invoices}
              onRefreshData={fetchData}
            />
          )}

          {/* TAB 7: AI FINANCIAL COPILOT WORKSPACE */}
          {activeTab === 'COPILOT' && (
            <CopilotWorkspaceView
              currentPersona={currentPersona}
              invoices={invoices}
              blockHeight={blockHeight}
              onInspectInvoiceProof={(invId) => {
                const found = invoices.find(
                  (i) => i.id.toLowerCase() === invId.toLowerCase() || i.invoiceNumber.toLowerCase() === invId.toLowerCase()
                );
                if (found) setSelectedProofInvoice(found);
              }}
              onOpenRiskEngine={() => {
                setActiveTab('RISK_ENGINE');
              }}
            />
          )}

          {/* TAB 8: FINANCING WORKFLOW */}
          {activeTab === 'FINANCING' && (
            <FinancingWorkflowView
              currentPersona={currentPersona}
              invoices={invoices}
              onRefresh={fetchData}
            />
          )}

          {/* TAB 9: CONSORTIUM AUDIT TRAIL */}
          {activeTab === 'AUDIT_TRAIL' && (
            <AuditTrailView currentPersona={currentPersona} />
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

      <DocumentReviewWorkspace
        isOpen={isDocWorkspaceOpen}
        onClose={() => setIsDocWorkspaceOpen(false)}
        onInvoiceCreated={fetchData}
        currentPersona={currentPersona}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleAuthSuccess}
        personas={PERSONAS}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          fetchUnreadCount();
        }}
        userId={authenticatedUser?.id}
      />

      <RecordPaymentModal
        invoice={paymentModalInvoice}
        isOpen={!!paymentModalInvoice}
        onClose={() => setPaymentModalInvoice(null)}
        onPaymentRecorded={() => {
          fetchData();
          fetchUnreadCount();
        }}
      />

      {/* Floating AI Copilot Action Button */}
      <button
        onClick={() => setIsCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-gradient-to-r from-navy via-slate-900 to-royal text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center space-x-2.5 border-2 border-white/80 group cursor-pointer"
        title="Ask InvoiceNet AI Copilot (DRUNIX Grounded)"
      >
        <Sparkles className="h-5 w-5 text-amber-300 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-bold tracking-wide pr-1 hidden sm:inline">Ask Copilot</span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </button>

      {/* Role-Aware AI Copilot Chat Drawer */}
      <CopilotChatDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        currentPersona={currentPersona}
        onInspectInvoiceProof={(invId) => {
          const found = invoices.find(
            (i) => i.id.toLowerCase() === invId.toLowerCase() || i.invoiceNumber.toLowerCase() === invId.toLowerCase()
          );
          if (found) {
            setSelectedProofInvoice(found);
          }
        }}
      />
    </div>
  );
};
