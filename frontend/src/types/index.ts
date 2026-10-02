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

export type CopilotEvidenceSource =
  | 'DRUNIX ledger data'
  | 'InvoiceNet application data'
  | 'AI-generated explanation'
  | 'Forecast or estimate';

export interface CopilotEvidenceItem {
  type: 'INVOICE' | 'BLOCKCHAIN_TX' | 'RISK_ALERT' | 'NETWORK_METRIC' | 'PURCHASE_ORDER' | 'LIFECYCLE';
  title: string;
  source?: CopilotEvidenceSource;
  sourceTimestamp?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  status?: string;
  txId?: string;
  blockNumber?: number;
  documentHash?: string;
  riskFindings?: string;
  poMatchStatus?: string;
  details?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  evidence?: CopilotEvidenceItem[];
  suggestedActions?: string[];
  isError?: boolean;
}

export type AnomalyType =
  | 'REPEATED_INVOICE_REFERENCE'
  | 'REPEATED_FINANCING_ATTEMPT'
  | 'UNUSUAL_INVOICE_AMOUNT'
  | 'PAYMENT_DETAILS_MODIFICATION'
  | 'UNUSUAL_TRANSACTION_FREQUENCY'
  | 'INVOICE_HISTORY_INCONSISTENCY';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type InvestigationStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorOrg: string;
  action: string;
  notes?: string;
  previousStatus?: InvestigationStatus;
  newStatus?: InvestigationStatus;
}

export interface InvestigationNote {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  note: string;
}

export interface FraudAlert {
  id: string;
  anomalyType: AnomalyType;
  severity: AlertSeverity;
  status: InvestigationStatus;
  invoiceId: string;
  invoiceNumber: string;
  supplierId: string;
  supplierOrg: string;
  buyerId: string;
  buyerOrg: string;
  amount: number;
  detectedAt: string;
  headline: string;
  evidence: {
    description: string;
    metrics?: Record<string, any>;
    conflictingInvoiceId?: string;
    conflictingTxId?: string;
    expectedValue?: string | number;
    observedValue?: string | number;
    drunixProof?: {
      blockNumber: number;
      txId: string;
      signatureHash: string;
      documentHash?: string;
    };
  };
  geminiExplanation?: string;
  investigationNotes: InvestigationNote[];
  auditTrail: AuditLogEntry[];
}

export interface FraudMetrics {
  totalAlerts: number;
  highSeverityCount: number;
  openCases: number;
  underReviewCases: number;
  resolvedCases: number;
  falsePositives: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  statusBreakdown: {
    open: number;
    underReview: number;
    resolved: number;
    falsePositive: number;
  };
}

export type ForecastScenario = 'BASELINE' | 'EARLY_PAYMENT' | 'DELAYED_PAYMENT' | 'DRUNIX_FINANCING';

export interface ForecastBucket {
  periodLabel: string;
  daysRange: string;
  expectedAmount: number;
  optimisticAmount: number;
  conservativeAmount: number;
  invoicesCount: number;
  confidenceScore: number;
  isRuleBasedEstimate: boolean;
}

export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  counterParty: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
  drunixTxId: string;
}

export interface CashFlowForecastResult {
  role: 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'EXPLORER';
  userOrg: string;
  currency: string;
  generatedAt: string;
  activeScenario: ForecastScenario;
  metrics: {
    totalOutstanding: number;
    totalOverdue: number;
    totalSettled: number;
    overdueCount: number;
    averageSettlementLagDays: number;
    acceleratedLiquidityPotentialINR: number;
  };
  horizonSummary: {
    next7Days: number;
    next30Days: number;
    next90Days: number;
  };
  timelineBuckets: ForecastBucket[];
  overdueInvoices: OverdueInvoiceItem[];
  methodologyExplanation: {
    approach: string;
    historicalDataUsed: boolean;
    buyerSampleCount: number;
    notes: string[];
  };
  geminiInsightsBrief: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskCategory = RiskLevel;

export interface DetectedRiskFactor {
  id: string;
  category:
    | 'REFERENCE'
    | 'AMOUNT'
    | 'DATE_TERMS'
    | 'PO_RECONCILIATION'
    | 'ENDORSEMENT_STATE'
    | 'CREDIT_MITIGANT'
    | 'METADATA'
    | 'IDENTITY'
    | 'ARITHMETIC';
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scoreImpact: number;
  description: string;
  evidence: Record<string, any>;
}

export interface GeminiRiskExplanation {
  summary: string;
  keyConcerns: string[];
  supportingEvidence: string[];
  recommendedReviewActions: string[];
  limitations: string[];
  // Backward compatibility fields
  executiveSummary?: string;
  keyObservations?: string[];
  underwritingAssessment?: string;
  recommendedAction?: string;
}

export interface InvoiceRiskAssessment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierOrg: string;
  buyerOrg: string;
  amount: number;
  currency: string;
  riskScore: number; // 0 to 100
  riskCategory: RiskLevel; // 0-29 Low, 30-59 Medium, 60-79 High, 80-100 Critical
  riskLevel: RiskLevel; // Alias
  confidence: number;
  confidenceScore: number; // Alias
  individualRiskFactors: DetectedRiskFactor[];
  detectedFactors: DetectedRiskFactor[]; // Alias
  evidence: {
    drunixProof: {
      blockNumber: number;
      txId: string;
      signatureHash?: string;
      documentHash?: string;
    };
    poMatch?: {
      poNumber?: string;
      registered: boolean;
      amountDifference?: number;
      isExactMatch?: boolean;
    };
    statisticalBaseline?: {
      historicalAverage?: number;
      zScore?: number;
      multipleOfMean?: number;
      priorInvoicesCount: number;
    };
    arithmeticCheck?: {
      subtotal?: number;
      taxAmount?: number;
      totalAmount?: number;
      isValid?: boolean;
      discrepancy?: number;
    };
    identityCheck?: {
      supplierGstin?: string;
      isFormatValid?: boolean;
      supplierOrgMatch?: boolean;
    };
  };
  explanation: GeminiRiskExplanation;
  scoreCalculationExplanation: string;
  dataLimitations: string[];
  recommendedAction: string;
  assessmentTimestamp: string;
  analyzedAt: string; // Alias
  analyzedBy: string;
}

