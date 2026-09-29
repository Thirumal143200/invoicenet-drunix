import { Request, Response } from 'express';
import { drunixGateway } from '../services/drunixGateway';

export class BlockchainController {
  public static getStatus(req: Request, res: Response) {
    const status = drunixGateway.getNetworkStatus();
    res.json({ success: true, data: status });
  }

  public static getBlocks(req: Request, res: Response) {
    const blocks = drunixGateway.getBlocks();
    res.json({ success: true, data: blocks });
  }

  public static async getProof(req: Request, res: Response) {
    const invoice = await drunixGateway.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const proof = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      status: invoice.status,
      blockNumber: invoice.blockNumber,
      txId: invoice.txId,
      endorsementCount: invoice.endorsementHistory.length,
      endorsements: invoice.endorsementHistory,
      multiOrgVerified: invoice.endorsementHistory.length >= 2,
      drunixChannel: 'invoicenet-channel',
      immutabilityProof: {
        hashAlgorithm: 'SHA-256',
        ledgerEngine: 'Hyperledger Fabric 2.5 on DRUNIX',
        stateDatabase: 'YugabyteDB (Distributed SQL)',
      },
    };

    res.json({ success: true, data: proof });
  }
}
