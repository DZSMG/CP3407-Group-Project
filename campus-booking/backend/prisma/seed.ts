import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { RoomType } from '../src/generated/prisma/client';
import prisma from '../src/lib/prisma';

const CAPACITIES: Record<RoomType, number> = {
  CLASSROOM: 40,
  COMPUTER_LAB: 30,
  FINANCE_LAB: 25,
  CONSULTATION: 4,
  LECTURE_THEATRE: 150,
  LIBRARY_SEAT: 1,
};

const IMAGES: Partial<Record<RoomType, string>> = {
  CLASSROOM: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60',
  COMPUTER_LAB: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60',
  FINANCE_LAB: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60',
  CONSULTATION: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60',
  LECTURE_THEATRE: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60',
};

interface RoomDef {
  name: string;
  floor: string;
  type: RoomType;
}

const campusData: Array<{ name: string; description: string; rooms: RoomDef[] }> = [
  {
    name: 'Block A',
    description: 'Business & Finance Hub',
    rooms: [
      { name: 'A1-04', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'A1-05', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'A1-03', floor: 'Level 1', type: 'FINANCE_LAB' },
      { name: 'A2-02', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-03', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-04', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-05', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-06', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-07', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'A2-09', floor: 'Level 2', type: 'COMPUTER_LAB' },
    ],
  },
  {
    name: 'Block B',
    description: 'IT & Engineering',
    rooms: [
      { name: 'B2-04', floor: 'Level 2', type: 'COMPUTER_LAB' },
      { name: 'B2-05', floor: 'Level 2', type: 'COMPUTER_LAB' },
      { name: 'B2-06', floor: 'Level 2', type: 'COMPUTER_LAB' },
      { name: 'B2-07', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'B3-02', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'B3-03', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'B3-04', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'B3-05', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'B3-06', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'B3-07', floor: 'Level 3', type: 'CLASSROOM' },
    ],
  },
  {
    name: 'Block C',
    description: 'Main Lecture Block',
    rooms: [
      { name: 'C1-01', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-02', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-03', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-04', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-05', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-06', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-07', floor: 'Level 1', type: 'CLASSROOM' },
      { name: 'C1-10', floor: 'Level 1', type: 'CONSULTATION' },
      { name: 'C1-11', floor: 'Level 1', type: 'CONSULTATION' },
      { name: 'C1-12', floor: 'Level 1', type: 'CONSULTATION' },
      { name: 'C1-13', floor: 'Level 1', type: 'CONSULTATION' },
      { name: 'C2-02', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'C2-03', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'C2-04', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'C2-05', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'C2-06', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'C2-13', floor: 'Level 2', type: 'LECTURE_THEATRE' },
      { name: 'C2-14', floor: 'Level 2', type: 'LECTURE_THEATRE' },
      { name: 'C2-15', floor: 'Level 2', type: 'LECTURE_THEATRE' },
      { name: 'C3-02', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'C3-03', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'C3-04', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'C3-05', floor: 'Level 3', type: 'CLASSROOM' },
      { name: 'C4-01', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-02', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-03', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-04', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-05', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-06', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-07', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-08', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-09', floor: 'Level 4', type: 'CLASSROOM' },
      { name: 'C4-13', floor: 'Level 4', type: 'LECTURE_THEATRE' },
      { name: 'C4-14', floor: 'Level 4', type: 'LECTURE_THEATRE' },
      { name: 'C4-15', floor: 'Level 4', type: 'LECTURE_THEATRE' },
    ],
  },
  {
    name: 'Block E',
    description: 'General Studies',
    rooms: [
      { name: 'E2-01', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'E2-02', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'E2-03', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'E2-04A', floor: 'Level 2', type: 'CLASSROOM' },
      { name: 'E2-04B', floor: 'Level 2', type: 'CLASSROOM' },
    ],
  },
  {
    name: 'Library',
    description: 'Quiet Study & Research',
    rooms: [
      // Level 1: seats 1–35
      ...Array.from({ length: 35 }, (_, i) => ({
        name: `Lib-L1-${i + 1}`,
        floor: 'Level 1',
        type: 'LIBRARY_SEAT' as RoomType,
      })),
      // Level 2: seats 1–78
      ...Array.from({ length: 78 }, (_, i) => ({
        name: `Lib-L2-${i + 1}`,
        floor: 'Level 2',
        type: 'LIBRARY_SEAT' as RoomType,
      })),
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.roomStatus.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  await prisma.building.deleteMany();
  await prisma.user.deleteMany();

  // Seed buildings and rooms
  const allRooms: Array<{ id: number }> = [];

  for (const bldg of campusData) {
    const building = await prisma.building.create({
      data: {
        name: bldg.name,
        description: bldg.description,
        rooms: {
          create: bldg.rooms.map((r) => ({
            name: r.name,
            floor: r.floor,
            type: r.type,
            capacity: CAPACITIES[r.type],
            imageUrl: IMAGES[r.type] ?? null,
          })),
        },
      },
      include: { rooms: true },
    });
    allRooms.push(...building.rooms);
    console.log(`  Created building: ${bldg.name} (${building.rooms.length} rooms)`);
  }

  // Create RoomStatus for every room
  for (const room of allRooms) {
    await prisma.roomStatus.create({
      data: { roomId: room.id, isOccupied: false },
    });
  }
  console.log(`  Created RoomStatus for ${allRooms.length} rooms`);

  // Seed test users
  const users = [
    { studentId: 'jc100001', email: 'student1@jcu.edu.sg', password: 'test123', role: 'STUDENT' as const },
    { studentId: 'jc100002', email: 'student2@jcu.edu.sg', password: 'test123', role: 'STUDENT' as const },
    { studentId: 'st0001', email: 'admin@jcu.edu.sg', password: 'admin123', role: 'ADMIN' as const },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        studentId: u.studentId,
        email: u.email,
        passwordHash,
        role: u.role,
      },
    });
    console.log(`  Created user: ${u.studentId} (${u.role})`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
