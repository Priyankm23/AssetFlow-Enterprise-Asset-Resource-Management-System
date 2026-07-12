const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Resource Booking verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const bookerEmail = 'booker_tester@example.com';
  const password = 'Password123!';

  let bookerToken = '';
  let bookerUser;
  let sharedSpacesCat;
  let bookableRoom, unbookableLaptop;
  let booking1, booking2;

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await prisma.booking.deleteMany({
      where: { bookedByUser: { email: bookerEmail } },
    });
    await prisma.asset.deleteMany({
      where: { name: { in: ['Conference Room B2', 'Unbookable Laptop'] } },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Shared Spaces' },
    });
    await prisma.user.deleteMany({
      where: { email: bookerEmail },
    });

    // Seed data
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users and master data...');
    bookerUser = await prisma.user.create({
      data: { name: 'Booker Employee', email: bookerEmail, passwordHash, role: 'Employee' },
    });

    sharedSpacesCat = await prisma.assetCategory.create({
      data: { name: 'Shared Spaces' },
    });

    // Bookable Room
    bookableRoom = await prisma.asset.create({
      data: { name: 'Conference Room B2', assetTag: 'AF-9001', categoryId: sharedSpacesCat.id, condition: 'New', isBookable: true, status: 'Available' },
    });

    // Unbookable Laptop
    unbookableLaptop = await prisma.asset.create({
      data: { name: 'Unbookable Laptop', assetTag: 'AF-9002', categoryId: sharedSpacesCat.id, condition: 'New', isBookable: false, status: 'Available' },
    });

    // Obtain token
    const login = async (email) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return data.data.token;
    };

    bookerToken = await login(bookerEmail);

    // Setup tomorrow's time slots
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const slot1Start = `${dateStr}T14:00:00.000Z`;
    const slot1End = `${dateStr}T15:00:00.000Z`;

    const slot2Start = `${dateStr}T14:30:00.000Z`; // overlap
    const slot2End = `${dateStr}T15:30:00.000Z`;

    const slot3Start = `${dateStr}T15:00:00.000Z`; // consecutive
    const slot3End = `${dateStr}T16:00:00.000Z`;

    // 1. Test Bookable check: Try to book unbookable Laptop (should fail 400)
    console.log('📌 Test 1: Attempting to book unbookable asset (should fail 400)...');
    const badBookRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        assetId: unbookableLaptop.id,
        startTime: slot1Start,
        endTime: slot1End,
      }),
    });
    console.log('Book unbookable status:', badBookRes.status);
    if (badBookRes.status !== 400) {
      throw new Error('Allowed booking an unbookable asset');
    }

    // 2. Test Booking Creation: Create booking 14:00 - 15:00 (succeed)
    console.log('📌 Test 2A: Booking room for 14:00-15:00 (succeed)...');
    const bookRes1 = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        assetId: bookableRoom.id,
        startTime: slot1Start,
        endTime: slot1End,
      }),
    });
    const bookData1 = await bookRes1.json();
    console.log('Booking 1 status:', bookRes1.status);
    if (bookRes1.status !== 201 || !bookData1.success) {
      throw new Error('Booking 1 creation failed');
    }
    booking1 = bookData1.data.booking;

    // 3. Test Overlap Validation: Book room 14:30 - 15:30 (should fail 409)
    console.log('📌 Test 3: Booking overlapping slot 14:30-15:30 (should fail 409)...');
    const overlapRes = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        assetId: bookableRoom.id,
        startTime: slot2Start,
        endTime: slot2End,
      }),
    });
    const overlapData = await overlapRes.json();
    console.log('Overlap booking status:', overlapRes.status);
    console.log('Overlap booking error message:', overlapData.error.message);
    if (overlapRes.status !== 409 || overlapData.success || overlapData.error.code !== 'BOOKING_OVERLAP') {
      throw new Error('Allowed booking an overlapping slot');
    }

    // 4. Test Non-overlapping Consecutive: Book room 15:00 - 16:00 (succeed)
    console.log('📌 Test 4: Booking consecutive slot 15:00-16:00 (succeed)...');
    const bookRes2 = await fetch(`${baseUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        assetId: bookableRoom.id,
        startTime: slot3Start,
        endTime: slot3End,
      }),
    });
    const bookData2 = await bookRes2.json();
    console.log('Booking 2 status:', bookRes2.status);
    if (bookRes2.status !== 201 || !bookData2.success) {
      throw new Error('Consecutive booking creation failed');
    }
    booking2 = bookData2.data.booking;

    // 5. Test Rescheduling overlap vs success
    // A: Reschedule booking 2 to 14:30-15:30 (overlaps booking 1, should fail 409)
    console.log('📌 Test 5A: Rescheduling booking 2 to overlapping slot (should fail 409)...');
    const badReschRes = await fetch(`${baseUrl}/bookings/${booking2.id}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        startTime: slot2Start,
        endTime: slot2End,
      }),
    });
    console.log('Reschedule overlap status:', badReschRes.status);
    if (badReschRes.status !== 409) {
      throw new Error('Allowed rescheduling to an overlapping slot');
    }

    // B: Reschedule booking 2 to 16:00-17:00 (free slot, succeed)
    console.log('📌 Test 5B: Rescheduling booking 2 to free slot 16:00-17:00...');
    const slot4Start = `${dateStr}T16:00:00.000Z`;
    const slot4End = `${dateStr}T17:00:00.000Z`;
    const reschRes = await fetch(`${baseUrl}/bookings/${booking2.id}/reschedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bookerToken}`,
      },
      body: JSON.stringify({
        startTime: slot4Start,
        endTime: slot4End,
      }),
    });
    const reschData = await reschRes.json();
    console.log('Reschedule status:', reschRes.status);
    if (reschRes.status !== 200 || !reschData.success) {
      throw new Error('Rescheduling failed');
    }

    // 6. Test Cancel Booking
    console.log('📌 Test 6: Cancelling booking 1...');
    const cancelRes = await fetch(`${baseUrl}/bookings/${booking1.id}/cancel`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${bookerToken}` },
    });
    const cancelData = await cancelRes.json();
    console.log('Cancellation status:', cancelRes.status);
    if (cancelRes.status !== 200 || !cancelData.success || cancelData.data.booking.status !== 'Cancelled') {
      throw new Error('Cancellation failed');
    }

    console.log('🎉 All Resource Booking verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    // Delete created resources in correct order
    await prisma.booking.deleteMany({
      where: { assetId: { in: [bookableRoom?.id, unbookableLaptop?.id].filter(Boolean) } },
    });
    await prisma.asset.deleteMany({
      where: { id: { in: [bookableRoom?.id, unbookableLaptop?.id].filter(Boolean) } },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: sharedSpacesCat?.id },
    });
    await prisma.user.deleteMany({
      where: { id: bookerUser?.id },
    });

    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
