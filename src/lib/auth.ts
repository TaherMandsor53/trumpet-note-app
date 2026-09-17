import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { User, Role } from '@/types/band';
import { getUserById } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'taheri-scout-band-group-jwt-secret-key-9876543210'
);

export const AUTH_COOKIE_NAME = 'taheri_scout_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  section: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Signs a JWT token for a given user
 */
export async function signUserToken(user: User): Promise<string> {
  return await new SignJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
    section: user.section,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Gets the current authenticated user from Next.js request or cookies
 */
export async function getCurrentUser(request?: NextRequest): Promise<User | null> {
  let token: string | undefined;

  // 1. Check Authorization header
  if (request) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  // 2. Fall back to cookie
  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // Ignore when running outside Server Components/Route Handlers
    }
  }

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;

  const user = getUserById(payload.userId as string);
  return user || null;
}
