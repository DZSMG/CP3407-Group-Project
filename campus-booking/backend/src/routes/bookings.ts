import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { emitRoomStatusChange } from '../cron/roomStatus';

const router = Router();
router.use(authenticate);

const createBookingSchema = z.object({
  roomId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime must be HH:MM'),
  durationHours: z.number().int().refine((v) => [1, 2, 3].includes(v), 'durationHours must be 1, 2, or 3'),
});

function calcEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationHours * 60;
  return `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
}

function getWeekBoundaries(dateStr: string): { weekStart: Date; weekEnd: Date } {
  const d = new Date(dateStr);
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon...
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(d);
  weekStart.setUTCDate(d.getUTCDate() + daysToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7);
  return { weekStart, weekEnd };
}

// POST /api/bookings
router.post('/', async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { roomId, date, startTime, durationHours } = parsed.data;

  // Validate start time range (08:00–21:00)
  const [sh] = startTime.split(':').map(Number);
  if (sh < 8 || sh > 21) {
    res.status(400).json({ message: 'startTime must be between 08:00 and 21:00' });
    return;
  }

  // Validate date is today or future
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    res.status(400).json({ message: 'date must be today or in the future' });
    return;
  }

  const endTime = calcEndTime(startTime, durationHours);

  // Check if room is a library seat (for quota)
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { type: true } });
  if (!room) {
    res.status(404).json({ message: 'Room not found' });
    return;
  }

  // Library weekly quota check
  if (room.type === 'LIBRARY_SEAT') {
    const { weekStart, weekEnd } = getWeekBoundaries(date);
    const libBookingsThisWeek = await prisma.booking.count({
      where: {
        userId: req.user!.userId,
        room: { type: 'LIBRARY_SEAT' },
        status: 'CONFIRMED',
        date: { gte: weekStart, lt: weekEnd },
      },
    });
    if (libBookingsThisWeek >= 3) {
      res.status(429).json({ message: 'Library booking quota exceeded: max 3 library bookings per week' });
      return;
    }
  }

  // Atomic check + create to prevent double-booking
  try {
    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          roomId,
          date: bookingDate,
          status: 'CONFIRMED',
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      });

      if (conflict) {
        throw Object.assign(new Error('Time slot already booked'), { code: 'CONFLICT' });
      }

      return tx.booking.create({
        data: {
          userId: req.user!.userId,
          roomId,
          date: bookingDate,
          startTime,
          endTime,
          durationHours,
          status: 'CONFIRMED',
        },
        include: {
          room: { include: { building: true } },
        },
      });
    });

    // Emit real-time status if booking is currently active
    const currentTime = new Date().toTimeString().slice(0, 5);
    const bookingDate2 = new Date(date);
    const today2 = new Date();
    today2.setHours(0, 0, 0, 0);
    if (bookingDate2.getTime() === today2.getTime() && startTime <= currentTime && endTime > currentTime) {
      const io = req.app.get('io');
      if (io) {
        await emitRoomStatusChange(io, booking.roomId, booking.room.buildingId, booking.room.floor, true, booking.id);
      }
    }

    res.status(201).json({ booking });
  } catch (err: any) {
    if (err.code === 'CONFLICT') {
      res.status(409).json({ message: err.message });
      return;
    }
    throw err;
  }
});

// GET /api/bookings/me
router.get('/me', async (req: Request, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.userId },
    include: {
      room: { include: { building: true } },
    },
    orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
  });

  res.json({ bookings });
});

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
  });

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' });
    return;
  }

  if (booking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
    res.status(403).json({ message: 'Forbidden: not your booking' });
    return;
  }

  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({ message: `Booking is already ${booking.status.toLowerCase()}` });
    return;
  }

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: 'CANCELLED' },
    include: { room: { include: { building: true } } },
  });

  // Emit real-time status change if booking was currently active
  const currentTime2 = new Date().toTimeString().slice(0, 5);
  const bDate = new Date(booking.date);
  const today3 = new Date();
  today3.setHours(0, 0, 0, 0);
  if (bDate.getTime() === today3.getTime() && booking.startTime <= currentTime2 && booking.endTime > currentTime2) {
    const io = req.app.get('io');
    if (io) {
      await emitRoomStatusChange(io, updated.roomId, updated.room.buildingId, updated.room.floor, false, null);
    }
  }

  res.json({ booking: updated });
});

export default router;
