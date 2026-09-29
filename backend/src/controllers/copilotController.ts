import { Request, Response } from 'express';
import { CopilotService } from '../services/copilotService';
import { UserPersonaContext, CopilotTools } from '../services/copilotTools';

export class CopilotController {
  /**
   * Helper to parse persona context securely from request headers or body
   */
  private static parsePersona(req: Request): UserPersonaContext {
    const roleHeader = (req.headers['x-user-role'] as string) || req.body?.persona?.role || 'SUPPLIER';
    const userId = (req.headers['x-user-id'] as string) || req.body?.persona?.name || req.body?.persona?.userId || 'SP-101 (Priya Sharma)';
    const orgName = (req.headers['x-user-org'] as string) || req.body?.persona?.org || 'TechParts Manufacturing Pvt. Ltd.';
    const orgMsp = (req.headers['x-user-msp'] as string) || req.body?.persona?.orgMsp || 'SupplierMSP';

    const normalizedRole = ['SUPPLIER', 'BUYER', 'FINANCIER', 'EXPLORER'].includes(roleHeader.toUpperCase())
      ? (roleHeader.toUpperCase() as UserPersonaContext['role'])
      : 'SUPPLIER';

    return {
      role: normalizedRole,
      userId,
      orgName,
      orgMsp,
    };
  }

  /**
   * Handle chat requests with request timeout and role authorization
   */
  public static async chat(req: Request, res: Response) {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message string is required and cannot be empty.',
        });
      }

      const persona = CopilotController.parsePersona(req);

      // Enforce 15-second request timeout
      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('REQUEST_TIMEOUT: AI Copilot inference exceeded 15 seconds.')), timeoutMs)
      );

      const chatPromise = CopilotService.processChat(persona, message, conversationHistory);
      const reply = await Promise.race([chatPromise, timeoutPromise]);

      return res.json({
        success: true,
        data: reply,
      });
    } catch (err: any) {
      console.error('❌ Copilot chat error:', err.message);
      if (err.message.includes('REQUEST_TIMEOUT')) {
        return res.status(504).json({
          success: false,
          error: 'The AI Copilot request timed out while contacting the intelligence service. Please try again.',
        });
      }
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal error in AI Copilot service.',
      });
    }
  }

  /**
   * Get role-tailored suggested queries
   */
  public static async getSuggestions(req: Request, res: Response) {
    try {
      const persona = CopilotController.parsePersona(req);
      const suggestions = CopilotService.getSuggestedQuestions(persona.role);

      return res.json({
        success: true,
        data: {
          role: persona.role,
          suggestions,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get blockchain evidence for an invoice
   */
  public static async getBlockchainProof(req: Request, res: Response) {
    try {
      const invoiceId = req.params.invoiceId;
      const persona = CopilotController.parsePersona(req);

      const proof = await CopilotTools.getBlockchainProof(persona, { invoiceIdOrNumber: invoiceId });
      if (!proof.found) {
        return res.status(404).json({ success: false, error: proof.error });
      }
      if (!proof.authorized) {
        return res.status(403).json({ success: false, error: proof.error });
      }

      return res.json({
        success: true,
        data: proof.proof,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
