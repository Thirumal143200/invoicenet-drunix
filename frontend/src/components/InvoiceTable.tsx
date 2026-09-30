import React, { useState, useEffect } from 'react';
import { Invoice, UserPersona, InvoiceRiskAssessment } from '../types';
import { ShieldCheck, Calendar, Building2, ExternalLink, Cpu, AlertTriangle } from 'lucide-react';

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
  const [assessmentsMap, setAssessmentsMap] = useState<Record<string, InvoiceRiskAssessment>>({});

  useEffect(() => {
    fetchAssessments();
  }, [invoices.length, currentPersona.role]);

  const fetchAssessments = async () => {
    try {
      const res = await fetch('/api/risk/assessments', {
        headers: {
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const map: Record<string, InvoiceRiskAssessment> = {};
        for (const a of data.data) {
          map[a.invoiceId] = a;
        }
        setAssessmentsMap(map);
      }
    } catch (e) {
      console.warn('Could not fetch assessments for table:', e);
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'CREATED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Awaiting Buyer
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-royal border border-blue-200">
            Buyer Endorsed
          </span>
        );
      case 'FINANCING_REQUESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Open for Bidding
          </span>
        );
      case 'FINANCED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Tri-Party Financed
          </span>
        );
      case 'SETTLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Fully Settled
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Disputed
          </span>
        );
      default:
        return <span className="text-slate-600">{status}</span>;
    }
  };

  const getRiskBadge = (assessment?: InvoiceRiskAssessment) => {
    if (!assessment) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          Unassessed
        </span>
      );
    }

    const score = assessment.riskScore;
    if (score >= 80) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span>{score}</span>
          <span className="text-[9px]">CRITICAL</span>
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-300">
          <span>{score}</span>
          <span className="text-[9px]">HIGH</span>
        </span>
      );
    }
    if (score >= 30) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <span>{score}</span>
          <span className="text-[9px]">MEDIUM</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span>{score}</span>
        <span className="text-[9px]">LOW</span>
      </span>
    );
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/invoices/${id}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: `${currentPersona.name} (${currentPersona.org})` }),
      });
      onRefresh();
      fetchAssessments();
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
      fetchAssessments();
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
      fetchAssessments();
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
      fetchAssessments();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="enterprise-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-softGray text-slate-600 uppercase tracking-wider font-bold border-b border-softGray-border">
            <tr>
              <th className="py-3 px-4">Invoice / ID</th>
              <th className="py-3 px-4">Counterparties</th>
              <th className="py-3 px-4">Amount & Term</th>
              <th className="py-3 px-4">Ledger Status</th>
              <th className="py-3 px-4">AI Risk Score</th>
              <th className="py-3 px-4">Endorsements</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-softGray-border font-sans">
            {invoices.map((inv) => {
              const isLoading = actionLoading === inv.id;
              const assessment = assessmentsMap[inv.id];

              return (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Invoice ID & Number */}
                  <td className="py-3.5 px-4 font-mono">
                    <div className="font-bold text-navy text-xs">{inv.id}</div>
                    <div className="text-[11px] text-slate-500 font-semibold">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400 font-sans truncate max-w-[200px] mt-0.5">
                      {inv.description}
                    </div>
                  </td>

                  {/* Counterparties */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5 text-navy font-semibold">
                      <Building2 className="h-3.5 w-3.5 text-royal flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{inv.buyerOrg}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Supplier: <span className="text-slate-700 font-medium">{inv.supplierOrg}</span>
                    </div>
                  </td>

                  {/* Amount & Due Date */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-navy font-mono text-sm">
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </div>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {getStatusBadge(inv.status)}
                    {inv.status === 'FINANCED' && (
                      <div className="text-[10px] text-emerald-700 font-mono font-medium mt-1">
                        @ {inv.discountRate}% APR by {inv.financierOrg?.split(' ')[0]}
                      </div>
                    )}
                  </td>

                  {/* AI Risk Score Column */}
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onInspectProof(inv)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to view explainable risk assessment & evidence"
                    >
                      {getRiskBadge(assessment)}
                    </button>
                  </td>

                  {/* Endorsement Chain */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1">
                      {['SupplierMSP', 'BuyerMSP', 'FinancierMSP'].map((msp, idx) => {
                        const isEndorsed = inv.endorsementHistory.some((e) => e.orgMsp === msp);
                        return (
                          <span
                            key={idx}
                            title={`${msp}: ${isEndorsed ? 'Endorsed & Signed' : 'Pending'}`}
                            className={`h-2.5 w-5 rounded-sm transition-all ${
                              isEndorsed ? 'bg-emerald shadow-sm' : 'bg-slate-200'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {inv.endorsementHistory.length} of 3 Orgs Verified
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {/* Buyer Accept */}
                    {currentPersona.role === 'BUYER' && inv.status === 'CREATED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleAccept(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald hover:bg-emerald-dark text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        {isLoading ? 'Signing...' : 'Accept on DRUNIX'}
                      </button>
                    )}

                    {/* Supplier Request Financing */}
                    {currentPersona.role === 'SUPPLIER' && inv.status === 'ACCEPTED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleRequestFinancing(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-royal hover:bg-royal-hover text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
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
                          className="px-3.5 py-1.5 rounded-lg bg-royal hover:bg-royal-hover text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
                        >
                          {isLoading ? 'Financing...' : 'Finance @ 11% APR'}
                        </button>
                      )}

                    {/* Buyer Settle */}
                    {currentPersona.role === 'BUYER' && inv.status === 'FINANCED' && (
                      <button
                        disabled={isLoading}
                        onClick={() => handleSettle(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer"
                      >
                        {isLoading ? 'Settling...' : 'Settle Invoice'}
                      </button>
                    )}

                    {/* Proof Inspector Button */}
                    <button
                      onClick={() => onInspectProof(inv)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-softGray text-royal border border-softGray-border font-mono text-[11px] font-semibold transition-all shadow-sm cursor-pointer"
                    >
                      Proof & Risk
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
