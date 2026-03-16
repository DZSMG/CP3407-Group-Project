import 'dotenv/config';
import prisma from '../lib/prisma';

export async function cleanBookings() {
  await prisma.roomStatus.updateMany({ data: { isOccupied: false, currentBookingId: null } });
  await prisma.booking.deleteMany();
}

export { prisma as testPrisma };

afterAll(async () => {
  await prisma.$disconnect();
});
