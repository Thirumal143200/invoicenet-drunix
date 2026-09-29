import React, { useState } from 'react';
import { PlusCircle, X, ShieldCheck } from 'lucide-react';
import { UserPersona } from '../types';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: () => void;
  currentPersona: UserPersona;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  currentPersona,
}) => {
  const [formData, setFormData] = useState({
    invoiceNumber: `TP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    buyerId: 'BY-201',
    buyerOrg: 'AutoWorks Industries Ltd.',
    amount: '650000',
    dueDate: '2026-12-30',
    description: 'Precision alloy powertrain components - Batch #104',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: formData.invoiceNumber,
          supplierId: 'SP-101',
          supplierOrg: 'TechParts Manufacturing Pvt. Ltd.',
          buyerId: formData.buyerId,
          buyerOrg: formData.buyerOrg,
          amount: parseFloat(formData.amount),
          dueDate: formData.dueDate,
          description: formData.description,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit invoice to DRUNIX ledger');
      }

      onInvoiceCreated();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-white border border-softGray-border rounded-xl shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-light bg-navy text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-royal/20 text-royal-light">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create & Register Trade Receivable</h3>
              <p className="text-xs text-slate-300">Signs & commits block onto DRUNIX invoicenet-channel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-navy block mb-1">Invoice Number</label>
              <input
                type="text"
                required
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-medium focus:outline-none focus:border-royal"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-navy block mb-1">Face Value (INR ₹)</label>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-mono font-bold focus:outline-none focus:border-royal"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-navy block mb-1">Buyer Organization</label>
              <select
                value={formData.buyerOrg}
                onChange={(e) => {
                  const org = e.target.value;
                  const id = org.includes('AutoWorks') ? 'BY-201' : 'BY-202';
                  setFormData({ ...formData, buyerOrg: org, buyerId: id });
                }}
                className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-medium focus:outline-none focus:border-royal"
              >
                <option value="AutoWorks Industries Ltd.">AutoWorks Industries Ltd. (BY-201)</option>
                <option value="Metro Fleet Mobility Corp">Metro Fleet Mobility Corp (BY-202)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-navy block mb-1">Payment Due Date</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-medium focus:outline-none focus:border-royal"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-navy block mb-1">Deliverables Description</label>
            <textarea
              rows={2}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-white border border-softGray-border rounded-lg px-3 py-2 text-xs text-navy font-medium focus:outline-none focus:border-royal"
            />
          </div>

          {/* Supplier Signing Notice */}
          <div className="p-3 rounded-lg soft-panel flex items-center space-x-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-royal flex-shrink-0" />
            <span>
              Submitting registers this asset under <strong className="text-navy">SupplierMSP</strong> with an ECDSA signature stamped into DRUNIX world state.
            </span>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-softGray-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-softGray-border hover:bg-softGray text-xs font-semibold text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-royal hover:bg-royal-hover text-xs font-bold text-white transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Registering on DRUNIX...' : 'Register on Ledger'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
