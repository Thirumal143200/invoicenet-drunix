import React, { useState } from 'react';
import { Invoice } from '../types';
import { DollarSign, CheckCircle2, X } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onPaymentRecorded,
}) => {
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : '');
  const [paymentReference, setPaymentReference] = useState(`RTGS-CITI-${Date.now().toString().slice(-6)}`);
  const [paymentMethod, setPaymentMethod] = useState('RTGS/NEFT');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('invoicenet_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: Number(amount),
          paymentReference,
          paymentMethod,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 font-sans border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-emerald" />
            <h3 className="text-base font-bold text-navy">Record Commercial Settlement</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>Invoice Ref:</span>
              <span className="font-bold text-navy">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Beneficiary (Supplier):</span>
              <span className="font-bold text-navy truncate max-w-[200px]">{invoice.supplierOrg}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Outstanding Due:</span>
              <span className="font-bold text-emerald">₹{invoice.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Settlement Amount (INR)</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Bank Payment Reference (UTR / Tx ID)</label>
            <input
              type="text"
              required
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-xs"
            >
              <option value="RTGS/NEFT">RTGS / NEFT Interbank Transfer</option>
              <option value="CITI_TREASURY_TRANSFER">Citi Treasury API Direct Settlement</option>
              <option value="NACH_ESCROW">NACH Corporate Mandate</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">Notes / Reconciliation Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Full invoice settlement upon inspection certificate acceptance."
              className="w-full p-2 border border-slate-300 rounded text-xs"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded text-xs font-semibold text-white bg-emerald hover:bg-emerald-600 disabled:opacity-50 flex items-center space-x-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? 'Recording...' : 'Confirm Settlement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
