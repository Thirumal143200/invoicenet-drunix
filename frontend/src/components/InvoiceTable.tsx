import React, { useState } from 'react';
import { Invoice, UserPersona } from '../types';
import { ShieldCheck, Check, X, ArrowUpRight, DollarSign, Building2, Calendar, FileText, ChevronRight } from 'lucide-react';

interface InvoiceTableProps {
  invoices: Invoice[];
  currentPersona: UserPersona;
  onInspectProof: (invoice: Invoice) => void;
  onRefresh: () => void;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  currentPersona,
  onInspectProof,
  onRefresh,
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'CREATED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Awaiting Buyer
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Buyer Endorsed
          </span>
        );
      case 'FINANCING_REQUESTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 animate-pulse">
            Open for Bidding
          </span>
        );
      case 'FINANCED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Financed (Tri-Party)
          </span>
        );
      case 'SETTLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            Fully Settled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Disputed / Rejected
          </span>
        );
      default:
        return <span className="text-slate-400">{status}</span>;
    }
  };

  // Actions
  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/invoices/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: `${currentPersona.name} (${currentPersona.org})` }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestFinancing = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/invoices/${id}/request-financing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: `${currentPersona.name} (${currentPersona.org})`,
          requestedRate: 11.0,
        }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinance = async (id: string, amount: number) => {
    setActionLoading(id);
    try {
      await fetch(`/api/invoices/${id}/finance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          financierId: currentPersona.name,
          financierOrg: currentPersona.org,
          discountRate: 11.0,
          financedAmount: Math.round(amount * 0.90),
        }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  const handleSettle = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/invoices/${id}/settle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId: currentPersona.name,
          paymentReference: `CITI-UPI-${Date.now()}`,
        }),
      });
      onRefresh();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl glass-panel border border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Invoice / ID</th>
              <th className="py-3.5 px-4">Parties</th>
              <th className="py-3.5 px-4">Amount & Due</th>
              <th className="py-3.5 px-4">Ledger Status</th>
              <th className="py-3.5 px-4">Endorsements</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {invoices.map((inv) => {
              const isLoading = actionLoading === inv.id;

              return (
                <tr key={inv.id} className="hover:bg-slate-850/40 transition-colors group">
                  {/* Invoice ID */}
                  <td className="py-4 px-4 font-mono">
                    <div className="font-bold text-white text-xs">{inv.id}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[180px]">{inv.description}</div>
                  </td>

                  {/* Parties */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1.5 text-slate-300">
                      <Building2 className="h-3 w-3 text-cyan-400" />
                      <span className="font-medium truncate max-w-[180px]">{inv.buyerOrg}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      From: <span className="text-slate-400">{inv.supplierOrg}</span>
                    </div>
                  </td>

                  {/* Amount & Due */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-white font-mono text-sm">
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    {getStatusBadge(inv.status)}
                    {inv.status === 'FINANCED' && (
                      <div className="text-[10px] text-emerald-400/90 font-mono mt-1">
                        @ {inv.discountRate}% APR by {inv.financierOrg?.split(' ')[0]}
                      </div>
                    )}
                  </td>

                  {/* Endorsement Chain */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1">
                      {['SupplierMSP', 'BuyerMSP', 'FinancierMSP'].map((msp, idx) => {
                        const isEndorsed = inv.endorsementHistory.some((e) => e.orgMsp === msp);
                        return (
                          <span
                            key={idx}
                            title={`${msp}: ${isEndorsed ? 'Endorsed' : 'Pending'}`}
                            className={`h-2.5 w-6 rounded-sm ${
                              isEndorsed ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50' : 'bg-slate-800'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {inv.endorsementHistory.length} of 3 Orgs
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-4 px-4 text-right space-x-2">
                    {/* Buyer Accept */}
                    {currentPersona.role === 'BUYER' && inv.status === 'CREATED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleAccept(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/30 transition-all text-xs"
                      >
                        {isLoading ? 'Signing...' : 'Accept on DRUNIX'}
                      </button>
                    )}

                    {/* Supplier Request Financing */}
                    {currentPersona.role === 'SUPPLIER' && inv.status === 'ACCEPTED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleRequestFinancing(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-semibold border border-indigo-500/30 transition-all text-xs"
                      >
                        {isLoading ? 'Posting...' : 'Request Financing'}
                      </button>
                    )}

                    {/* Financier Fund */}
                    {currentPersona.role === 'FINANCIER' &&
                      (inv.status === 'ACCEPTED' || inv.status === 'FINANCING_REQUESTED') && (
                        <button
                          disabled={isLoading}
                          onClick={() => handleFinance(inv.id, inv.amount)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold transition-all shadow-md text-xs"
                        >
                          {isLoading ? 'Executing...' : 'Finance @ 11% APR'}
                        </button>
                      )}

                    {/* Buyer Settle */}
                    {currentPersona.role === 'BUYER' && inv.status === 'FINANCED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleSettle(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 text-xs"
                      >
                        {isLoading ? 'Settling...' : 'Settle Invoice'}
                      </button>
                    )}

                    {/* Proof Inspector Button */}
                    <button
                      onClick={() => onInspectProof(inv)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/40 font-mono text-[11px] transition-all"
                    >
                      Proof
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
