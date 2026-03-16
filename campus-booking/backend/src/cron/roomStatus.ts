import cron from 'node-cron';
import { Server } from 'socket.io';
import prisma from '../lib/prisma';

function getCurrentTimeStr(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTodayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function emitRoomStatusChange(
  io: Server,
  roomId: number,
  buildingId: number,
  floor: string,
  isOccupied: boolean,
  currentBookingId: string | null
) {
  io.to(`floor:${buildingId}:${floor}`).emit('room:statusChange', {
    roomId,
    isOccupied,
    currentBookingId,
  });
}

export function initCronJobs(io: Server) {
  // Run every 60 seconds
  cron.schedule('* * * * *', async () => {
    const currentTime = getCurrentTimeStr();
    const todayStart = getTodayStart();
    const todayEnd = getTodayEnd();

    try {
      // Get all today's confirmed bookings
      const todayBookings = await prisma.booking.findMany({
        where: {
          date: { gte: todayStart, lte: todayEnd },
          status: 'CONFIRMED',
        },
        include: {
          room: { include: { building: true } },
        },
      });

      // Get all room statuses
      const roomStatuses = await prisma.roomStatus.findMany({
        include: { room: { include: { building: true } } },
      });

      for (const rs of roomStatuses) {
        // Find active booking for this room right now
        const activeBooking = todayBookings.find(
          (b) =>
            b.roomId === rs.roomId &&
            b.startTime <= currentTime &&
            b.endTime > currentTime
        );

        const shouldBeOccupied = !!activeBooking;
        const newBookingId = activeBooking?.id ?? null;

        // Only update and emit if status changed
        if (rs.isOccupied !== shouldBeOccupied || rs.currentBookingId !== newBookingId) {
          await prisma.roomStatus.update({
            where: { roomId: rs.roomId },
            data: { isOccupied: shouldBeOccupied, currentBookingId: newBookingId },
          });

          await emitRoomStatusChange(
            io,
            rs.roomId,
            rs.room.buildingId,
            rs.room.floor,
            shouldBeOccupied,
            newBookingId
          );
        }
      }
    } catch (err) {
      console.error('[Cron] roomStatus error:', err);
    }
  });

  console.log('[Cron] Room status job scheduled (every 60s)');
}
