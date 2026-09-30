import React, { useState, useEffect } from 'react';
import { UserPersona, Invoice } from '../types';
import { Briefcase, CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight, DollarSign, Percent, ShieldCheck } from 'lucide-react';

interface FinancingWorkflowViewProps {
  currentPersona: UserPersona;
  invoices: Invoice[];
  onRefresh: () => void;
}

export const FinancingWorkflowView: React.FC<FinancingWorkflowViewProps> = ({
  currentPersona,
  invoices,
  onRefresh,
}) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [offeredAmount, setOfferedAmount] = useState('');
  const [discountRate, setDiscountRate] = useState('8.5');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Request Financing Modal (for Supplier)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'x-user-role': currentPersona.role,
        'x-user-org': currentPersona.org,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/financing/requests', { headers });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.warn('Failed to load financing requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [currentPersona]);

  const handleApprove = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-role': currentPersona.role,
        'x-user-org': currentPersona.org,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/financing/requests/${selectedReq.id}/approve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          offeredAmount: offeredAmount ? Number(offeredAmount) : undefined,
          discountRate: Number(discountRate),
          decisionReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve financing');
      }

      setSelectedReq(null);
      setActionType(null);
      setDecisionReason('');
      onRefresh();
      fetchRequests();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReq) return;
    setSubmitting(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-role': currentPersona.role,
        'x-user-org': currentPersona.org,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/financing/requests/${selectedReq.id}/reject`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decisionReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject financing');
      }

      setSelectedReq(null);
      setActionType(null);
      setDecisionReason('');
      onRefresh();
      fetchRequests();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);

    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-role': currentPersona.role,
        'x-user-org': currentPersona.org,
        'x-user-id': currentPersona.name,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/financing/request', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          requestedAmount: requestedAmount ? Number(requestedAmount) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit financing request');
      }

      setIsRequestModalOpen(false);
      setSelectedInvoiceId('');
      setRequestedAmount('');
      onRefresh();
      fetchRequests();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Eligible invoices for Supplier
  const eligibleInvoices = invoices.filter(
    (inv) => inv.status === 'ACCEPTED' || inv.status === 'CREATED'
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="enterprise-card p-5 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Requests</div>
          <div className="text-2xl font-bold text-navy font-mono">
            {requests.filter((r) => r.financing_status === 'PENDING').length}
          </div>
          <div className="text-xs text-slate-400">Awaiting financier bids</div>
        </div>

        <div className="enterprise-card p-5 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Funded Requests</div>
          <div className="text-2xl font-bold text-emerald font-mono">
            {requests.filter((r) => r.financing_status === 'APPROVED').length}
          </div>
          <div className="text-xs text-slate-400">Endorsed on DRUNIX</div>
        </div>

        <div className="enterprise-card p-5 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Benchmark APR</div>
          <div className="text-2xl font-bold text-royal font-mono">8.5%</div>
          <div className="text-xs text-slate-400">vs 22.0% traditional</div>
        </div>

        <div className="enterprise-card p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action</div>
          {currentPersona.role === 'SUPPLIER' ? (
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="mt-2 py-2 px-3 rounded-lg bg-navy hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <Briefcase className="h-4 w-4" />
              <span>Request Financing</span>
            </button>
          ) : (
            <div className="text-xs text-slate-600 mt-2">
              Authorized role: <span className="font-bold text-navy">{currentPersona.role}</span>
            </div>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="enterprise-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-royal" />
            <span>DRUNIX Multi-Party Financing Requests</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">Total: {requests.length}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-royal"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No financing requests recorded. Eligible invoices can be submitted for funding.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-mono text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Invoice Ref</th>
                  <th className="p-3">Requested Amount</th>
                  <th className="p-3">Rate (APR)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Decision Reason</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-navy">{req.id}</td>
                    <td className="p-3 text-royal font-semibold">{req.invoice_id}</td>
                    <td className="p-3 font-bold">₹{Number(req.requested_amount).toLocaleString('en-IN')}</td>
                    <td className="p-3 text-emerald font-semibold">{req.discount_rate_apr || 8.5}%</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.financing_status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : req.financing_status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {req.financing_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-sans truncate max-w-xs">
                      {req.decision_reason || 'Pending underwriter review'}
                    </td>
                    <td className="p-3 text-right font-sans">
                      {currentPersona.role === 'FINANCIER' && req.financing_status === 'PENDING' ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('APPROVE');
                              setOfferedAmount(String(req.requested_amount));
                              setDiscountRate(String(req.discount_rate_apr || 8.5));
                            }}
                            className="px-2.5 py-1 bg-emerald text-white rounded font-semibold text-xs hover:bg-emerald-600 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('REJECT');
                            }}
                            className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 rounded font-semibold text-xs hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          {req.financing_status === 'APPROVED' ? 'Funded' : 'Locked'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal (Approve / Reject) */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 font-sans">
            <h3 className="text-base font-bold text-navy flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-royal" />
              <span>
                {actionType === 'APPROVE' ? 'Approve & Fund Invoice' : 'Reject Financing Request'}
              </span>
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {actionError}
              </div>
            )}

            {actionType === 'APPROVE' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Offered Amount (INR)</label>
                  <input
                    type="number"
                    value={offeredAmount}
                    onChange={(e) => setOfferedAmount(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-navy mb-1">Discount Rate APR (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={discountRate}
                    onChange={(e) => setDiscountRate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">
                Mandatory Underwriting Reason / Notes
              </label>
              <textarea
                required
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder="e.g. Verified buyer endorsement, prime risk score, satisfactory commercial history."
                className="w-full p-2 border border-slate-300 rounded text-xs"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={actionType === 'APPROVE' ? handleApprove : handleReject}
                className={`px-4 py-1.5 rounded text-xs font-semibold text-white ${
                  actionType === 'APPROVE' ? 'bg-emerald hover:bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Submitting...' : actionType === 'APPROVE' ? 'Confirm & Fund' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Financing Modal (Supplier) */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <form onSubmit={handleNewRequest} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 font-sans">
            <h3 className="text-base font-bold text-navy flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-royal" />
              <span>Submit Invoice for DRUNIX Financing</span>
            </h3>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">Select Accepted Invoice</label>
              <select
                required
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value);
                  const inv = invoices.find((i) => i.id === e.target.value);
                  if (inv) setRequestedAmount(String(inv.amount));
                }}
                className="w-full p-2 border border-slate-300 rounded text-xs"
              >
                <option value="">-- Choose Invoice --</option>
                {eligibleInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.id} ({inv.invoiceNumber}) - ₹{inv.amount.toLocaleString('en-IN')} [{inv.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy mb-1">Requested Financing Amount (INR)</label>
              <input
                type="number"
                required
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedInvoiceId}
                className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-navy hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit to Exchange'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
