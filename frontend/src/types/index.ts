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
