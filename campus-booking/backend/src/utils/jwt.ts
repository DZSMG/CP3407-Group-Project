import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jcu-booking-secret-key-change-in-production';

export interface JwtPayload {
  userId: string;
  role: string;
  studentId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
