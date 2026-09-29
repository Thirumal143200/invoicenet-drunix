import React, { useState, useRef } from 'react';
import {
  ExtractedInvoiceData,
  PurchaseOrderRecord,
  UserPersona,
} from '../types';
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  FileCheck2,
  Hash,
  Eye,
  ArrowRight,
  Sparkles,
  Calculator,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react';

interface DocumentReviewWorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: () => void;
  currentPersona: UserPersona;
}

export const DocumentReviewWorkspace: React.FC<DocumentReviewWorkspaceProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  currentPersona,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extraction, setExtraction] = useState<ExtractedInvoiceData | null>(null);
  const [selectedPo, setSelectedPo] = useState<string>('PO-2026-AUTOWORKS-092');
  const [activeTab, setActiveTab] = useState<'FIELDS' | 'LINE_ITEMS' | 'PO_MATCH'>('FIELDS');
  const [isSubmittingToLedger, setIsSubmittingToLedger] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Editable fields state
  const [editedFields, setEditedFields] = useState<{
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    supplierName: string;
    supplierGstin: string;
    buyerName: string;
    buyerGstin: string;
    amount: string;
    subtotal: string;
    taxAmount: string;
    description: string;
  }>({
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    supplierName: '',
    supplierGstin: '',
    buyerName: '',
    buyerGstin: '',
    amount: '',
    subtotal: '',
    taxAmount: '',
    description: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsUploading(true);
    setSubmitError(null);

    const formData = new FormData();
    formData.append('invoiceFile', selected);
    if (selectedPo) formData.append('poNumber', selectedPo);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process document');
      }

      const resData: ExtractedInvoiceData = data.data;
      setExtraction(resData);

      // Populate editable fields
      setEditedFields({
        invoiceNumber: resData.invoiceNumber.value || '',
        invoiceDate: resData.invoiceDate.value || '',
        dueDate: resData.dueDate.value || '',
        supplierName: resData.supplierName.value || 'TechParts Manufacturing Pvt. Ltd.',
        supplierGstin: resData.supplierGstin.value || '',
        buyerName: resData.buyerName.value || 'AutoWorks Industries Ltd.',
        buyerGstin: resData.buyerGstin.value || '',
        amount: resData.totalAmount.value ? String(resData.totalAmount.value) : '',
        subtotal: resData.subtotal.value ? String(resData.subtotal.value) : '',
        taxAmount: resData.taxAmount.value ? String(resData.taxAmount.value) : '',
        description: resData.lineItems[0]?.description || 'Automotive precision transmission components',
      });
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitToDrunix = async () => {
    if (!extraction) return;

    setIsSubmittingToLedger(true);
    setSubmitError(null);

    const buyerId = editedFields.buyerName.includes('AutoWorks') ? 'BY-201' : 'BY-202';

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber: editedFields.invoiceNumber,
          supplierId: 'SP-101',
          supplierOrg: editedFields.supplierName,
          buyerId,
          buyerOrg: editedFields.buyerName,
          amount: parseFloat(editedFields.amount),
          dueDate: editedFields.dueDate,
          description: editedFields.description,
          documentHash: extraction.documentHash,
          documentFileName: extraction.documentFileName,
          supplierGstin: editedFields.supplierGstin,
          buyerGstin: editedFields.buyerGstin,
          poNumber: selectedPo,
          subtotal: parseFloat(editedFields.subtotal) || undefined,
          taxAmount: parseFloat(editedFields.taxAmount) || undefined,
          lineItems: extraction.lineItems,
          aiVerification: {
            overallConfidence: extraction.overallConfidence,
            hasWarnings: !extraction.arithmeticValid || (extraction.poComparison && !extraction.poComparison.isMatched),
            poMatched: extraction.poComparison ? extraction.poComparison.isMatched : true,
            extractedAt: extraction.extractedAt,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit invoice to DRUNIX ledger');
      }

      onInvoiceCreated();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmittingToLedger(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-6xl bg-white border border-softGray-border rounded-2xl shadow-modal overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-light bg-navy text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-royal/20 text-royal-light">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">AI Document Intelligence & Review Workspace</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-royal text-white font-bold">
                  Gemini + OCR Vision
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Upload invoice (PDF, JPG, PNG) • Validate fields • Reconcile PO • Commit hash to DRUNIX
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-navy-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F8FAFC]">
          {/* Left Column: Document Upload & Preview */}
          <div className="w-full md:w-1/2 p-6 border-r border-softGray-border flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <Eye className="h-4 w-4 text-royal" />
                <span>Original Invoice Document</span>
              </span>
              {extraction && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-royal border border-blue-200">
                  {extraction.mimeType.split('/')[1].toUpperCase()} • {(extraction.fileSize / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Document Upload Area or Live Preview */}
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-h-[360px] border-2 border-dashed border-slate-300 hover:border-royal rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-white transition-all group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  className="hidden"
                />
                <div className="h-16 w-16 rounded-2xl bg-blue-50 text-royal flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-bold text-navy">Click to upload or drag & drop invoice</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Supported formats: Digital PDF, Scanned PDF, JPG, PNG (Max 10MB).
                </p>
                <div className="mt-4 flex items-center space-x-2 text-[11px] text-slate-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
                  <span>Files are hashed with SHA-256 and kept strictly off-chain</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-[360px] bg-white border border-softGray-border rounded-xl overflow-hidden shadow-sm">
                {/* File preview header */}
                <div className="p-3 border-b border-softGray-border bg-softGray flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="h-4 w-4 text-royal flex-shrink-0" />
                    <span className="font-semibold text-navy truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setExtraction(null);
                    }}
                    className="text-slate-500 hover:text-rose-600 font-semibold text-[11px]"
                  >
                    Change File
                  </button>
                </div>

                {/* Document Display / Preview */}
                <div className="flex-1 p-4 flex items-center justify-center bg-slate-50 overflow-hidden relative">
                  {isUploading ? (
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-royal mx-auto"></div>
                      <p className="text-xs font-semibold text-navy">
                        Analyzing layout, text streams & OCR with Gemini Intelligence...
                      </p>
                    </div>
                  ) : extraction ? (
                    <div className="w-full h-full flex flex-col justify-center items-center">
                      {extraction.mimeType.startsWith('image/') ? (
                        <img
                          src={`/api/documents/file/${extraction.documentFileName}`}
                          alt="Invoice Preview"
                          className="max-h-[380px] w-auto object-contain rounded border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[380px]">
                          <iframe
                            src={`/api/documents/file/${extraction.documentFileName}#toolbar=0`}
                            className="w-full h-full min-h-[380px] rounded border border-slate-200"
                            title="Invoice PDF"
                          />
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Cryptographic SHA-256 Fingerprint */}
                {extraction && (
                  <div className="p-3 bg-white border-t border-softGray-border font-mono text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 font-bold text-navy">
                        <Hash className="h-3 w-3 text-royal" />
                        <span>SHA-256 Fingerprint:</span>
                      </span>
                      <span className="text-emerald font-semibold font-mono text-[10px]">
                        Bound to On-Chain Tx
                      </span>
                    </div>
                    <div className="truncate text-slate-700 bg-softGray p-1.5 rounded border border-softGray-border">
                      {extraction.documentHash}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: AI Extraction & Review Panel */}
          <div className="w-full md:w-1/2 p-6 flex flex-col overflow-y-auto">
            {!extraction ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <FileCheck2 className="h-12 w-12 text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-navy">No Document Loaded Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Upload an invoice on the left to trigger the AI parser and view field confidence metrics.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Confidence & Engine Bar */}
                <div className="p-3 rounded-xl bg-white border border-softGray-border flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      Extraction Confidence
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-lg font-bold text-navy">
                        {Math.round(extraction.overallConfidence * 100)}%
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          extraction.overallConfidence >= 0.9
                            ? 'bg-emerald-50 text-emerald border border-emerald-200'
                            : 'bg-amber-50 text-amber border border-amber-200'
                        }`}
                      >
                        {extraction.overallConfidence >= 0.9 ? 'High Quality' : 'Review Required'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Engine</div>
                    <span className="text-xs font-mono font-semibold text-royal">
                      {extraction.extractionEngine}
                    </span>
                  </div>
                </div>

                {/* Duplicate Invoice Warning Banner */}
                {extraction.duplicateWarning?.isDuplicate && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2.5">
                    <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-800 leading-relaxed font-medium">
                      <strong>Duplicate Detected on DRUNIX:</strong> {extraction.duplicateWarning.message}
                    </div>
                  </div>
                )}

                {/* Arithmetic Check Banner */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    extraction.arithmeticValid
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4 flex-shrink-0" />
                    <span>{extraction.arithmeticMessage}</span>
                  </div>
                  {extraction.arithmeticValid ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber flex-shrink-0" />
                  )}
                </div>

                {/* Sub-tabs: Fields | Line Items | PO 3-Way Match */}
                <div className="flex border-b border-softGray-border space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('FIELDS')}
                    className={`pb-2 px-1 border-b-2 transition-all ${
                      activeTab === 'FIELDS' ? 'border-royal text-royal' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Invoice Fields
                  </button>
                  <button
                    onClick={() => setActiveTab('LINE_ITEMS')}
                    className={`pb-2 px-1 border-b-2 transition-all ${
                      activeTab === 'LINE_ITEMS' ? 'border-royal text-royal' : 'border-transparent text-slate-500'
                    }`}
                  >
                    Line Items ({extraction.lineItems.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('PO_MATCH')}
                    className={`pb-2 px-1 border-b-2 transition-all flex items-center space-x-1.5 ${
                      activeTab === 'PO_MATCH' ? 'border-royal text-royal' : 'border-transparent text-slate-500'
                    }`}
                  >
                    <span>3-Way PO Match</span>
                    {extraction.poComparison && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          extraction.poComparison.isMatched ? 'bg-emerald' : 'bg-amber'
                        }`}
                      />
                    )}
                  </button>
                </div>

                {/* Sub-tab 1: FIELDS FORM */}
                {activeTab === 'FIELDS' && (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-softGray-border">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-navy">Invoice Number</label>
                          <span
                            className={`text-[10px] font-mono font-semibold ${
                              extraction.invoiceNumber.confidence >= 0.9 ? 'text-emerald' : 'text-amber'
                            }`}
                          >
                            {Math.round(extraction.invoiceNumber.confidence * 100)}%
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editedFields.invoiceNumber}
                          onChange={(e) => setEditedFields({ ...editedFields, invoiceNumber: e.target.value })}
                          className={`w-full text-xs font-mono font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none ${
                            extraction.invoiceNumber.status === 'REVIEW_NEEDED'
                              ? 'border-amber bg-amber-50/40 text-navy'
                              : 'border-softGray-border text-navy focus:border-royal'
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-navy">Total Amount (₹)</label>
                          <span className="text-[10px] font-mono font-semibold text-emerald">
                            {Math.round(extraction.totalAmount.confidence * 100)}%
                          </span>
                        </div>
                        <input
                          type="number"
                          value={editedFields.amount}
                          onChange={(e) => setEditedFields({ ...editedFields, amount: e.target.value })}
                          className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Invoice Date</label>
                        <input
                          type="date"
                          value={editedFields.invoiceDate}
                          onChange={(e) => setEditedFields({ ...editedFields, invoiceDate: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Due Date</label>
                        <input
                          type="date"
                          value={editedFields.dueDate}
                          onChange={(e) => setEditedFields({ ...editedFields, dueDate: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Supplier Organization</label>
                        <input
                          type="text"
                          value={editedFields.supplierName}
                          onChange={(e) => setEditedFields({ ...editedFields, supplierName: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Buyer Organization</label>
                        <input
                          type="text"
                          value={editedFields.buyerName}
                          onChange={(e) => setEditedFields({ ...editedFields, buyerName: e.target.value })}
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Supplier GSTIN</label>
                        <input
                          type="text"
                          value={editedFields.supplierGstin}
                          onChange={(e) => setEditedFields({ ...editedFields, supplierGstin: e.target.value })}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Buyer GSTIN</label>
                        <input
                          type="text"
                          value={editedFields.buyerGstin}
                          onChange={(e) => setEditedFields({ ...editedFields, buyerGstin: e.target.value })}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">Taxable Subtotal (₹)</label>
                        <input
                          type="number"
                          value={editedFields.subtotal}
                          onChange={(e) => setEditedFields({ ...editedFields, subtotal: e.target.value })}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-navy mb-1 block">GST Tax Amount (₹)</label>
                        <input
                          type="number"
                          value={editedFields.taxAmount}
                          onChange={(e) => setEditedFields({ ...editedFields, taxAmount: e.target.value })}
                          className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-navy mb-1 block">Description</label>
                      <input
                        type="text"
                        value={editedFields.description}
                        onChange={(e) => setEditedFields({ ...editedFields, description: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-softGray-border text-navy focus:outline-none focus:border-royal"
                      />
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: LINE ITEMS */}
                {activeTab === 'LINE_ITEMS' && (
                  <div className="bg-white p-4 rounded-xl border border-softGray-border space-y-2">
                    <div className="text-xs font-bold text-navy mb-2">Itemized Breakdown</div>
                    {extraction.lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg soft-panel flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-navy">{item.description}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Qty: {item.quantity} × ₹{item.unitPrice.toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div className="font-bold font-mono text-navy">
                          ₹{item.total.toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-tab 3: PO 3-WAY MATCH */}
                {activeTab === 'PO_MATCH' && extraction.poComparison && (
                  <div className="bg-white p-4 rounded-xl border border-softGray-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy">Reference Purchase Order:</span>
                      <span className="text-xs font-mono font-bold text-royal">
                        {extraction.poComparison.poNumber}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        extraction.poComparison.isMatched
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold mb-1">
                        {extraction.poComparison.isMatched ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald" />
                            <span>3-Way PO Reconciliation Passed (100% Match)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber" />
                            <span>Purchase Order Discrepancies Detected</span>
                          </>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Authorized PO Amount: ₹{extraction.poComparison.poAmount?.toLocaleString('en-IN')}
                      </div>

                      {extraction.poComparison.discrepancies.length > 0 && (
                        <ul className="list-disc pl-4 mt-2 space-y-1 text-[11px] text-amber-800">
                          {extraction.poComparison.discrepancies.map((d, didx) => (
                            <li key={didx}>{d}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {submitError}
                  </div>
                )}

                {/* Commitment Action Bar */}
                <div className="p-4 rounded-xl bg-white border border-softGray-border flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Ready to sign with <strong className="text-navy">{currentPersona.orgMsp}</strong>
                  </div>

                  <button
                    onClick={handleCommitToDrunix}
                    disabled={isSubmittingToLedger || extraction.duplicateWarning?.isDuplicate}
                    className="px-5 py-2.5 rounded-lg bg-royal hover:bg-royal-hover text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Layers className="h-4 w-4" />
                    <span>
                      {isSubmittingToLedger
                        ? 'Broadcasting to DRUNIX Peer...'
                        : 'Commit Verified Invoice to DRUNIX'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-softGray-border bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-softGray hover:bg-slate-200 text-xs font-semibold text-slate-700"
          >
            Close Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
