import { Request, Response } from 'express';
import { CopilotService } from '../services/copilotService';
import { UserPersonaContext, CopilotTools } from '../services/copilotTools';

export class CopilotController {
  /**
   * Parse persona context strictly from verified request headers.
   * Never trust client body for privilege elevation.
   */
  public static parsePersona(req: Request): UserPersonaContext | null {
    const rawRole = (req.headers['x-user-role'] as string) || '';
    const normalizedRole = rawRole.toUpperCase();

    if (!['SUPPLIER', 'BUYER', 'FINANCIER', 'EXPLORER'].includes(normalizedRole)) {
      return null;
    }

    const userId = (req.headers['x-user-id'] as string) || 'SP-101 (Priya Sharma)';
    const orgName = (req.headers['x-user-org'] as string) || 'TechParts Manufacturing Pvt. Ltd.';
    const orgMsp = (req.headers['x-user-msp'] as string) || 'SupplierMSP';

    return {
      role: normalizedRole as UserPersonaContext['role'],
      userId,
      orgName,
      orgMsp,
    };
  }

  /**
   * POST /api/copilot/chat
   * Handle chat requests with role-aware security and tool grounding
   */
  public static async chat(req: Request, res: Response) {
    try {
      const persona = CopilotController.parsePersona(req);
      if (!persona) {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_ROLE: Access denied. A verified role header (SUPPLIER, BUYER, FINANCIER, EXPLORER) is required.',
        });
      }

      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Message string is required and cannot be empty.',
        });
      }

      if (message.length > 3000) {
        return res.status(400).json({
          success: false,
          error: 'Message exceeds the maximum permitted length of 3000 characters.',
        });
      }

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
      if (err.message?.includes('REQUEST_TIMEOUT')) {
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
   * GET /api/copilot/suggestions
   * Get role-tailored starter queries
   */
  public static async getSuggestions(req: Request, res: Response) {
    try {
      const persona = CopilotController.parsePersona(req);
      if (!persona) {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_ROLE: Verified role header is required.',
        });
      }

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
   * GET /api/copilot/history
   * Retrieve active session conversation history
   */
  public static async getHistory(req: Request, res: Response) {
    try {
      const persona = CopilotController.parsePersona(req);
      if (!persona) {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_ROLE: Verified role header is required.',
        });
      }

      const history = CopilotService.getHistory(persona.userId);
      return res.json({
        success: true,
        data: {
          userId: persona.userId,
          role: persona.role,
          count: history.length,
          messages: history,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * DELETE /api/copilot/history
   * Clear active conversation session
   */
  public static async clearHistory(req: Request, res: Response) {
    try {
      const persona = CopilotController.parsePersona(req);
      if (!persona) {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_ROLE: Verified role header is required.',
        });
      }

      CopilotService.clearHistory(persona.userId);
      return res.json({
        success: true,
        message: 'Conversation history cleared successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/copilot/proof/:invoiceId
   * Retrieve cryptographic ledger proof & evidence card for an invoice
   */
  public static async getBlockchainProof(req: Request, res: Response) {
    try {
      const invoiceId = req.params.invoiceId;
      const persona = CopilotController.parsePersona(req);
      if (!persona) {
        return res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_ROLE: Verified role header is required.',
        });
      }

      const proof = await CopilotTools.getLedgerProof(persona, { invoiceIdOrNumber: invoiceId });
      if (!proof.found) {
        return res.status(404).json({ success: false, error: proof.error });
      }
      if (!proof.authorized) {
        return res.status(403).json({ success: false, error: proof.error });
      }

      return res.json({
        success: true,
        data: proof.proof,
        evidence: proof.evidence,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}
