import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceRiskAssessment, UserPersona } from '../types';
import {
  ShieldCheck,
  X,
  CheckCircle2,
  Lock,
  Hash,
  FileText,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  RefreshCw,
  Cpu,
} from 'lucide-react';

interface BlockchainProofModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  currentPersona?: UserPersona;
}

export const BlockchainProofModal: React.FC<BlockchainProofModalProps> = ({
  invoice,
  onClose,
  currentPersona,
}) => {
  const [riskAssessment, setRiskAssessment] = useState<InvoiceRiskAssessment | null>(null);
  const [isLoadingRisk, setIsLoadingRisk] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'BLOCKCHAIN_PROOF' | 'RISK_ASSESSMENT'>('BLOCKCHAIN_PROOF');

  useEffect(() => {
    if (invoice) {
      fetchRiskAssessment(invoice.id);
    } else {
      setRiskAssessment(null);
    }
  }, [invoice?.id]);

  const fetchRiskAssessment = async (invoiceId: string) => {
    setIsLoadingRisk(true);
    try {
      const res = await fetch(`/api/risk/assessments/${invoiceId}`, {
        headers: {
          'x-user-role': currentPersona?.role || 'FINANCIER',
          'x-user-id': currentPersona?.name || 'Financier-1',
          'x-user-org': currentPersona?.org || 'QuickFund Capital Ltd.',
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRiskAssessment(data.data);
      }
    } catch (err) {
      console.warn('Could not load risk assessment for proof modal:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  const handleRecalculateRisk = async () => {
    if (!invoice) return;
    setIsLoadingRisk(true);
    try {
      const res = await fetch(`/api/risk/assess/${invoice.id}`, {
        method: 'POST',
        headers: {
          'x-user-role': currentPersona?.role || 'FINANCIER',
          'x-user-id': currentPersona?.name || 'Financier-1',
          'x-user-org': currentPersona?.org || 'QuickFund Capital Ltd.',
        },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRiskAssessment(data.data);
      }
    } catch (err) {
      console.error('Failed to recalculate risk:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  if (!invoice) return null;

  const getScoreTheme = (score: number) => {
    if (score >= 80) {
      return {
        text: 'text-rose-600',
        bg: 'bg-rose-50',
        border: 'border-rose-300',
        pill: 'bg-rose-600 text-white',
        label: 'CRITICAL RISK',
        sub: 'Hold Financing • Escalate to Consortium Auditor',
        range: '80 - 100',
      };
    }
    if (score >= 60) {
      return {
        text: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-300',
        pill: 'bg-orange-500 text-white',
        label: 'HIGH RISK',
        sub: 'Enhanced Diligence Required • Reconcile PO & Challan',
        range: '60 - 79',
      };
    }
    if (score >= 30) {
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        pill: 'bg-amber-500 text-white',
        label: 'MEDIUM RISK',
        sub: 'Moderate Discrepancy • Standard Verification',
        range: '30 - 59',
      };
    }
    return {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      pill: 'bg-emerald-600 text-white',
      label: 'LOW RISK',
      sub: 'Prime Commercial Grade • Discounting Approved',
      range: '0 - 29',
    };
  };

  const riskTheme = riskAssessment ? getScoreTheme(riskAssessment.riskScore) : getScoreTheme(0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-softGray-border rounded-xl shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-light bg-navy text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-royal/20 text-royal-light">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>DRUNIX Verification & Risk Intelligence</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Consensus World State
                </span>
              </h3>
              <p className="text-xs text-slate-300">Invoice: {invoice.id} • {invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 text-xs font-semibold space-x-4 shrink-0">
          <button
            onClick={() => setActiveTab('BLOCKCHAIN_PROOF')}
            className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'BLOCKCHAIN_PROOF'
                ? 'border-royal text-royal'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>DRUNIX Consensus Proof</span>
          </button>

          <button
            onClick={() => setActiveTab('RISK_ASSESSMENT')}
            className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'RISK_ASSESSMENT'
                ? 'border-royal text-royal'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>AI Risk Assessment</span>
            {riskAssessment && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${riskTheme.pill}`}>
                {riskAssessment.riskScore}/100
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto font-sans bg-white flex-1">
          {activeTab === 'BLOCKCHAIN_PROOF' ? (
            <>
              {/* Header Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg soft-panel">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Block Height</div>
                  <div className="text-base font-bold text-navy font-mono mt-0.5">#{invoice.blockNumber}</div>
                </div>
                <div className="p-3.5 rounded-lg soft-panel">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Consensus</div>
                  <div className="text-base font-bold text-emerald font-mono mt-0.5">Raft 3-Peer</div>
                </div>
                <div className="p-3.5 rounded-lg soft-panel">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">State Engine</div>
                  <div className="text-base font-bold text-royal font-mono mt-0.5">YugabyteDB</div>
                </div>
                <div className="p-3.5 rounded-lg soft-panel">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Endorsements</div>
                  <div className="text-base font-bold text-navy font-mono mt-0.5">{invoice.endorsementHistory.length} / 3 Orgs</div>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="p-4 rounded-lg soft-panel space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-slate-500">
                    <Hash className="h-3.5 w-3.5 text-royal" />
                    <span>Primary DRUNIX TxID:</span>
                  </span>
                  <span className="text-navy font-bold">{invoice.txId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-slate-500">
                    <Lock className="h-3.5 w-3.5 text-emerald" />
                    <span>Double-Financing Guard:</span>
                  </span>
                  <span className="text-emerald font-bold">Enforced On-Chain</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1.5 text-slate-500">
                    <FileText className="h-3.5 w-3.5 text-slate-600" />
                    <span>Face Value:</span>
                  </span>
                  <span className="text-navy font-bold">₹{invoice.amount.toLocaleString('en-IN')} INR</span>
                </div>
              </div>

              {/* Endorsement Chain */}
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-navy mb-3 flex items-center space-x-1.5">
                  <span>Cryptographic Multi-Party Endorsement Chain</span>
                </h4>

                <div className="space-y-2.5">
                  {invoice.endorsementHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg enterprise-card flex items-start justify-between space-x-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 p-1.5 rounded-full bg-emerald-50 text-emerald">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-navy">{item.action.replace('_', ' ')}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-royal font-semibold border border-blue-200">
                              {item.orgMsp}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">Signed by: {item.actorId}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-1">
                            Sig Hash: <span className="text-slate-700">{item.signatureHash}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Risk Preview Banner */}
              {riskAssessment && (
                <div
                  onClick={() => setActiveTab('RISK_ASSESSMENT')}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${riskTheme.bg} ${riskTheme.border}`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${riskTheme.pill}`}>
                      Risk Score: {riskAssessment.riskScore}/100
                    </span>
                    <span className="text-xs font-bold text-navy">
                      {riskAssessment.riskCategory || riskAssessment.riskLevel} Risk Grade
                    </span>
                  </div>
                  <span className="text-xs text-royal font-bold hover:underline">
                    View Complete Breakdown →
                  </span>
                </div>
              )}
            </>
          ) : (
            /* RISK ASSESSMENT TAB */
            <div className="space-y-4">
              {isLoadingRisk ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="h-8 w-8 text-royal animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold">Running deterministic checks & AI underwriting analysis...</p>
                </div>
              ) : riskAssessment ? (
                <>
                  {/* Score Header */}
                  <div className={`p-4 rounded-xl border ${riskTheme.bg} ${riskTheme.border} flex items-center justify-between`}>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center bg-white border-current text-center">
                        <span className={`text-xl font-mono font-extrabold ${riskTheme.text}`}>
                          {riskAssessment.riskScore}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400">/ 100</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-extrabold ${riskTheme.pill}`}>
                            {riskAssessment.riskCategory || riskAssessment.riskLevel}
                          </span>
                          <span className="text-xs text-slate-500">({riskTheme.range})</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{riskTheme.sub}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleRecalculateRisk}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-navy flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Re-Assess</span>
                    </button>
                  </div>

                  {/* AI Summary */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-bold text-navy uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-royal" />
                      <span>Gemini Underwriting Summary</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {riskAssessment.explanation.summary || riskAssessment.explanation.executiveSummary}
                    </p>
                  </div>

                  {/* Recommended Action */}
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-navy">
                    <span className="font-bold">Recommended Action: </span>
                    {riskAssessment.recommendedAction}
                  </div>

                  {/* Detected Factors */}
                  <div>
                    <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
                      Detected Risk Factors ({(riskAssessment.individualRiskFactors || riskAssessment.detectedFactors || []).length})
                    </h4>
                    {(riskAssessment.individualRiskFactors || riskAssessment.detectedFactors || []).length === 0 ? (
                      <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        ✓ No adverse risk factors detected. Commercial parameters conform to verified DRUNIX standards.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(riskAssessment.individualRiskFactors || riskAssessment.detectedFactors || []).map((f) => (
                          <div
                            key={f.id}
                            className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                              f.scoreImpact < 0
                                ? 'bg-emerald-50 border-emerald-200'
                                : f.severity === 'CRITICAL'
                                ? 'bg-rose-50 border-rose-200'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div>
                              <span className="font-bold text-navy">{f.title}: </span>
                              <span className="text-slate-600">{f.description}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] shrink-0 ${
                                f.scoreImpact < 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {f.scoreImpact > 0 ? `+${f.scoreImpact}` : f.scoreImpact} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500 mb-3">No risk evaluation recorded yet.</p>
                  <button
                    onClick={handleRecalculateRisk}
                    className="px-4 py-2 bg-royal text-white text-xs font-bold rounded-lg hover:bg-royal-hover transition-colors cursor-pointer"
                  >
                    Execute Initial Risk Analysis
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-softGray-border bg-softGray flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-navy hover:bg-navy-light text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
