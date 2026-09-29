# InvoiceNet — DRUNIX Multi-Party MSME Invoice Financing Platform

> **Citi FinTech Hackathon 2026**  
> **Problem Themes:** Real-Time Payments • Real Asset Tokenization • Financial Inclusion • Open FinTech

---

## 1. Executive Summary

India's 63 million MSMEs face over **₹20 lakh crore (~$240B)** trapped in delayed receivables, with average payment cycles stretching 60 to 120 days. Traditional invoice discounting costs **18% to 24% APR** due to the inability of financiers to verify invoice authenticity and the epidemic of **double-financing fraud** (pledging the same invoice to multiple lenders).

**InvoiceNet** solves this by establishing a decentralized, multi-party invoice verification and financing network on **DRUNIX (NPCI Distributed Ledger Platform)**. By requiring cryptographic endorsement from the Buyer's Organization directly on the ledger, receivables are transformed into bankable, verifiable digital assets—slashing financing costs from **22% to 11% APR** and reducing funding turnaround from **21 days to under 3.5 hours**.

---

## 2. Why DRUNIX is the Core DLT Engine

| Requirement | Traditional Database / API | How DRUNIX Solves It |
|---|---|---|
| **Multi-Party Trust** | Central database operator can be compromised or altered. | DRUNIX multi-org endorsement (`SupplierMSP`, `BuyerMSP`, `FinancierMSP`). Cryptographic signatures are immutable. |
| **Double-Financing Prevention** | Lenders have no shared registry; fraud exceeds ₹5,000 Cr/yr. | DRUNIX state machine and consensus strictly prevents double-pledging. Attempted second financing transactions are rejected on-chain. |
| **State Database & Analytics** | Requires exporting to secondary data warehouses. | DRUNIX features native **YugabyteDB (Distributed SQL)**, allowing financiers to execute real-time SQL risk analytics directly against the ledger state. |
| **High Scalability** | Heavy monolithic blockchain nodes bottleneck throughput. | DRUNIX **Lite Peer (LP)** and **VSSC** architecture decouples endorsement from state storage, enabling horizontal scaling for millions of invoices. |

---

## 3. End-to-End Invoice Lifecycle on DRUNIX

```
[Supplier: Priya Sharma (TechParts)]
        │
        ▼ (1) CreateInvoice -> DRUNIX Lite Peer (SupplierMSP)
  [Status: CREATED]
        │
        ▼ (2) AcceptInvoice -> DRUNIX Lite Peer (BuyerMSP Endorsement)
  [Status: ACCEPTED] ⭐ Cryptographic proof of buyer goods acknowledgment
        │
        ▼ (3) RequestFinancing -> DRUNIX Exchange
  [Status: FINANCING_REQUESTED]
        │
        ▼ (4) FinanceInvoice -> Tri-Party Endorsement (Supplier + Buyer + Financier MSP)
  [Status: FINANCED] 🛡️ Double-financing cryptographically locked
        │
        ▼ (5) SettleInvoice on Due Date -> Buyer pays via bank rails (UPI/NEFT)
  [Status: SETTLED]
```

---

## 4. Project Monorepo Structure

```
Innovation Hackathon/
├── chaincode/                     # Go Smart Contract for DRUNIX
│   ├── invoicenet.go              # Core chaincode logic with multi-party endorsement
│   └── go.mod
├── drunix-network/                # DRUNIX 3-Org Topology Configuration
│   ├── docker-compose-3org.yaml   # Raft Orderer, 3 Orgs (Supplier, Buyer, Financier), YugabyteDB
│   └── configtx.yaml              # MSP and channel endorsement policies
├── backend/                       # Node.js + TypeScript + Express REST Gateway
│   ├── src/
│   │   ├── services/drunixGateway.ts  # Fabric Gateway SDK & live cryptographic DLT engine
│   │   ├── controllers/               # Invoices, Blockchain Explorer, Analytics
│   │   ├── routes/                    # API endpoints
│   │   └── server.ts                  # Port 5000 API server
│   ├── package.json
│   └── tsconfig.json
├── frontend/                      # Next.js / Vite React + Tailwind CSS Web App
│   ├── src/
│   │   ├── components/                # Persona Switcher, Blockchain Proof Modal, Defense Simulator
│   │   ├── types/                     # Shared DLT & Invoice interfaces
│   │   └── App.tsx                    # Interactive dashboard with live tabs
│   ├── package.json
│   └── tailwind.config.js
└── docs/                          # Architecture blueprints & jury defense
    ├── README.md
    └── DRUNIX_INTEGRATION.md
```

---

## 5. Live Demo Script (5-Minute Jury Pitch)

1. **The Problem (1 min):**
   - Present the ₹20L crore MSME liquidity crisis.
   - Explain why double-financing fraud and unverifiable invoices inflate factoring rates to 22% APR.
2. **The DRUNIX Solution (1 min):**
   - Switch persona to **Priya Sharma (Supplier)**: Register invoice `TP-2026-8812` for ₹5,00,000.
   - Switch persona to **Rajesh Kumar (Buyer)**: Click **"Accept on DRUNIX"** to issue BuyerMSP endorsement.
   - Click **"Proof"** to show the cryptographic signatures and SHA-256 block hash.
3. **Competitive Moat: The Double-Financing Attack Test (1.5 min):**
   - Click **"Double-Financing Attack Test"** in the top navigation.
   - Simulate a rogue lender ("Shadow Capital") attempting to pledge an already-financed invoice.
   - Watch DRUNIX consensus return `FRAUD_ALERT: DOUBLE_FINANCING_REJECTED` in real-time!
4. **Financing & Quantitative Impact (1.5 min):**
   - Switch to **Ananya Patel (Financier)**: Discount the invoice at 11% APR (vs 22% traditional).
   - Show the Quantitative MSME Impact tab: 50% interest cost reduction, 3.5-hour liquidity turnaround.

---

## 6. Local Quickstart

### Running the Backend API:
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

### Running the Frontend UI:
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:3000
```
