const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Asset Registry verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const managerEmail = 'manager_tester@example.com';
  const empEmail = 'emp_tester@example.com';
  const password = 'Password123!';

  let managerToken = '';
  let empToken = '';
  let managerUser, empUser;
  let electronicsCategory;
  let asset1, asset2;

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await prisma.asset.deleteMany({
      where: { name: { in: ['Laptop Dell', 'Monitor HP', 'Laptop Dell V2'] } },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Electronics' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [managerEmail, empEmail] } },
    });

    // Seed users & categories
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users and categories...');
    managerUser = await prisma.user.create({
      data: { name: 'Asset Manager User', email: managerEmail, passwordHash, role: 'AssetManager' },
    });
    empUser = await prisma.user.create({
      data: { name: 'Employee User', email: empEmail, passwordHash, role: 'Employee' },
    });
    electronicsCategory = await prisma.assetCategory.create({
      data: { name: 'Electronics' },
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

    // 1. Test Role Guard: Employee trying to register asset (should fail 403)
    console.log('📌 Test 1: Employee attempting to register asset (should fail 403)...');
    const badRegRes = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        name: 'Laptop Dell',
        categoryId: electronicsCategory.id,
        condition: 'New',
        isBookable: true,
      }),
    });
    console.log('Employee registration attempt status:', badRegRes.status);
    if (badRegRes.status !== 403) {
      throw new Error('Employee was not blocked from registering assets');
    }

    // 2. Test Asset Registration & Sequential Tagging (AF-0001)
    console.log('📌 Test 2A: Registering first asset (expecting AF-0001)...');
    const regRes1 = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Laptop Dell',
        categoryId: electronicsCategory.id,
        condition: 'New',
        isBookable: true,
      }),
    });
    const regData1 = await regRes1.json();
    console.log('Asset 1 status:', regRes1.status);
    console.log('Asset 1 details:', regData1.data.asset);
    if (regRes1.status !== 201 || regData1.data.asset.assetTag !== 'AF-0001') {
      throw new Error('Asset 1 registration failed or tag is not AF-0001');
    }
    if (regData1.data.asset.status !== 'Available') {
      throw new Error('Asset status did not default to Available');
    }
    asset1 = regData1.data.asset;

    // Register second asset (AF-0002)
    console.log('📌 Test 2B: Registering second asset (expecting AF-0002)...');
    const regRes2 = await fetch(`${baseUrl}/assets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Monitor HP',
        categoryId: electronicsCategory.id,
        condition: 'Good',
        isBookable: false,
      }),
    });
    const regData2 = await regRes2.json();
    console.log('Asset 2 status:', regRes2.status);
    console.log('Asset 2 details:', regData2.data.asset);
    if (regRes2.status !== 201 || regData2.data.asset.assetTag !== 'AF-0002') {
      throw new Error('Asset 2 registration failed or tag is not AF-0002');
    }
    asset2 = regData2.data.asset;

    // 3. Test Search & Filter
    console.log('📌 Test 3: Querying assets with search filter "dell"...');
    const listRes = await fetch(`${baseUrl}/assets?search=dell`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empToken}` },
    });
    const listData = await listRes.json();
    console.log('Search response assets count:', listData.data.assets.length);
    if (listRes.status !== 200 || listData.data.assets.length !== 1 || listData.data.assets[0].name !== 'Laptop Dell') {
      throw new Error('Asset search filter failed');
    }

    // 4. Test Details Lookup
    console.log('📌 Test 4: Fetching asset details by ID...');
    const detailRes = await fetch(`${baseUrl}/assets/${asset1.id}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empToken}` },
    });
    const detailData = await detailRes.json();
    console.log('Details response status:', detailRes.status);
    if (detailRes.status !== 200 || detailData.data.asset.currentHolder !== null) {
      throw new Error('Asset details lookup failed or currentHolder is not null');
    }
    if (!Array.isArray(detailData.data.asset.allocationHistory) || !Array.isArray(detailData.data.asset.maintenanceHistory)) {
      throw new Error('Details response is missing history arrays');
    }

    // 5. Test Update restrictions (cannot change status or tag via PUT)
    console.log('📌 Test 5: Updating asset name and attempting to modify restricted fields...');
    const updateRes = await fetch(`${baseUrl}/assets/${asset1.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        name: 'Laptop Dell V2',
        assetTag: 'AF-9999', // should be ignored
        status: 'Retired',   // should be ignored
      }),
    });
    const updateData = await updateRes.json();
    console.log('Update response status:', updateRes.status);
    console.log('Updated asset details:', updateData.data.asset);
    
    if (updateRes.status !== 200) {
      throw new Error('Asset update request failed');
    }
    if (updateData.data.asset.name !== 'Laptop Dell V2') {
      throw new Error('Asset name was not updated');
    }
    if (updateData.data.asset.assetTag !== 'AF-0001') {
      throw new Error('Asset tag was illegally modified');
    }
    if (updateData.data.asset.status !== 'Available') {
      throw new Error('Asset status was illegally modified');
    }

    console.log('🎉 All Asset Registry verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    await prisma.asset.deleteMany({
      where: { id: { in: [asset1?.id, asset2?.id].filter(Boolean) } },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: electronicsCategory?.id },
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
