// Auth Middleware - Protect API routes
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth/jwt';

// Extend NextRequest to include user
declare module 'next/server' {
  interface NextRequest {
    user?: TokenPayload;
  }
}

// Public routes that don't require authentication
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Auth middleware function
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return null;
  }

  // Skip non-API routes
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  // Get token from Authorization header
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH003', message: 'Access token required' } },
      { status: 401 }
    );
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { success: false, error: { code: 'AUTH002', message: 'Invalid or expired token' } },
      { status: 401 }
    );
  }

  // Add user to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-plan', payload.plan);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Helper to get user from request in API routes
export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const plan = request.headers.get('x-user-plan');

  if (!userId || !email || !plan) {
    return null;
  }

  return { userId, email, plan };
}
