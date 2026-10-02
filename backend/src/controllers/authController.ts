import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb, isDatabasePostgres, query, DbUser, DbOrganization } from '../db';
import { JWT_SECRET } from '../middleware/authMiddleware';

export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user and associate with an organization
   */
  public static async register(req: Request, res: Response) {
    try {
      const { fullName, email, password, role, organizationId, organizationName, gstin } = req.body;

      if (!fullName || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required registration fields: fullName, email, password, and role are mandatory.',
        });
      }

      const validRoles = ['SUPPLIER', 'BUYER', 'FINANCIER', 'AUDITOR', 'ADMIN'];
      const normalizedRole = role.toUpperCase();
      if (!validRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role specified. Must be one of: ${validRoles.join(', ')}`,
        });
      }

      // Check existing email
      if (isDatabasePostgres()) {
        const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (existing && existing.rows.length > 0) {
          return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
        }
      } else {
        for (const u of inMemoryDb.users.values()) {
          if (u.email.toLowerCase() === email.toLowerCase().trim()) {
            return res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
          }
        }
      }

      // Resolve or create organization
      let targetOrgId = organizationId;
      if (!targetOrgId && organizationName) {
        // Create new organization
        targetOrgId = `ORG-${uuidv4().slice(0, 8).toUpperCase()}`;
        const newOrg: DbOrganization = {
          id: targetOrgId,
          organization_name: organizationName.trim(),
          organization_type: normalizedRole,
          msp_id: `${normalizedRole.charAt(0) + normalizedRole.slice(1).toLowerCase()}MSP`,
          gstin: gstin || undefined,
          verification_status: 'VERIFIED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (isDatabasePostgres()) {
          await query(
            `INSERT INTO organizations (id, organization_name, organization_type, msp_id, gstin, verification_status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [newOrg.id, newOrg.organization_name, newOrg.organization_type, newOrg.msp_id, newOrg.gstin, newOrg.verification_status]
          );
        } else {
          inMemoryDb.organizations.set(newOrg.id, newOrg);
        }
      } else if (!targetOrgId) {
        // Assign default organization based on role
        for (const org of inMemoryDb.organizations.values()) {
          if (org.organization_type === normalizedRole) {
            targetOrgId = org.id;
            break;
          }
        }
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `USR-${uuidv4().slice(0, 8).toUpperCase()}`;

      const newUser: DbUser = {
        id: userId,
        full_name: fullName.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: normalizedRole as any,
        organization_id: targetOrgId,
        account_status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (isDatabasePostgres()) {
        await query(
          `INSERT INTO users (id, full_name, email, password_hash, role, organization_id, account_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [newUser.id, newUser.full_name, newUser.email, newUser.password_hash, newUser.role, newUser.organization_id, newUser.account_status]
        );
      } else {
        inMemoryDb.users.set(newUser.id, newUser);
      }

      // Generate JWT
      const token = jwt.sign(
        {
          sub: newUser.id,
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          orgId: newUser.organization_id,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Fetch org details for response
      let orgDetails: DbOrganization | undefined;
      if (isDatabasePostgres()) {
        const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [newUser.organization_id]);
        if (orgRes && orgRes.rows.length > 0) orgDetails = orgRes.rows[0];
      } else {
        orgDetails = inMemoryDb.organizations.get(newUser.organization_id);
      }

      // Record audit log
      inMemoryDb.auditLogs.push({
        id: `AUDIT-${uuidv4().slice(0, 8)}`,
        user_id: newUser.id,
        user_name: newUser.full_name,
        organization_id: newUser.organization_id,
        action: 'USER_REGISTERED',
        entity_type: 'USER',
        entity_id: newUser.id,
        metadata: { role: newUser.role, email: newUser.email },
        created_at: new Date().toISOString(),
      });

      return res.status(201).json({
        success: true,
        message: 'Account created and authenticated successfully.',
        data: {
          token,
          user: {
            id: newUser.id,
            fullName: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            organizationId: newUser.organization_id,
            organizationName: orgDetails?.organization_name || 'Enterprise Member',
            mspId: orgDetails?.msp_id || `${newUser.role}MSP`,
          },
        },
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ success: false, error: `Registration failed: ${err.message}` });
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate with email & password, returning JWT
   */
  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      let dbUser: DbUser | undefined;
      let dbOrg: DbOrganization | undefined;

      if (isDatabasePostgres()) {
        const userRes = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (userRes && userRes.rows.length > 0) {
          dbUser = userRes.rows[0];
          if (dbUser?.organization_id) {
            const orgRes = await query('SELECT * FROM organizations WHERE id = $1', [dbUser.organization_id]);
            if (orgRes && orgRes.rows.length > 0) dbOrg = orgRes.rows[0];
          }
        }
      } else {
        for (const u of inMemoryDb.users.values()) {
          if (u.email.toLowerCase() === email.toLowerCase().trim()) {
            dbUser = u;
            if (u.organization_id) dbOrg = inMemoryDb.organizations.get(u.organization_id);
            break;
          }
        }
      }

      if (!dbUser) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, dbUser.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      if (dbUser.account_status !== 'ACTIVE') {
        return res.status(403).json({ success: false, error: 'Your account is suspended or pending approval.' });
      }

      const token = jwt.sign(
        {
          sub: dbUser.id,
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          orgId: dbUser.organization_id,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Audit log
      inMemoryDb.auditLogs.push({
        id: `AUDIT-${uuidv4().slice(0, 8)}`,
        user_id: dbUser.id,
        user_name: dbUser.full_name,
        organization_id: dbUser.organization_id,
        action: 'USER_LOGIN',
        entity_type: 'SESSION',
        entity_id: dbUser.id,
        metadata: { role: dbUser.role },
        created_at: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: 'Authentication successful.',
        data: {
          token,
          user: {
            id: dbUser.id,
            fullName: dbUser.full_name,
            email: dbUser.email,
            role: dbUser.role,
            organizationId: dbUser.organization_id,
            organizationName: dbOrg?.organization_name || 'Enterprise Member',
            mspId: dbOrg?.msp_id || `${dbUser.role}MSP`,
          },
        },
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, error: `Login failed: ${err.message}` });
    }
  }

  /**
   * GET /api/auth/me
   * Get authenticated user profile
   */
  public static async getMe(req: Request, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    return res.json({
      success: true,
      data: {
        user: req.user,
        ...req.user,
      },
    });
  }

  /**
   * GET /api/auth/organizations
   * Return verified consortium organizations for registration
   */
  public static async listOrganizations(req: Request, res: Response) {
    try {
      let orgs: DbOrganization[] = [];
      if (isDatabasePostgres()) {
        const result = await query('SELECT * FROM organizations ORDER BY organization_name ASC');
        if (result) orgs = result.rows;
      } else {
        orgs = Array.from(inMemoryDb.organizations.values());
      }

      return res.json({
        success: true,
        data: orgs,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/auth/logout
   */
  public static async logout(req: Request, res: Response) {
    if (req.user) {
      inMemoryDb.auditLogs.push({
        id: `AUDIT-${uuidv4().slice(0, 8)}`,
        user_id: req.user.id,
        user_name: req.user.fullName,
        organization_id: req.user.organizationId,
        action: 'USER_LOGOUT',
        entity_type: 'SESSION',
        entity_id: req.user.id,
        created_at: new Date().toISOString(),
      });
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  }
}
