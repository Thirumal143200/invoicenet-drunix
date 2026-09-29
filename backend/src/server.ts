import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes';
import blockchainRoutes from './routes/blockchainRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import documentRoutes from './routes/documentRoutes';
import copilotRoutes from './routes/copilotRoutes';
import fraudRoutes from './routes/fraudRoutes';
import cashFlowRoutes from './routes/cashFlowRoutes';
import riskRoutes from './routes/riskRoutes';
import path from 'path';
import { DocumentIntelligenceService } from './services/documentIntelligenceService';
import { CopilotService } from './services/copilotService';
import { FraudDetectionService } from './services/fraudDetectionService';
import { CashFlowForecastService } from './services/cashFlowForecastService';
import { InvoiceRiskEngineService } from './services/invoiceRiskEngineService';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize services
DocumentIntelligenceService.initializeGemini();
CopilotService.initializeGemini();
FraudDetectionService.initialize();
CashFlowForecastService.initialize();
InvoiceRiskEngineService.initialize();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-user-org', 'x-user-msp'],
}));

app.use(express.json());

// Health & Root
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'InvoiceNet DRUNIX API Gateway',
    version: '1.0.0',
    geminiEnabled: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/cashflow', cashFlowRoutes);
app.use('/api/risk', riskRoutes);

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 InvoiceNet DRUNIX Core API running on port ${PORT}`);
  console.log(`🔗 Channel: invoicenet-channel`);
  console.log(`🏛️ Orgs: SupplierMSP, BuyerMSP, FinancierMSP`);
  console.log(`=================================================`);
});
