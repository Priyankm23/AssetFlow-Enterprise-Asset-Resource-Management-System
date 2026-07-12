const prisma = require('../src/config/prisma');
const bcrypt = require('bcryptjs');

async function runTests() {
  console.log('🚀 Starting Org Setup verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1';

  const adminEmail = 'admin_tester@example.com';
  const headEmail = 'dept_head_tester@example.com';
  const empEmail = 'employee_tester@example.com';
  const password = 'Password123!';

  let adminToken = '';
  let empToken = '';
  let adminUser, headUser, empUser;
  let engineeringDept, hqDept, electronicsCat;

  try {
    // 0. Clean up previous test runs
    console.log('🧹 Cleaning up database from prior test runs...');
    await prisma.department.deleteMany({
      where: { name: { in: ['Engineering', 'HQ'] } },
    });
    await prisma.assetCategory.deleteMany({
      where: { name: 'Electronics' },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, headEmail, empEmail] } },
    });

    // Seed users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    console.log('🌱 Seeding test users...');
    adminUser = await prisma.user.create({
      data: { name: 'Admin User', email: adminEmail, passwordHash, role: 'Admin' },
    });
    headUser = await prisma.user.create({
      data: { name: 'Dept Head User', email: headEmail, passwordHash, role: 'Employee' },
    });
    empUser = await prisma.user.create({
      data: { name: 'Emp User', email: empEmail, passwordHash, role: 'Employee' },
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

    adminToken = await login(adminEmail);
    empToken = await login(empEmail);

    // 1. Test Admin Promoting headUser to DepartmentHead role
    console.log('📌 Test 1: Promoting head user to DepartmentHead role (Admin)...');
    const promoRes = await fetch(`${baseUrl}/users/${headUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: 'DepartmentHead' }),
    });
    const promoData = await promoRes.json();
    console.log('Promotion status:', promoRes.status);
    if (promoRes.status !== 200 || promoData.data.user.role !== 'DepartmentHead') {
      throw new Error('Promotion to DepartmentHead failed');
    }

    // 2. Test role guard: Employee trying to promote someone (should fail)
    console.log('📌 Test 2: Employee attempting to promote (should fail 403)...');
    const badPromoRes = await fetch(`${baseUrl}/users/${empUser.id}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${empToken}`,
      },
      body: JSON.stringify({ role: 'AssetManager' }),
    });
    console.log('Employee promotion attempt status:', badPromoRes.status);
    if (badPromoRes.status !== 403) {
      throw new Error('Employee was not blocked from changing roles');
    }

    // 3. Test Department Head assignment constraint
    // A: Try to assign Employee as Dept Head (should fail)
    console.log('📌 Test 3A: Creating department with invalid Head role (should fail 400)...');
    const badDeptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Engineering',
        headUserId: empUser.id,
      }),
    });
    console.log('Invalid head assignment status:', badDeptRes.status);
    if (badDeptRes.status !== 400) {
      throw new Error('Allowed assigning an Employee as department head');
    }

    // B: Assign actual DepartmentHead role user (should succeed)
    console.log('📌 Test 3B: Creating department with valid DepartmentHead...');
    const deptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Engineering',
        headUserId: headUser.id,
      }),
    });
    const deptData = await deptRes.json();
    console.log('Department creation status:', deptRes.status);
    if (deptRes.status !== 201 || !deptData.success) {
      throw new Error('Department creation failed');
    }
    engineeringDept = deptData.data.department;

    // 4. Test Category CRUD
    console.log('📌 Test 4: Creating asset category...');
    const catRes = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Electronics',
        customFields: { warrantyPeriodMonths: 12 },
      }),
    });
    const catData = await catRes.json();
    console.log('Category creation status:', catRes.status);
    if (catRes.status !== 201 || !catData.success) {
      throw new Error('Category creation failed');
    }
    electronicsCat = catData.data.category;

    // 5. Test Circular Dependency Check
    // A: Create HQ department
    console.log('📌 Test 5A: Creating parent department HQ...');
    const hqRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: 'HQ' }),
    });
    const hqData = await hqRes.json();
    hqDept = hqData.data.department;

    // B: Set HQ as parent of Engineering (should succeed)
    console.log('📌 Test 5B: Setting HQ as parent of Engineering (succeed)...');
    const updateParentRes = await fetch(`${baseUrl}/departments/${engineeringDept.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ parentDepartmentId: hqDept.id }),
    });
    console.log('Engineering parent update status:', updateParentRes.status);
    if (updateParentRes.status !== 200) {
      throw new Error('Failed to set parent department');
    }

    // C: Set Engineering as parent of HQ (should fail - circular dependency!)
    console.log('📌 Test 5C: Setting Engineering as parent of HQ (should fail 400 circular)...');
    const circularRes = await fetch(`${baseUrl}/departments/${hqDept.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ parentDepartmentId: engineeringDept.id }),
    });
    const circularData = await circularRes.json();
    console.log('Circular dependency update status:', circularRes.status);
    console.log('Circular dependency error details:', circularData.error);
    if (circularRes.status !== 400 || circularData.error.code !== 'CIRCULAR_DEPENDENCY') {
      throw new Error('Allowed circular dependency in department hierarchy');
    }

    // 6. Employee read check
    console.log('📌 Test 6: Employee fetching categories and departments...');
    const getDeptsRes = await fetch(`${baseUrl}/departments`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${empToken}` },
    });
    console.log('Employee fetching departments status:', getDeptsRes.status);
    if (getDeptsRes.status !== 200) {
      throw new Error('Employee could not read departments list');
    }

    console.log('🎉 All Org Setup verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('🧹 Post-test database cleanup...');
    // Delete created resources
    await prisma.department.deleteMany({
      where: { id: { in: [engineeringDept?.id, hqDept?.id].filter(Boolean) } },
    });
    await prisma.assetCategory.deleteMany({
      where: { id: electronicsCat?.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminUser?.id, headUser?.id, empUser?.id].filter(Boolean) } },
    });

    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
