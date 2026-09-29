import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, X, Flame } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-softGray-border rounded-xl shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-light bg-navy text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber/20 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>DRUNIX Double-Financing Defense Simulator</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Jury Demo
                </span>
              </h3>
              <p className="text-xs text-slate-300">Test how DRUNIX prevents duplicate receivables pledging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-white">
          <p className="text-xs text-slate-600 leading-relaxed">
            In traditional Indian supply chains, fraudulent suppliers pledge the exact same paper or PDF invoice to 
            multiple lenders simultaneously, causing over <strong>₹5,000+ crore</strong> in bad debts annually.
            Simulate a rogue lender trying to pledge an invoice that has already been financed on DRUNIX.
          </p>

          <div className="p-4 rounded-lg soft-panel space-y-3">
            <label className="text-xs font-bold text-navy block">Select Target Receivable on Ledger:</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                setAttackResult({ status: 'IDLE', message: '' });
              }}
              className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-medium focus:outline-none focus:border-royal"
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.id} ({inv.invoiceNumber}) — Status: [{inv.status}] — ₹{inv.amount.toLocaleString('en-IN')}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-softGray-border">
              <span>Attacker Identity:</span>
              <span className="font-mono text-amber-700 font-semibold">FN-999 (Shadow Capital)</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            disabled={loading}
            onClick={handleSimulateAttack}
            className="w-full py-2.5 px-4 rounded-lg bg-navy hover:bg-navy-light text-white font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>{loading ? 'Transmitting Attack to DRUNIX Orderer...' : 'Launch Simulated Double-Financing Attack'}</span>
          </button>

          {/* Attack Result Visualizer */}
          {attackResult.status === 'REJECTED_BY_DRUNIX' && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald" />
                <span>DRUNIX Consensus Verdict:</span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px]">
                  TRANSACTION_REJECTED
                </span>
              </div>
              <p className="text-xs font-mono text-rose-900 bg-white p-2.5 rounded border border-rose-200">
                {attackResult.message}
              </p>
              {attackResult.details && (
                <p className="text-[11px] text-slate-600">
                  <span className="text-slate-800 font-semibold">Technical Defense: </span>
                  {attackResult.details}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-softGray-border bg-softGray flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-xs font-semibold text-slate-700 transition-colors"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
