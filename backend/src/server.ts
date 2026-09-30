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
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

// Configure CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-user-org', 'x-user-msp'],
    credentials: true,
  })
);

app.use(express.json());

// Root endpoint for service discovery
app.get('/', (req, res) => {
  res.json({
    service: 'InvoiceNet DRUNIX API Gateway',
    status: 'ONLINE',
    version: '1.0.0',
    healthCheck: '/health',
    channel: 'invoicenet-channel',
    network: 'DRUNIX MSME Testnet (NPCI DLT Framework)',
    documentation: 'https://github.com/Thirumal143200/invoicenet-drunix',
  });
});

// Health check endpoints (both /health and /api/health for Render/Docker probes)
const healthHandler = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'InvoiceNet DRUNIX API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    geminiEnabled: !!process.env.GEMINI_API_KEY,
    drunixChannel: 'invoicenet-channel',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/cashflow', cashFlowRoutes);
app.use('/api/risk', riskRoutes);

// Safe centralized error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled request error:', err.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && !err.isPublic ? 'An internal error occurred. Please try again.' : err.message,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`🚀 InvoiceNet DRUNIX Core API running on http://${HOST}:${PORT}`);
  console.log(`🔗 Channel: invoicenet-channel`);
  console.log(`🏛️ Orgs: SupplierMSP, BuyerMSP, FinancierMSP`);
  console.log(`🤖 Gemini: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'OFFLINE (Local FinTech Reasoner active)'}`);
  console.log(`=================================================`);
});
