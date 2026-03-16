import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { signToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

const STUDENT_ID_REGEX = /^jc\d{6}$/i;
const STAFF_ID_REGEX = /^st\d{4}$/i;

const registerSchema = z.object({
  studentId: z.string().refine(
    (v) => STUDENT_ID_REGEX.test(v) || STAFF_ID_REGEX.test(v),
    { message: 'Invalid student ID format. Students: jcXXXXXX, Staff: stXXXX' }
  ),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STUDENT', 'STAFF', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  studentId: z.string(),
  password: z.string(),
});

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { studentId, email, password, role } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ studentId }, { email }] },
  });

  if (existing) {
    const field = existing.studentId === studentId ? 'Student ID' : 'Email';
    res.status(409).json({ message: `${field} already registered` });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inferredRole = role ?? (STAFF_ID_REGEX.test(studentId) ? 'STAFF' : 'STUDENT');

  const user = await prisma.user.create({
    data: { studentId, email, passwordHash, role: inferredRole },
  });

  const token = signToken({ userId: user.id, role: user.role, studentId: user.studentId });
  res.status(201).json({
    token,
    user: { id: user.id, studentId: user.studentId, email: user.email, role: user.role },
  });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { studentId, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { studentId } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: 'Invalid student ID or password' });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role, studentId: user.studentId });
  res.json({
    token,
    user: { id: user.id, studentId: user.studentId, email: user.email, role: user.role },
  });
});

// GET /api/auth/me (protected)
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, studentId: true, email: true, role: true, status: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.json({ user });
});

export default router;
