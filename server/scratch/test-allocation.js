const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Allocation & Transfer verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const managerEmail = 'manager_tester@example.com';
  const headEmail = 'head_tester@example.com';
  const empAEmail = 'emp_a_tester@example.com';
  const empBEmail = 'emp_b_tester@example.com';
  const password = 'Password123!';

  let managerToken = '';
  let headToken = '';
  let empAToken = '';
  let empBToken = '';

  let managerUser, headUser, empAUser, empBUser;
  let engineeringDept, facilitiesDept, electronicsCat, testAsset;
  let firstAllocation, transferRequest;

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await prisma.transferRequest.deleteMany({
      where: { asset: { name: 'Laptop Dell' } },
    });
    await prisma.allocation.deleteMany({
      where: { asset: { name: 'Laptop Dell' } },
    });
    await prisma.asset.deleteMany({
      where: { name: 'Laptop Dell' },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Electronics' },
    });
    // Remove departments carefully (heads must be removed or set to null first)
    await prisma.department.updateMany({
      where: { name: { in: ['Engineering', 'Facilities'] } },
      data: { headUserId: null },
    });
    await prisma.department.deleteMany({
      where: { name: { in: ['Engineering', 'Facilities'] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [managerEmail, headEmail, empAEmail, empBEmail] } },
    });

    // Seed data
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users and master data...');
    // Create users as employees first
    managerUser = await prisma.user.create({
      data: { name: 'Asset Manager', email: managerEmail, passwordHash, role: 'AssetManager' },
    });
    headUser = await prisma.user.create({
      data: { name: 'Dept Head User', email: headEmail, passwordHash, role: 'DepartmentHead' },
    });
    empAUser = await prisma.user.create({
      data: { name: 'Employee A', email: empAEmail, passwordHash, role: 'Employee' },
    });
    empBUser = await prisma.user.create({
      data: { name: 'Employee B', email: empBEmail, passwordHash, role: 'Employee' },
    });

    // Create departments
    engineeringDept = await prisma.department.create({
      data: { name: 'Engineering', headUserId: headUser.id },
    });
    facilitiesDept = await prisma.department.create({
      data: { name: 'Facilities' },
    });

    // Update departments in user records
    await prisma.user.update({
      where: { id: headUser.id },
      data: { departmentId: engineeringDept.id },
    });
    await prisma.user.update({
      where: { id: empAUser.id },
      data: { departmentId: engineeringDept.id },
    });
    await prisma.user.update({
      where: { id: empBUser.id },
      data: { departmentId: facilitiesDept.id },
    });

    // Create Category and Asset
    electronicsCat = await prisma.assetCategory.create({
      data: { name: 'Electronics' },
    });
    testAsset = await prisma.asset.create({
      data: { name: 'Laptop Dell', assetTag: 'AF-0001', categoryId: electronicsCat.id, condition: 'New', status: 'Available' },
    });

    // Obtain tokens
    const login = async (email) => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status !== 200) {
        console.error(`Login failed for ${email} with status ${res.status}:`, data);
        throw new Error(`Login failed for ${email}: ${JSON.stringify(data.error)}`);
      }
      return data.data.token;
    };

    managerToken = await login(managerEmail);
    headToken = await login(headEmail);
    empAToken = await login(empAEmail);
    empBToken = await login(empBEmail);

    // 1. Test Allocation: Allocate Laptop Dell to Employee A (Asset Manager)
    console.log('📌 Test 1: Allocating Laptop Dell to Employee A...');
    const allocRes = await fetch(`${baseUrl}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        assetId: testAsset.id,
        holderUserId: empAUser.id,
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days later
      }),
    });
    const allocData = await allocRes.json();
    console.log('Allocation status:', allocRes.status);
    if (allocRes.status !== 201 || !allocData.success) {
      throw new Error('Asset allocation failed');
    }
    firstAllocation = allocData.data.allocation;

    // Check asset status is Allocated in DB
    const assetCheck1 = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    console.log('Asset status in DB after allocation:', assetCheck1.status);
    if (assetCheck1.status !== 'Allocated') {
      throw new Error('Asset status was not updated to Allocated');
    }

    // 2. Test Conflict Rule: Attempting to double-allocate same asset (should fail 409)
    console.log('📌 Test 2: Double allocation attempt (should fail 409)...');
    const conflictRes = await fetch(`${baseUrl}/allocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        assetId: testAsset.id,
        holderUserId: empBUser.id,
      }),
    });
    const conflictData = await conflictRes.json();
    console.log('Conflict attempt status:', conflictRes.status);
    console.log('Conflict attempt message:', conflictData.error.message);
    console.log('Conflict holder details:', conflictData.error.currentHolder);
    
    if (conflictRes.status !== 409 || conflictData.success || conflictData.error.code !== 'ASSET_ALREADY_ALLOCATED') {
      throw new Error('Double allocation was not blocked with 409 Conflict');
    }

    // 3. Test Transfer Request: Employee B requests transfer of Priya's Laptop
    console.log('📌 Test 3: Employee B requesting transfer of asset...');
    const transferReqRes = await fetch(`${baseUrl}/transfer-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empBToken}`,
      },
      body: JSON.stringify({
        assetId: testAsset.id,
        requestedToUserId: empBUser.id,
      }),
    });
    const transferReqData = await transferReqRes.json();
    console.log('Transfer Request creation status:', transferReqRes.status);
    if (transferReqRes.status !== 201 || !transferReqData.success) {
      throw new Error('Transfer request creation failed');
    }
    transferRequest = transferReqData.data.transferRequest;

    // 4. Test Approval Guard: Employee A tries to approve (should fail 403)
    console.log('📌 Test 4: Employee A attempting to approve transfer (should fail 403)...');
    const badApproveRes = await fetch(`${baseUrl}/transfer-requests/${transferRequest.id}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${empAToken}` },
    });
    console.log('Employee approval status:', badApproveRes.status);
    if (badApproveRes.status !== 403) {
      throw new Error('Employee was allowed to approve transfer request');
    }

    // 5. Test HOD Approval: HOD of Engineering (where Priya works) approves transfer
    console.log('📌 Test 5: HOD of Engineering approving transfer...');
    const approveRes = await fetch(`${baseUrl}/transfer-requests/${transferRequest.id}/approve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${headToken}` },
    });
    const approveData = await approveRes.json();
    console.log('HOD approval status:', approveRes.status);
    if (approveRes.status !== 200 || !approveData.success || approveData.data.transferRequest.status !== 'ReAllocated') {
      throw new Error('HOD transfer approval failed');
    }

    // Verify allocations in database
    const oldAllocCheck = await prisma.allocation.findUnique({ where: { id: firstAllocation.id } });
    console.log('Old allocation status after transfer:', oldAllocCheck.status);
    console.log('Old allocation return condition:', oldAllocCheck.returnConditionNotes);
    if (oldAllocCheck.status !== 'Returned' || !oldAllocCheck.actualReturnDate) {
      throw new Error('Old allocation was not closed');
    }

    const newAllocCheck = await prisma.allocation.findFirst({
      where: { assetId: testAsset.id, status: 'Active' },
    });
    console.log('New active allocation holder ID:', newAllocCheck.holderUserId);
    if (newAllocCheck.holderUserId !== empBUser.id) {
      throw new Error('New allocation was not opened for requested target');
    }

    // 6. Test Return Asset: Employee B returns asset
    console.log('📌 Test 6: Employee B returning the asset...');
    const returnRes = await fetch(`${baseUrl}/allocations/${newAllocCheck.id}/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empBToken}`,
      },
      body: JSON.stringify({ returnConditionNotes: 'Returned in fair condition' }),
    });
    const returnData = await returnRes.json();
    console.log('Return status:', returnRes.status);
    if (returnRes.status !== 200 || !returnData.success) {
      throw new Error('Returning asset failed');
    }

    // Verify asset is now Available
    const assetCheck2 = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    console.log('Final Asset status in DB:', assetCheck2.status);
    if (assetCheck2.status !== 'Available') {
      throw new Error('Asset status did not revert to Available after return');
    }

    console.log('🎉 All Allocation & Transfer verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    // Delete created resources in correct order
    await prisma.transferRequest.deleteMany({
      where: { assetId: testAsset?.id },
    });
    await prisma.allocation.deleteMany({
      where: { assetId: testAsset?.id },
    });
    await prisma.asset.deleteMany({
      where: { id: testAsset?.id },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: electronicsCat?.id },
    });
    await prisma.department.updateMany({
      where: { id: { in: [engineeringDept?.id, facilitiesDept?.id].filter(Boolean) } },
      data: { headUserId: null },
    });
    await prisma.department.deleteMany({
      where: { id: { in: [engineeringDept?.id, facilitiesDept?.id].filter(Boolean) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [managerUser?.id, headUser?.id, empAUser?.id, empBUser?.id].filter(Boolean) } },
    });

    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
