export type InvoiceStatus =
  | 'CREATED'
  | 'ACCEPTED'
  | 'FINANCING_REQUESTED'
  | 'FINANCED'
  | 'SETTLED'
  | 'REJECTED'
  | 'CANCELLED';

export interface EndorsementRecord {
  orgMsp: 'SupplierMSP' | 'BuyerMSP' | 'FinancierMSP';
  actorId: string;
  action: string;
  txId: string;
  timestamp: string;
  signatureHash: string;
  verified: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierOrg: string;
  buyerId: string;
  buyerOrg: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  description: string;
  status: InvoiceStatus;
  financierId?: string;
  financierOrg?: string;
  discountRate?: number;
  financedAmount?: number;
  paymentReference?: string;
  rejectionReason?: string;
  settlementDate?: string;
  createdAt: string;
  updatedAt: string;
  blockNumber: number;
  txId: string;
  endorsementHistory: EndorsementRecord[];
  documentHash?: string;
  documentFileName?: string;
  supplierGstin?: string;
  buyerGstin?: string;
  poNumber?: string;
  subtotal?: number;
  taxAmount?: number;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  aiVerification?: {
    overallConfidence: number;
    hasWarnings: boolean;
    poMatched: boolean;
    extractedAt: string;
  };
}

export interface FieldVerification<T> {
  value: T | null;
  confidence: number;
  status: 'VERIFIED' | 'REVIEW_NEEDED' | 'MISSING';
  warning?: string;
  source?: 'DIGITAL_PARSER' | 'GEMINI_AI' | 'OCR_HEURISTIC' | 'USER_CORRECTED';
}

export interface ExtractedLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
}

export interface ExtractedInvoiceData {
  documentHash: string;
  documentFileName: string;
  fileSize: number;
  mimeType: string;
  invoiceNumber: FieldVerification<string>;
  invoiceDate: FieldVerification<string>;
  dueDate: FieldVerification<string>;
  supplierName: FieldVerification<string>;
  supplierGstin: FieldVerification<string>;
  buyerName: FieldVerification<string>;
  buyerGstin: FieldVerification<string>;
  currency: FieldVerification<string>;
  subtotal: FieldVerification<number>;
  taxAmount: FieldVerification<number>;
  totalAmount: FieldVerification<number>;
  lineItems: ExtractedLineItem[];
  arithmeticValid: boolean;
  arithmeticMessage?: string;
  poComparison?: {
    poNumber?: string;
    isMatched: boolean;
    poAmount?: number;
    discrepancies: string[];
  };
  duplicateWarning?: {
    isDuplicate: boolean;
    existingInvoiceId?: string;
    existingTxId?: string;
    message?: string;
  };
  overallConfidence: number;
  extractionEngine: 'GEMINI_MULTIMODAL' | 'PDF_NATIVE_STREAM' | 'DETERMINISTIC_HYBRID';
  extractedAt: string;
}

export interface PurchaseOrderRecord {
  poNumber: string;
  buyerOrg: string;
  supplierOrg: string;
  amount: number;
  currency: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
}

export interface BlockchainBlock {
  blockNumber: number;
  blockHash: string;
  previousHash: string;
  dataHash: string;
  transactionsCount: number;
  timestamp: string;
  transactions: {
    txId: string;
    action: string;
    invoiceId: string;
    mspId: string;
    signature: string;
  }[];
}

export interface AnalyticsMetrics {
  totalVolumeINR: number;
  totalFinancedINR: number;
  pipelineVolumeINR: number;
  invoiceCount: number;
  financedCount: number;
  averageDiscountRateAPR: number;
  traditionalFactoringRateAPR: number;
  interestSavingsPercentage: string;
  defaultRatePercent: number;
  averageFundingTurnaroundHours: number;
  traditionalTurnaroundDays: number;
}

export type PersonaRole = 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'EXPLORER';

export interface UserPersona {
  role: PersonaRole;
  name: string;
  org: string;
  orgMsp: 'SupplierMSP' | 'BuyerMSP' | 'FinancierMSP' | 'NetworkAuditor';
  badgeColor: string;
}
