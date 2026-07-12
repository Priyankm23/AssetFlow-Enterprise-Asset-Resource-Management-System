const prisma = require('../src/config/prisma');

async function runTests() {
  console.log('🚀 Starting Auth verification tests...');

  // Start the server
  const { server } = require('../src/server');
  const baseUrl = 'http://localhost:5000/api/v1/auth';
  
  const testEmail = 'test_auth_verify@example.com';
  const testPassword = 'Password123!';
  const testName = 'Verification Tester';

  try {
    // 0. Clean up any existing test user
    console.log('🧹 Cleaning up database...');
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    let token = '';

    // 1. Test POST /signup
    console.log('📌 Testing Signup...');
    const signupRes = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const signupData = await signupRes.json();
    console.log('Signup response status:', signupRes.status);
    console.log('Signup response data:', signupData);

    if (signupRes.status !== 201 || !signupData.success || !signupData.data.token) {
      throw new Error('Signup verification failed');
    }
    
    // Verify default role is Employee
    if (signupData.data.user.role !== 'Employee') {
      throw new Error('Signup role is not Employee');
    }

    // 2. Test duplicate Signup conflict (should return 409)
    console.log('📌 Testing Duplicate Signup (should fail)...');
    const dupRes = await fetch(`${baseUrl}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });

    const dupData = await dupRes.json();
    console.log('Duplicate Signup response status:', dupRes.status);
    console.log('Duplicate Signup response data:', dupData);

    if (dupRes.status !== 409 || dupData.success) {
      throw new Error('Duplicate signup did not fail with 409 Conflict as expected');
    }

    // 3. Test POST /login (success)
    console.log('📌 Testing Login...');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const loginData = await loginRes.json();
    console.log('Login response status:', loginRes.status);
    console.log('Login response data:', loginData);

    if (loginRes.status !== 200 || !loginData.success || !loginData.data.token) {
      throw new Error('Login verification failed');
    }

    token = loginData.data.token;

    // 4. Test POST /login with bad credentials (should fail with 401)
    console.log('📌 Testing Login with bad password (should fail)...');
    const badLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });

    const badLoginData = await badLoginRes.json();
    console.log('Bad Login response status:', badLoginRes.status);
    console.log('Bad Login response data:', badLoginData);

    if (badLoginRes.status !== 401 || badLoginData.success) {
      throw new Error('Bad login did not fail with 401 Unauthorized as expected');
    }

    // 5. Test GET /me with valid token
    console.log('📌 Testing GET /me with valid token...');
    const meRes = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const meData = await meRes.json();
    console.log('GET /me response status:', meRes.status);
    console.log('GET /me response data:', meData);

    if (meRes.status !== 200 || !meData.success || meData.data.user.email !== testEmail) {
      throw new Error('GET /me validation failed');
    }

    // 6. Test GET /me with invalid token (should fail with 401)
    console.log('📌 Testing GET /me with invalid token...');
    const badMeRes = await fetch(`${baseUrl}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer invalid_token_here`,
      },
    });

    const badMeData = await badMeRes.json();
    console.log('GET /me (invalid token) response status:', badMeRes.status);
    console.log('GET /me (invalid token) response data:', badMeData);

    if (badMeRes.status !== 401 || badMeData.success) {
      throw new Error('GET /me with invalid token did not fail as expected');
    }

    console.log('🎉 All Auth verification tests passed successfully!');

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exitCode = 1;
  } finally {
    // Clean up database
    console.log('🧹 Post-test database cleanup...');
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    
    // Close connections and server
    await prisma.$disconnect();
    server.close(() => {
      console.log('💤 Server stopped.');
      process.exit();
    });
  }
}

runTests();
