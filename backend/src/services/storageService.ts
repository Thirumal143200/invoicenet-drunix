import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface StorageResult {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  localPath: string;
  provider: 'LOCAL_EPHEMERAL' | 'SUPABASE_STORAGE' | 'S3_COMPATIBLE';
}

export class StorageService {
  private static uploadsDir = path.join(__dirname, '../../uploads');

  public static initialize() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Save an uploaded document buffer or file, computing SHA-256 hash and unique storage key
   */
  public static async storeDocument(
    sourcePath: string,
    originalName: string,
    mimeType: string
  ): Promise<StorageResult> {
    this.initialize();

    // Verify file exists
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Source file ${sourcePath} not found`);
    }

    const fileBuffer = fs.readFileSync(sourcePath);
    const fileSize = fileBuffer.length;

    // MIME and size validation
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      throw new Error(`Unsupported file type: ${mimeType}. Allowed formats: PDF, JPG, PNG.`);
    }

    if (fileSize > 10 * 1024 * 1024) {
      throw new Error(`File size ${(fileSize / (1024 * 1024)).toFixed(2)}MB exceeds maximum 10MB limit.`);
    }

    // SHA-256 Cryptographic Digest
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Randomized storage key
    const ext = path.extname(originalName).toLowerCase() || '.pdf';
    const storageKey = `inv-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const destinationPath = path.join(this.uploadsDir, storageKey);

    // Save locally
    fs.writeFileSync(destinationPath, fileBuffer);

    // If Supabase Storage or S3 credentials are configured:
    const storageProvider = process.env.STORAGE_PROVIDER || 'local';
    let provider: StorageResult['provider'] = 'LOCAL_EPHEMERAL';

    if (storageProvider === 'supabase' && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';
        const uploadUrl = `${process.env.SUPABASE_URL}/storage/v1/object/${bucket}/${storageKey}`;
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': mimeType,
          },
          body: fileBuffer,
        });
        if (res.ok) {
          provider = 'SUPABASE_STORAGE';
          console.log(`☁️ Uploaded ${storageKey} to Supabase Storage bucket "${bucket}"`);
        }
      } catch (err: any) {
        console.warn('Supabase storage upload failed, falling back to local storage:', err.message);
      }
    }

    return {
      storageKey,
      fileName: originalName,
      fileSize,
      mimeType,
      sha256Hash,
      localPath: destinationPath,
      provider,
    };
  }

  /**
   * Get file stream or buffer for secure preview
   */
  public static getDocumentStream(storageKey: string): { stream: fs.ReadStream; mimeType: string } | null {
    this.initialize();
    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(this.uploadsDir, sanitizedKey);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const ext = path.extname(sanitizedKey).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';

    return {
      stream: fs.createReadStream(filePath),
      mimeType,
    };
  }
}
