// Auth Service - JWT Token Management
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

const JWT_ISSUER = 'studynest';
const JWT_AUDIENCE = 'studynest-app';

// Token expiration times
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m',           // Short-term: 15 minutes
  REFRESH_TOKEN: '7d',           // Standard: 7 days  
  REFRESH_TOKEN_REMEMBER: '30d', // Long-term (remember me): 30 days
  ACCESS_TOKEN_SECONDS: 15 * 60,              // 15 minutes in seconds
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,    // 7 days in seconds
  REFRESH_TOKEN_REMEMBER_SECONDS: 30 * 24 * 60 * 60, // 30 days in seconds
};

export interface TokenPayload {
  userId: string;
  email: string;
  plan: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

// Generate Access Token (short-lived: 15 minutes)
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(TOKEN_EXPIRY.ACCESS_TOKEN)
    .sign(JWT_SECRET);
}

// Generate Refresh Token (configurable: 7 days default, 30 days for remember me)
export async function generateRefreshToken(payload: TokenPayload, rememberMe: boolean = false): Promise<string> {
  const expiry = rememberMe ? TOKEN_EXPIRY.REFRESH_TOKEN_REMEMBER : TOKEN_EXPIRY.REFRESH_TOKEN;
  return new SignJWT({ ...payload, type: 'refresh', rememberMe })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

// Generate both tokens
export async function generateTokens(payload: TokenPayload, rememberMe: boolean = false): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload, rememberMe),
  ]);

  const refreshExpiresIn = rememberMe 
    ? TOKEN_EXPIRY.REFRESH_TOKEN_REMEMBER_SECONDS 
    : TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS;

  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN_SECONDS,
    refreshExpiresIn,
  };
}

// Verify and decode token
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      plan: payload.plan as string,
    };
  } catch {
    return null;
  }
}

// Verify refresh token
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (payload.type !== 'refresh') {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      plan: payload.plan as string,
    };
  } catch {
    return null;
  }
}

// Hash password using Web Crypto API (Edge Runtime compatible)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordData = encoder.encode(password);
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    key,
    256
  );

  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);

  return Buffer.from(combined).toString('base64');
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const combined = Buffer.from(hash, 'base64');
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);

    const key = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );

    const newHash = new Uint8Array(derivedBits);
    
    // Constant-time comparison
    if (newHash.length !== storedHash.length) return false;
    let result = 0;
    for (let i = 0; i < newHash.length; i++) {
      result |= newHash[i] ^ storedHash[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}

// Generate email verification token
export function generateVerificationToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString('hex');
}

// Generate password reset token
export function generateResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString('hex');
}
