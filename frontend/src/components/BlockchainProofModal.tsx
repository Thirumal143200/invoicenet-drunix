import React from 'react';
import { Invoice } from '../types';
import { ShieldCheck, X, CheckCircle2, Lock, Cpu, Database, Hash, FileText } from 'lucide-react';

interface BlockchainProofModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const BlockchainProofModal: React.FC<BlockchainProofModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <span>DRUNIX Cryptographic Ledger Proof</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Immutable
                </span>
              </h3>
              <p className="text-xs text-slate-400">Invoice: {invoice.id} ({invoice.invoiceNumber})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto font-sans">
          {/* Header Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Block Height</div>
              <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">#{invoice.blockNumber}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Consensus</div>
              <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">Raft 3-Peer</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">State Engine</div>
              <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">YugabyteDB</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Endorsements</div>
              <div className="text-base font-bold text-white font-mono mt-0.5">{invoice.endorsementHistory.length} / 3 Orgs</div>
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Hash className="h-3.5 w-3.5 text-cyan-400" />
                <span>Primary DRUNIX TxID:</span>
              </span>
              <span className="text-cyan-300 font-semibold">{invoice.txId}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Double-Financing Guard:</span>
              </span>
              <span className="text-emerald-400 font-semibold">Active & Enforced On-Chain</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                <span>Payable Asset Amount:</span>
              </span>
              <span className="text-white font-semibold">₹{invoice.amount.toLocaleString('en-IN')} INR</span>
            </div>
          </div>

          {/* Cryptographic Endorsement Timeline */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300 mb-3 flex items-center space-x-1.5">
              <span>Multi-Party Endorsement Chain</span>
              <span className="text-[10px] text-slate-500 font-normal">(Cryptographically Verified)</span>
            </h4>
            
            <div className="space-y-3">
              {invoice.endorsementHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between space-x-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{item.action.replace('_', ' ')}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 border border-slate-700">
                          {item.orgMsp}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Signed by: {item.actorId}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-1">
                        Sig Hash: <span className="text-slate-400">{item.signatureHash}</span>
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

          {/* Defense & Explanatory Box for Jury */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 border border-cyan-500/20 text-xs text-slate-300">
            <span className="font-bold text-cyan-300">Why this matters for the jury: </span>
            A traditional bank or financier cannot trust supplier invoices without buyer confirmation. On DRUNIX, 
            the buyer’s organization (AutoWorks) cryptographically signs this block. This signature is immutable and prevents 
            the supplier from faking acceptance or pledging the same invoice to another financier.
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
          >
            Close Proof Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
