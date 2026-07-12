const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Maintenance Management verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const managerEmail = 'manager_tester@example.com';
  const empEmail = 'emp_tester@example.com';
  const password = 'Password123!';

  let managerToken = '';
  let empToken = '';

  let managerUser, empUser;
  let electronicsCat, testAsset;
  let maintRequest;

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await prisma.maintenanceRequest.deleteMany({
      where: { asset: { name: 'MacBook Air' } },
    });
    await prisma.asset.deleteMany({
      where: { name: 'MacBook Air' },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Electronics' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [managerEmail, empEmail] } },
    });

    // Seed data
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users and master data...');
    managerUser = await prisma.user.create({
      data: { name: 'Asset Manager', email: managerEmail, passwordHash, role: 'AssetManager' },
    });
    empUser = await prisma.user.create({
      data: { name: 'Employee', email: empEmail, passwordHash, role: 'Employee' },
    });

    electronicsCat = await prisma.assetCategory.create({
      data: { name: 'Electronics' },
    });

    testAsset = await prisma.asset.create({
      data: { name: 'MacBook Air', assetTag: 'AF-8001', categoryId: electronicsCat.id, condition: 'New', status: 'Available' },
    });

    // Obtain tokens
    const login = async (email) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      return data.data.token;
    };

    managerToken = await login(managerEmail);
    empToken = await login(empEmail);

    // 1. Propose Maintenance Request (Employee)
    console.log('📌 Test 1: Proposing maintenance request (Employee)...');
    const reqRes = await fetch(`${baseUrl}/maintenance-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        assetId: testAsset.id,
        issueDescription: 'Screen cracked',
        priority: 'High',
      }),
    });
    const reqData = await reqRes.json();
    console.log('Request creation status:', reqRes.status);
    if (reqRes.status !== 201 || !reqData.success) {
      throw new Error('Maintenance request creation failed');
    }
    maintRequest = reqData.data.maintenanceRequest;
    console.log('Created request status:', maintRequest.status);
    if (maintRequest.status !== 'Pending') {
      throw new Error('Initial status was not Pending');
    }

    // 2. Approve Request (Asset Manager)
    console.log('📌 Test 2: Asset Manager approving request...');
    const approveRes = await fetch(`${baseUrl}/maintenance-requests/${maintRequest.id}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${managerToken}` },
    });
    const approveData = await approveRes.json();
    console.log('Approval status:', approveRes.status);
    if (approveRes.status !== 200 || !approveData.success || approveData.data.maintenanceRequest.status !== 'Approved') {
      throw new Error('Approve request failed');
    }

    // Check asset status in DB (should be UnderMaintenance)
    const assetCheck1 = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    console.log('Asset status in DB after approval:', assetCheck1.status);
    if (assetCheck1.status !== 'UnderMaintenance') {
      throw new Error('Asset status was not updated to UnderMaintenance');
    }

    // 3. Assign Technician (Asset Manager)
    console.log('📌 Test 3: Asset Manager assigning technician...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignRes = await fetch(`${baseUrl}/maintenance-requests/${maintRequest.id}/assign-technician`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        technicianName: 'John Doe',
        scheduledDate: tomorrow.toISOString(),
      }),
    });
    const assignData = await assignRes.json();
    console.log('Assignment status:', assignRes.status);
    if (assignRes.status !== 200 || !assignData.success || assignData.data.maintenanceRequest.status !== 'TechnicianAssigned') {
      throw new Error('Technician assignment failed');
    }

    // 4. Start Work (Asset Manager)
    console.log('📌 Test 4: Asset Manager starting work...');
    const startRes = await fetch(`${baseUrl}/maintenance-requests/${maintRequest.id}/start`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${managerToken}` },
    });
    const startData = await startRes.json();
    console.log('Start work status:', startRes.status);
    if (startRes.status !== 200 || !startData.success || startData.data.maintenanceRequest.status !== 'InProgress') {
      throw new Error('Start work failed');
    }

    // 5. Resolve Request (Asset Manager)
    console.log('📌 Test 5: Asset Manager resolving request...');
    const resolveRes = await fetch(`${baseUrl}/maintenance-requests/${maintRequest.id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        resolutionNotes: 'Screen replaced',
      }),
    });
    const resolveData = await resolveRes.json();
    console.log('Resolution status:', resolveRes.status);
    if (resolveRes.status !== 200 || !resolveData.success || resolveData.data.maintenanceRequest.status !== 'Resolved') {
      throw new Error('Resolution failed');
    }

    // Check asset status in DB (should revert to Available)
    const assetCheck2 = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    console.log('Final Asset status in DB:', assetCheck2.status);
    if (assetCheck2.status !== 'Available') {
      throw new Error('Asset status did not revert back to Available');
    }

    console.log('🎉 All Maintenance Management verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    // Delete created resources in correct order
    await prisma.maintenanceRequest.deleteMany({
      where: { assetId: testAsset?.id },
    });
    await prisma.asset.deleteMany({
      where: { id: testAsset?.id },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: electronicsCat?.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [managerUser?.id, empUser?.id].filter(Boolean) } },
    });

    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
