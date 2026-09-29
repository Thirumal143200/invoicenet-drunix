import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import invoiceRoutes from './routes/invoiceRoutes';
import blockchainRoutes from './routes/blockchainRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import documentRoutes from './routes/documentRoutes';
import { DocumentIntelligenceService } from './services/documentIntelligenceService';

dotenv.config();

// Initialize Google Gemini if API key is present
DocumentIntelligenceService.initializeGemini();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 InvoiceNet DRUNIX Core API running on port ${PORT}`);
  console.log(`🔗 Channel: invoicenet-channel`);
  console.log(`🏛️ Orgs: SupplierMSP, BuyerMSP, FinancierMSP`);
  console.log(`=================================================`);
});