export interface PredictionFactor {
  factor: string;
  impact: string;
  description: string;
  category: 'HISTORICAL_BEHAVIOR' | 'ENDORSEMENT_STATE' | 'AMOUNT_TIER' | 'DATE_PROXIMITY';
}

export interface PredictedPaymentItem {
  id: string;
  invoiceNumber: string;
  direction: 'INCOMING' | 'OUTGOING';
  counterParty: string;
  counterPartyOrg: string;
  supplierOrg: string;
  buyerOrg: string;
  amount: number;
  currency: string;
  originalDueDate: string;
  expectedPaymentDate: string;
  predictedDelayDays: number;
  isPotentialLate: boolean;
  isOverdue: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidenceScore: number;
  isEstimated: boolean;
  modelType: 'EMPIRICAL_COUNTERPARTY_LAG_MODEL' | 'RULE_BASED_CONTRACTUAL_ESTIMATE';
  status: string;
  predictionFactors: PredictionFactor[];
  recommendedAction: string;
  drunixTxId?: string;
  blockNumber?: number;
}

export interface DailyCashFlowPoint {
  date: string;
  dayLabel: string;
  dayOfWeek: string;
  dayIndex: number;
  incomingAmount: number;
  outgoingAmount: number;
  netAmount: number;
  cumulativeCashFlow: number;
  transactionsCount: number;
  transactions: Array<{
    invoiceId: string;
    invoiceNumber: string;
    direction: 'INCOMING' | 'OUTGOING';
    counterParty: string;
    amount: number;
    expectedDate: string;
    isPotentialLate: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
}

export interface CounterpartyPaymentProfile {
  counterPartyOrg: string;
  settledInvoicesCount: number;
  averageLagDays: number;
  stdDevLagDays: number;
  onTimePaymentRate: number;
  hasSufficientHistory: boolean;
  dataSource: 'POSTGRESQL' | 'DRUNIX_LEDGER_IN_MEMORY';
}

export interface PaymentForecastSummary {
  totalForecastedIncoming30d: number;
  totalForecastedOutgoing30d: number;
  netCashFlow30d: number;
  totalOverdueAmount: number;
  totalAtRiskAmount: number;
  potentialLateInvoicesCount: number;
  onTimeInvoicesCount: number;
  totalActiveInvoicesCount: number;
  averageCounterpartyLagDays: number;
  overallOnTimeRate: number;
}

export interface PaymentForecastResult {
  role: 'SUPPLIER' | 'BUYER' | 'FINANCIER' | 'AUDITOR' | 'EXPLORER' | 'ADMIN';
  userOrg: string;
  currency: string;
  generatedAt: string;
  asOfDate: string;
  summary: PaymentForecastSummary;
  dailyTimeline30Days: DailyCashFlowPoint[];
  predictedPayments: PredictedPaymentItem[];
  counterpartyProfiles: Record<string, CounterpartyPaymentProfile>;
  methodology: {
    approach: string;
    historicalSettlementsAnalyzed: number;
    hasSufficientHistory: boolean;
    disclaimer: string;
  };
}

export interface InvoiceReminder {
  id: string;
  invoice_id: string;
  invoice_number: string;
  recipient_user_id?: string;
  recipient_organization_id: string;
  recipient_email?: string;
  recipient_role: 'BUYER' | 'SUPPLIER' | 'FINANCIER';
  reminder_type: 'BEFORE_7_DAYS' | 'BEFORE_3_DAYS' | 'DUE_TODAY' | 'OVERDUE_1_DAY' | 'OVERDUE_3_DAYS' | 'OVERDUE_7_DAYS';
  interval_days: number;
  due_date: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'DISMISSED';
  channel: 'IN_APP' | 'EMAIL' | 'BOTH';
  email_delivery_status: 'DELIVERED' | 'FAILED' | 'SKIPPED' | 'MOCKED';
  email_message_id?: string;
  error_message?: string;
  is_read: boolean;
  read_at?: string;
  metadata?: {
    buyerOrg?: string;
    supplierOrg?: string;
    daysDifference?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ReminderSummary {
  totalReminders: number;
  upcomingCount: number;
  dueTodayCount: number;
  overdueCount: number;
  unreadCount: number;
  deliveredEmailsCount: number;
  failedEmailsCount: number;
  emailConfigured: boolean;
}

export interface ReminderPreference {
  id: string;
  user_id: string;
  organization_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  enabled_intervals: number[];
  overdue_alerts_enabled: boolean;
  minimum_amount: number;
  created_at: string;
  updated_at: string;
}

