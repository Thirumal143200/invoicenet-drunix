import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { Invoice } from '../types';

interface DoubleFinancingDemoModalProps {
  invoices: Invoice[];
  isOpen: boolean;
  onClose: () => void;
}

export const DoubleFinancingDemoModal: React.FC<DoubleFinancingDemoModalProps> = ({
  invoices,
  isOpen,
  onClose,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('INV-2026-003');
  const [loading, setLoading] = useState(false);
  const [attackResult, setAttackResult] = useState<{
    status: 'IDLE' | 'ATTACKING' | 'REJECTED_BY_DRUNIX';
    message: string;
    details?: string;
  }>({
    status: 'IDLE',
    message: '',
  });

  if (!isOpen) return null;

  const handleSimulateAttack = async () => {
    setLoading(true);
    setAttackResult({
      status: 'ATTACKING',
      message: 'Submitting rogue financing transaction to DRUNIX endorsement peer...',
    });

    try {
      const response = await fetch(`/api/invoices/${selectedInvoiceId}/finance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierId: 'FN-999 (Rogue Lender)',
          financierOrg: 'Shadow Capital Private Lending',
          discountRate: 19.5,
          financedAmount: 450000,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setAttackResult({
          status: 'REJECTED_BY_DRUNIX',
          message: data.error || 'Double-financing rejected by DRUNIX consensus',
          details: 'Enforced by Chaincode State Machine & YugabyteDB atomic check: Invoice is already in status FINANCED.',
        });
      } else {
        setAttackResult({
          status: 'IDLE',
          message: 'Invoice was financed (not previously financed).',
        });
      }
    } catch (err: any) {
      setAttackResult({
        status: 'REJECTED_BY_DRUNIX',
        message: err.message || 'DRUNIX endorsement peer rejected rogue transaction signature.',
        details: 'Enforced by Chaincode State Machine & YugabyteDB atomic check.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-rose-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>DRUNIX Double-Financing Defense Simulator</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Jury Demo
                </span>
              </h3>
              <p className="text-xs text-slate-400">Prove how DRUNIX multi-org endorsement prevents double-pledging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            In traditional Indian supply chains, fraudulent suppliers pledge the exact same paper or PDF invoice to 
            multiple lenders simultaneously, causing over <strong>₹5,000+ crore</strong> in bad debts annually.
            Here we simulate a rogue lender trying to pledge an invoice that has already been financed on DRUNIX.
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">Select Target Invoice:</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                setAttackResult({ status: 'IDLE', message: '' });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} ({inv.invoiceNumber}) — Current Status: [{inv.status}] — ₹{inv.amount.toLocaleString('en-IN')}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Attacker Identity:</span>
              <span className="font-mono text-rose-400">FN-999 (Shadow Capital)</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            disabled={loading}
            onClick={handleSimulateAttack}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-rose-500/20 disabled:opacity-50"
          >
            <Flame className="h-4 w-4" />
            <span>{loading ? 'Transmitting Attack to DRUNIX Orderer...' : 'Launch Simulated Double-Financing Attack'}</span>
          </button>

          {/* Attack Result Visualizer */}
          {attackResult.status === 'REJECTED_BY_DRUNIX' && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/40 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-white">DRUNIX Consensus Verdict:</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">TRANSACTION_REJECTED</span>
              </div>
              <p className="text-xs font-mono text-rose-300 bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20">
                {attackResult.message}
              </p>
              {attackResult.details && (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-300 font-semibold">Technical Defense: </span>
                  {attackResult.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
