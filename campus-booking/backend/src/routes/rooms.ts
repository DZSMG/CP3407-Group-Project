import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// GET /api/buildings
router.get('/buildings', async (_req: Request, res: Response) => {
  const buildings = await prisma.building.findMany({
    include: {
      _count: { select: { rooms: { where: { isActive: true } } } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    buildings: buildings.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      roomCount: b._count.rooms,
    })),
  });
});

// GET /api/rooms
const roomsQuerySchema = z.object({
  buildingId: z.string().transform(Number),
  floor: z.string().optional(),
  type: z.string().optional(),
});

router.get('/rooms', async (req: Request, res: Response) => {
  const parsed = roomsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'buildingId is required' });
    return;
  }

  const { buildingId, floor, type } = parsed.data;

  const rooms = await prisma.room.findMany({
    where: {
      buildingId,
      isActive: true,
      ...(floor ? { floor } : {}),
      ...(type ? { type: type as any } : {}),
    },
    include: { building: true },
    orderBy: { name: 'asc' },
  });

  res.json({ rooms });
});

// GET /api/rooms/:id/availability
const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.string().transform(Number).refine((v) => [1, 2, 3].includes(v)),
});

router.get('/rooms/:id/availability', async (req: Request, res: Response) => {
  const parsed = availabilityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid query params: date (YYYY-MM-DD), startTime (HH:MM), durationHours (1-3) required' });
    return;
  }

  const roomId = parseInt(req.params.id);
  const { date, startTime, durationHours } = parsed.data;
  const endTime = calcEndTime(startTime, durationHours);
  const dateObj = new Date(date);

  const conflictingBookings = await prisma.booking.findMany({
    where: {
      roomId,
      date: dateObj,
      status: 'CONFIRMED',
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    },
    select: { id: true, startTime: true, endTime: true },
  });

  res.json({
    available: conflictingBookings.length === 0,
    conflictingBookings,
  });
});

// GET /api/rooms/floor-availability
const floorAvailSchema = z.object({
  buildingId: z.string().transform(Number),
  floor: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationHours: z.string().transform(Number).refine((v) => [1, 2, 3].includes(v)),
});

router.get('/rooms/floor-availability', async (req: Request, res: Response) => {
  const parsed = floorAvailSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: 'Missing or invalid query params' });
    return;
  }

  const { buildingId, floor, date, startTime, durationHours } = parsed.data;
  const endTime = calcEndTime(startTime, durationHours);
  const dateObj = new Date(date);

  const rooms = await prisma.room.findMany({
    where: { buildingId, floor, isActive: true },
    include: { building: true },
    orderBy: { name: 'asc' },
  });

  const bookedRoomIds = new Set(
    (await prisma.booking.findMany({
      where: {
        roomId: { in: rooms.map((r) => r.id) },
        date: dateObj,
        status: 'CONFIRMED',
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
      select: { roomId: true },
    })).map((b) => b.roomId)
  );

  res.json({
    rooms: rooms.map((room) => ({
      room,
      isAvailable: !bookedRoomIds.has(room.id),
    })),
  });
});

function calcEndTime(startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMin = h * 60 + m + durationHours * 60;
  const endH = Math.floor(totalMin / 60).toString().padStart(2, '0');
  const endM = (totalMin % 60).toString().padStart(2, '0');
  return `${endH}:${endM}`;
}

export default router;
