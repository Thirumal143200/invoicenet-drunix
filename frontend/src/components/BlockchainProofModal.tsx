import React from 'react';
import { Invoice } from '../types';
import { ShieldCheck, X, CheckCircle2, Lock, Hash, FileText } from 'lucide-react';

interface BlockchainProofModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const BlockchainProofModal: React.FC<BlockchainProofModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white border border-softGray-border rounded-xl shadow-modal overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-light bg-navy text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-royal/20 text-royal-light">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>DRUNIX Cryptographic Ledger Proof</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Immutable World State
                </span>
              </h3>
              <p className="text-xs text-slate-300">Invoice: {invoice.id} • {invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans bg-white">
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

          {/* Explanation for Jury */}
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-royal">Why this matters for the jury: </span>
            A traditional financier cannot trust invoices without independent buyer verification. On DRUNIX, 
            the buyer’s organization (AutoWorks) cryptographically signs this block. This signature is immutable and prevents 
            the supplier from faking acceptance or pledging the same invoice to another financier.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-softGray-border bg-softGray flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-navy hover:bg-navy-light text-xs font-semibold text-white transition-colors"
          >
            Close Proof Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
