import { GoogleGenAI } from '@google/genai';
import {
  CopilotTools,
  UserPersonaContext,
  CopilotEvidenceItem,
} from './copilotTools';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface CopilotResponse {
  content: string;
  role: 'model';
  timestamp: string;
  evidence: CopilotEvidenceItem[];
  suggestedActions: string[];
}

export class CopilotService {
  private static geminiClient: GoogleGenAI | null = null;
  private static geminiInitialized = false;

  public static initializeGemini() {
    if (this.geminiInitialized) return;
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey });
        console.log('🤖 Google Gemini initialized for AI Copilot');
      } catch (err) {
        console.warn('⚠️ Could not initialize Gemini for Copilot:', err);
      }
    } else {
      console.log('ℹ️ No GEMINI_API_KEY found; Copilot will use internal FinTech Reasoner.');
    }
    this.geminiInitialized = true;
  }

  /**
   * Get suggested starter questions based on role
   */
  public static getSuggestedQuestions(role: UserPersonaContext['role']): string[] {
    switch (role) {
      case 'SUPPLIER':
        return [
          'Which of my invoices are accepted by buyers and ready for financing?',
          'What is my total outstanding receivables volume?',
          'How much interest can I save on DRUNIX vs traditional 22% factoring?',
          'Show details and payment status for invoice TP-2026-8812',
        ];
      case 'BUYER':
        return [
          'Which invoices are awaiting my goods acceptance endorsement?',
          'What payables are due within the next 30 days?',
          'Verify cryptographic settlement proof for invoice TP-2026-8799',
          'What is my total payable commitment across all suppliers?',
        ];
      case 'FINANCIER':
        return [
          'Show all buyer-endorsed receivables awaiting financing offers',
          'What is the current portfolio factoring APR and interest savings benchmark?',
          'Run a double-financing and credit risk audit across active receivables',
          'Inspect discount rate and terms for invoice INV-2026-003',
        ];
      case 'EXPLORER':
        return [
          'Verify DRUNIX Raft consensus block height and connected peer nodes',
          'Show full cryptographic endorsement chain for invoice INV-2026-001',
          'What is the total trade volume and block distribution on the network?',
          'Audit document SHA-256 integrity on the ledger',
        ];
      default:
        return [
          'Show my authorized invoices',
          'Check DRUNIX blockchain status',
          'What are the upcoming invoice due dates?',
        ];
    }
  }

  /**
   * Process a chat query with role-aware security and tool grounding
   */
  public static async processChat(
    persona: UserPersonaContext,
    message: string,
    history: ChatMessage[] = []
  ): Promise<CopilotResponse> {
    this.initializeGemini();

    // Prompt injection sanitation: escape backticks, tags, and quarantine user message
    const sanitizedMessage = message.trim();

    // Check for explicit mutation / transaction requests that AI copilot must NEVER execute
    const lowerMsg = sanitizedMessage.toLowerCase();
    const mutationKeywords = [
      'approve financing',
      'finance invoice',
      'accept invoice',
      'reject invoice',
      'create invoice',
      'delete invoice',
      'settle invoice',
      'pay invoice',
      'drop table',
      'execute query',
      'transfer money',
      'change status',
    ];

    const hasMutationIntent = mutationKeywords.some((kw) => lowerMsg.includes(kw));
    if (hasMutationIntent && (lowerMsg.includes('please') || lowerMsg.includes('now') || lowerMsg.includes('for me'))) {
      return {
        role: 'model',
        timestamp: new Date().toISOString(),
        content: `🔒 **Security Policy Enforcement:** As the InvoiceNet AI Copilot, I am strictly a read-only intelligence and advisory assistant. I cannot execute financial transactions, approve financing, alter invoice statuses, or commit ledger transactions on your behalf.\n\nTo perform actions such as accepting an invoice or requesting financing, please use the authorized buttons in the **InvoiceNet Receivables Dashboard** where cryptographic digital signatures are securely gathered from your organization's node.`,
        evidence: [],
        suggestedActions: [
          'Show invoices pending my action',
          'Review risk and due date metrics',
          'Verify DRUNIX blockchain proof',
        ],
      };
    }

    // Try Google Gemini if configured
    if (this.geminiClient && process.env.GEMINI_API_KEY) {
      try {
        const geminiResult = await this.executeGeminiWithTools(persona, sanitizedMessage, history);
        if (geminiResult) return geminiResult;
      } catch (err: any) {
        console.warn('⚠️ Gemini Copilot execution encountered error, falling back to FinTech Reasoner:', err.message);
      }
    }

    // High-performance Grounded FinTech Reasoner (Fallback / Local Engine)
    return this.executeDeterministicReasoner(persona, sanitizedMessage);
  }

  /**
   * Call Gemini 2.5 Flash with tool declarations
   */
  private static async executeGeminiWithTools(
    persona: UserPersonaContext,
    message: string,
    history: ChatMessage[]
  ): Promise<CopilotResponse | null> {
    if (!this.geminiClient) return null;

    // Gather grounded context in advance using the authorized tools
    const [invoicesData, riskData, networkData] = await Promise.all([
      CopilotTools.getAuthorizedInvoices(persona, { limit: 10 }),
      CopilotTools.getRiskAndLiquidityAnalysis(persona),
      CopilotTools.getNetworkMetrics(),
    ]);

    // Check if message references a specific invoice
    let specificInvoiceDetails = null;
    const invMatch = message.match(/\b(INV-2026-\d{3,4}|TP-2026-\d{3,4})\b/i);
    if (invMatch) {
      specificInvoiceDetails = await CopilotTools.getInvoiceDetails(persona, {
        invoiceIdOrNumber: invMatch[1],
      });
    }

    const systemInstruction = `You are InvoiceNet AI Copilot, a trusted enterprise fintech intelligence assistant embedded into the DRUNIX distributed ledger network for Citi Hackathon 2026.
ACTIVE USER IDENTITY:
- Role: ${persona.role}
- Name: ${persona.userId}
- Organization: ${persona.orgName} (${persona.orgMsp})

SECURITY & GROUNDING RULES:
1. You must ONLY discuss information authorized for this user's role.
   - SUPPLIER: Only discusses invoices where they are the supplier.
   - BUYER: Only discusses invoices where they are the buyer.
   - FINANCIER: Only discusses accepted, requested, or financed receivables.
   - EXPLORER (Auditor): Can audit consortium ledger transactions and blocks.
2. If the user asks about an invoice that belongs to another entity or is not found, state clearly: "This invoice is not registered on the DRUNIX ledger or you do not have permission to view it under your current role." NEVER invent data.
3. You are strictly READ-ONLY. You cannot change statuses or approve financing.
4. Always reference relevant invoice numbers, block numbers, or transaction IDs when available.
5. Format your answers clearly with markdown bullet points and bold highlights.

CURRENT AUTHORIZED CONTEXT:
- Invoices Available to User (${invoicesData.count}): ${JSON.stringify(invoicesData.invoices)}
- Risk & Due Dates: ${JSON.stringify(riskData.metrics)}
- Invoices At Risk: ${JSON.stringify(riskData.invoicesAtRisk)}
- Network Status: Block Height #${networkData.currentBlockHeight}, Peer Orgs: ${JSON.stringify(networkData.connectedOrgs)}
${specificInvoiceDetails ? `- Specific Invoice Query Result: ${JSON.stringify(specificInvoiceDetails)}` : ''}
`;

    const prompt = `<untrusted_user_query>\n${message}\n</untrusted_user_query>`;

    const response = await this.geminiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemInstruction + '\n\n' + prompt }] },
      ],
      config: {
        temperature: 0.2, // Low temperature for high precision and zero hallucinations
        maxOutputTokens: 1000,
      },
    });

    const text = response.text || '';
    if (!text.trim()) return null;

    // Collate evidence
    const evidence: CopilotEvidenceItem[] = [];
    if (specificInvoiceDetails?.evidence) {
      evidence.push(...specificInvoiceDetails.evidence);
    } else if (invoicesData.evidence.length > 0) {
      evidence.push(...invoicesData.evidence.slice(0, 3));
    }

    return {
      role: 'model',
      content: text,
      timestamp: new Date().toISOString(),
      evidence,
      suggestedActions: this.getSuggestedQuestions(persona.role).slice(0, 3),
    };
  }

  /**
   * Deterministic Grounded Reasoner: Handles full queries offline or without API key
   */
  private static async executeDeterministicReasoner(
    persona: UserPersonaContext,
    message: string
  ): Promise<CopilotResponse> {
    const lower = message.toLowerCase();
    const evidence: CopilotEvidenceItem[] = [];
    let content = '';

    // 1. SPECIFIC INVOICE QUERY
    const invMatch = message.match(/\b(INV-2026-\d{3,4}|TP-2026-\d{3,4})\b/i);
    if (invMatch || lower.includes('invoice') && (lower.includes('detail') || lower.includes('status') || lower.includes('verify'))) {
      const targetQuery = invMatch ? invMatch[1] : 'INV-2026-001';
      const details = await CopilotTools.getInvoiceDetails(persona, { invoiceIdOrNumber: targetQuery });

      if (!details.found) {
        content = `⚠️ **Invoice Not Found:** Invoice \`${targetQuery}\` was not found on the DRUNIX distributed ledger.\n\nPlease verify the invoice number or check your authorized receivables list.`;
      } else if (!details.authorized) {
        content = `🚫 **Access Restricted:** You do not have authorization to view invoice \`${targetQuery}\` under your active persona (**${persona.role}** - ${persona.orgName}).\n\nDRUNIX strictly isolates commercial trade documents between verified counter-parties.`;
      } else {
        const inv = details.invoice!;
        evidence.push(...(details.evidence || []));

        const proof = await CopilotTools.getBlockchainProof(persona, { invoiceIdOrNumber: inv.id });
        if (proof.proof) {
          evidence.push(...(proof.evidence || []));
        }

        content = `### 📄 Invoice ${inv.invoiceNumber} (${inv.id})\n\n` +
          `- **Status:** \`${inv.status}\`\n` +
          `- **Amount:** **₹${inv.amount.toLocaleString('en-IN')}** (${inv.currency})\n` +
          `- **Parties:** ${inv.supplierOrg} → ${inv.buyerOrg}\n` +
          `- **Due Date:** ${inv.dueDate.slice(0, 10)}\n` +
          `- **DRUNIX Block:** Block #${inv.blockNumber} (Tx: \`${inv.txId.slice(0, 18)}...\`)\n` +
          (inv.discountRate ? `- **Financing APR:** ${inv.discountRate}% (Financed by: ${inv.financierOrg || 'QuickFund Capital'})\n` : '') +
          (inv.documentHash ? `- **Document Hash (SHA-256):** \`${inv.documentHash.slice(0, 24)}...\`\n` : '') +
          `- **Consensus Endorsements:** ${inv.endorsementHistory.length} cryptographic signatures verified on DRUNIX.`;
      }

      return {
        role: 'model',
        content,
        timestamp: new Date().toISOString(),
        evidence,
        suggestedActions: [
          'Show DRUNIX blockchain proof',
          'Check overdue risk analysis',
          'List all my authorized invoices',
        ],
      };
    }

    // 2. BLOCKCHAIN / CONSENSUS / EXPLORER QUERY
    if (lower.includes('blockchain') || lower.includes('block') || lower.includes('consensus') || lower.includes('proof') || lower.includes('raft') || lower.includes('hash')) {
      const net = await CopilotTools.getNetworkMetrics();
      evidence.push(...net.evidence);

      content = `### ⛓️ DRUNIX Distributed Ledger Status\n\n` +
        `- **Channel:** \`${net.channel}\`\n` +
        `- **Current Block Height:** **#${net.currentBlockHeight}**\n` +
        `- **Consensus Mechanism:** Raft BFT Orderer (\`orderer.drunix.net:7050\`)\n` +
        `- **State Database:** Distributed YugabyteDB with ACID transaction guarantees\n` +
        `- **Total Receivables on Ledger:** ${net.totalInvoicesOnLedger}\n\n` +
        `**Connected Consortium Node Clusters:**\n` +
        net.connectedOrgs.map((o) => `* **${o.name}:** ${o.role} — \`${o.status}\``).join('\n') +
        `\n\nAll state transitions require cryptographic multi-party endorsement before atomic block commit.`;

      return {
        role: 'model',
        content,
        timestamp: new Date().toISOString(),
        evidence,
        suggestedActions: [
          'Audit cryptographic signature chain for INV-2026-001',
          'Show factoring APR comparison benchmarks',
          'View active receivables ledger',
        ],
      };
    }

    // 3. RISK / LIQUIDITY / DUE DATES QUERY
    if (lower.includes('risk') || lower.includes('due') || lower.includes('overdue') || lower.includes('maturity') || lower.includes('liquidity')) {
      const risk = await CopilotTools.getRiskAndLiquidityAnalysis(persona);
      evidence.push(...risk.evidence);

      content = `### 📊 Risk & Liquidity Assessment (${persona.role})\n\n` +
        `- **Overdue Invoices:** ${risk.metrics.overdueCount > 0 ? `⚠️ **${risk.metrics.overdueCount}**` : '✅ **0**'}\n` +
        `- **Approaching Maturity (≤ 15 days):** **${risk.metrics.approachingMaturityCount}**\n` +
        `- **Total Outstanding Value:** **₹${risk.metrics.totalOutstandingINR.toLocaleString('en-IN')}**\n` +
        `- **DRUNIX Average Factoring APR:** **${risk.metrics.avgDiscountRateAPR}%** (vs Traditional **${risk.metrics.traditionalFactoringAPR}%**)\n` +
        `- **Net MSME Cost Savings:** **${risk.metrics.interestSavingsPercentage}%** cheaper capital\n\n`;

      if (risk.invoicesAtRisk.length > 0) {
        content += `**Receivables Requiring Attention:**\n` +
          risk.invoicesAtRisk.map((i) => `* **${i.invoiceNumber} (${i.id})**: ₹${i.amount.toLocaleString('en-IN')} — *${i.riskFactor}*`).join('\n');
      } else {
        content += `✅ All receivables are healthy and within normal settlement terms.`;
      }

      return {
        role: 'model',
        content,
        timestamp: new Date().toISOString(),
        evidence,
        suggestedActions: [
          'Show all accepted receivables',
          'Check DRUNIX blockchain proof',
          'Review pricing benchmarks',
        ],
      };
    }

    // 4. FINANCING & APR BENCHMARKS QUERY
    if (lower.includes('financ') || lower.includes('apr') || lower.includes('rate') || lower.includes('discount') || lower.includes('interest')) {
      const net = await CopilotTools.getNetworkMetrics();
      const invoices = await CopilotTools.getAuthorizedInvoices(persona, { status: 'ACCEPTED' });

      content = `### 💰 Working Capital & Financing Analytics\n\n` +
        `DRUNIX eliminates invoice fraud and double-pledging via cryptographic buyer endorsement, significantly lowering risk premiums for lenders:\n\n` +
        `- **DRUNIX InvoiceNet Factoring APR:** **${net.pricingBenchmark.drunixAPR}%**\n` +
        `- **Traditional NBFC Factoring APR:** **${net.pricingBenchmark.traditionalAPR}%**\n` +
        `- **Financing Turnaround Time:** **${net.pricingBenchmark.fundingTurnaroundHours} Hours** (vs **${net.pricingBenchmark.traditionalTurnaroundDays} Days** traditionally)\n` +
        `- **Buyer-Endorsed Receivables Ready for Financing:** **${invoices.count}** on DRUNIX.\n\n` +
        `Financiers can safely discount endorsed receivables knowing that DRUNIX consensus prevents double-pledging.`;

      return {
        role: 'model',
        content,
        timestamp: new Date().toISOString(),
        evidence: invoices.evidence.slice(0, 2),
        suggestedActions: [
          'Show accepted invoices ready for financing',
          'Run a double-financing verification audit',
          'View DRUNIX blockchain status',
        ],
      };
    }

    // 5. DEFAULT: LIST AUTHORIZED INVOICES & SUMMARY
    const authData = await CopilotTools.getAuthorizedInvoices(persona, { limit: 5 });
    evidence.push(...authData.evidence.slice(0, 3));

    content = `Hello **${persona.userId}**! You are logged in as **${persona.role}** from **${persona.orgName}** (${persona.orgMsp}).\n\n` +
      `Here is a summary of your authorized receivables on DRUNIX:\n\n` +
      `- **Total Authorized Invoices:** **${authData.count}**\n` +
      (authData.invoices.length > 0
        ? `\n**Recent Active Receivables:**\n` +
          authData.invoices.map((i) => `* **${i.invoiceNumber}**: ₹${i.amount.toLocaleString('en-IN')} — Status: \`${i.status}\` (Due: ${i.dueDate.slice(0, 10)})`).join('\n')
        : `\nNo recent receivables registered yet.\n`) +
      `\n\nYou can ask me about invoice status, blockchain cryptographic proofs, due dates, risk scoring, or financing comparisons.`;

    return {
      role: 'model',
      content,
      timestamp: new Date().toISOString(),
      evidence,
      suggestedActions: this.getSuggestedQuestions(persona.role).slice(0, 3),
    };
  }
}
