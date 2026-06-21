import { Response, NextFunction, Request } from 'express';
import { getUserProfile } from '../db/users.ts';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-store-secret-key-321-abc-987';

export interface TokenPayload {
  id: number;
  uid: string;
  email: string;
  role: 'user' | 'admin';
  displayName: string | null;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
  userProfile?: {
    id: number;
    uid: string;
    email: string;
    role: 'user' | 'admin';
    createdAt: Date | null;
  };
}

export function createToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${data}`)
    .digest('base64url');
  return `${header}.${data}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, data, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${data}`)
      .digest('base64url');
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed Authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedPayload = verifyToken(token);
    if (!decodedPayload) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    req.user = decodedPayload;

    // Fetch freshest profile from PostgreSQL
    const profile = await getUserProfile(decodedPayload.uid);
    if (!profile) {
      return res.status(401).json({ error: 'Unauthorized: User profile does not exist' });
    }
    
    req.userProfile = profile as any;

    next();
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token check failed' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // First ensure they are authenticated
  requireAuth(req, res, () => {
    if (!req.userProfile || req.userProfile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access. Your role is: ' + (req.userProfile?.role || 'none') });
    }
    next();
  });
};
