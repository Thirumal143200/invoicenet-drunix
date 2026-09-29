import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  DocumentIntelligenceService,
  SAMPLE_PURCHASE_ORDERS,
} from '../services/documentIntelligenceService';

export class DocumentController {
  /**
   * Upload invoice document & perform AI document intelligence extraction
   */
  public static async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No document file uploaded. Supported formats: PDF, JPG, PNG (Max 10MB).',
        });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const mimeType = req.file.mimetype;
      const poNumber = req.body.poNumber || req.query.poNumber as string;

      const extraction = await DocumentIntelligenceService.processInvoiceDocument(
        filePath,
        originalName,
        mimeType,
        poNumber
      );

      res.json({
        success: true,
        message: 'Invoice document parsed and cryptographically fingerprinted successfully',
        data: extraction,
      });
    } catch (err: any) {
      console.error('Document processing error:', err);
      res.status(500).json({
        success: false,
        error: `Document extraction failed: ${err.message}`,
      });
    }
  }

  /**
   * Securely serve uploaded document file for split-screen preview
   */
  public static async getDocumentFile(req: Request, res: Response) {
    try {
      const fileName = path.basename(req.params.filename); // Sanitized from path traversal
      const filePath = path.join(__dirname, '../../uploads', fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Document file not found' });
      }

      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retrieve authorized Purchase Orders for 3-way matching
   */
  public static getPurchaseOrders(req: Request, res: Response) {
    res.json({
      success: true,
      data: SAMPLE_PURCHASE_ORDERS,
    });
  }

  /**
   * Validate user-corrected manual entries against arithmetic & compliance rules
   */
  public static verifyCorrection(req: Request, res: Response) {
    const { subtotal, taxAmount, totalAmount, supplierGstin, buyerGstin } = req.body;

    const warnings: string[] = [];
    const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (supplierGstin && !GSTIN_REGEX.test(supplierGstin.trim())) {
      warnings.push('Supplier GSTIN is not formatted as valid 15-character Indian GST identifier.');
    }
    if (buyerGstin && !GSTIN_REGEX.test(buyerGstin.trim())) {
      warnings.push('Buyer GSTIN is not formatted as valid 15-character Indian GST identifier.');
    }

    if (typeof subtotal === 'number' && typeof taxAmount === 'number' && typeof totalAmount === 'number') {
      const diff = Math.abs(subtotal + taxAmount - totalAmount);
      if (diff > 1.0) {
        warnings.push(`Arithmetic discrepancy: Subtotal (₹${subtotal}) + Tax (₹${taxAmount}) does not equal Total (₹${totalAmount}).`);
      }
    }

    res.json({
      success: true,
      isValid: warnings.length === 0,
      warnings,
    });
  }
}
