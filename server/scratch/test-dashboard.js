const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Dashboard & Activity verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const userEmail = 'dash_tester@example.com';
  const password = 'Password123!';

  let userToken = '';
  let user;
  let electronicsCat;
  let asset1, asset2, asset3;
  let allocation, booking, maintRequest;

  const executeWithRetry = async (fn, attempts = 5, delayMs = 2000) => {
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        if (i === attempts) throw e;
        console.warn(`⚠️ DB connection attempt ${i} failed. Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  };

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await executeWithRetry(() => prisma.booking.deleteMany({
      where: { bookedByUser: { email: userEmail } },
    }));
    await prisma.maintenanceRequest.deleteMany({
      where: { raisedByUser: { email: userEmail } },
    });
    await prisma.allocation.deleteMany({
      where: { holderUser: { email: userEmail } },
    });
    await prisma.asset.deleteMany({
      where: { name: { in: ['Dash Asset 1', 'Dash Asset 2', 'Dash Asset 3'] } },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Electronics' },
    });
    await prisma.user.deleteMany({
      where: { email: userEmail },
    });

    // Seed data
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users and master data...');
    user = await prisma.user.create({
      data: { name: 'Dash Booker', email: userEmail, passwordHash, role: 'Employee' },
    });

    electronicsCat = await prisma.assetCategory.create({
      data: { name: 'Electronics' },
    });

    // Create 3 assets with different statuses
    asset1 = await prisma.asset.create({
      data: { name: 'Dash Asset 1', assetTag: 'AF-7001', categoryId: electronicsCat.id, condition: 'New', isBookable: true, status: 'Available' },
    });
    asset2 = await prisma.asset.create({
      data: { name: 'Dash Asset 2', assetTag: 'AF-7002', categoryId: electronicsCat.id, condition: 'New', isBookable: false, status: 'Allocated' },
    });
    asset3 = await prisma.asset.create({
      data: { name: 'Dash Asset 3', assetTag: 'AF-7003', categoryId: electronicsCat.id, condition: 'New', isBookable: false, status: 'UnderMaintenance' },
    });

    // Create an active allocation for Asset 2
    allocation = await prisma.allocation.create({
      data: { assetId: asset2.id, holderUserId: user.id, status: 'Active', expectedReturnDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    });

    // Create a booking for Asset 1
    booking = await prisma.booking.create({
      data: { assetId: asset1.id, bookedByUserId: user.id, startTime: new Date(Date.now() + 100000), endTime: new Date(Date.now() + 2 * 3600 * 1000), status: 'Upcoming' },
    });

    // Create a maintenance request for Asset 3
    maintRequest = await prisma.maintenanceRequest.create({
      data: { assetId: asset3.id, raisedByUserId: user.id, issueDescription: 'Diagnostics', priority: 'Medium', status: 'InProgress' },
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

    userToken = await login(userEmail);

    // 1. Fetch Dashboard KPIs
    console.log('📌 Test 1: Fetching dashboard stats...');
    const dashRes = await fetch(`${baseUrl}/dashboard`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const dashData = await dashRes.json();
    console.log('Dashboard response status:', dashRes.status);
    console.log('Dashboard KPIs:', dashData.data.kpis);
    
    if (dashRes.status !== 200 || !dashData.success) {
      throw new Error('Fetching dashboard stats failed');
    }
    
    const kpis = dashData.data.kpis;
    if (kpis.assetsAvailable < 1 || kpis.assetsAllocated < 1 || kpis.maintenanceToday < 1) {
      throw new Error('KPI counts do not match seeded data');
    }

    // 2. Fetch Activity Feed
    console.log('📌 Test 2: Fetching activity feed...');
    const actRes = await fetch(`${baseUrl}/activity`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userToken}` },
    });
    const actData = await actRes.json();
    console.log('Activity response status:', actRes.status);
    console.log('Recent activity feed (first 3):', actData.data.slice(0, 3));
    
    if (actRes.status !== 200 || !actData.success) {
      throw new Error('Fetching activity feed failed');
    }
    if (!Array.isArray(actData.data) || actData.data.length < 3) {
      throw new Error('Activity feed returned incomplete list');
    }

    console.log('🎉 All Dashboard & Activity verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    await prisma.booking.deleteMany({
      where: { assetId: { in: [asset1?.id, asset2?.id, asset3?.id].filter(Boolean) } },
    });
    await prisma.maintenanceRequest.deleteMany({
      where: { assetId: { in: [asset1?.id, asset2?.id, asset3?.id].filter(Boolean) } },
    });
    await prisma.allocation.deleteMany({
      where: { assetId: { in: [asset1?.id, asset2?.id, asset3?.id].filter(Boolean) } },
    });
    await prisma.asset.deleteMany({
      where: { id: { in: [asset1?.id, asset2?.id, asset3?.id].filter(Boolean) } },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: electronicsCat?.id },
    });
    await prisma.user.deleteMany({
      where: { id: user?.id },
    });

    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
