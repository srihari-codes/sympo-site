import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create a dummy image for testing file upload
const dummyImagePath = path.join(__dirname, 'test_dummy.png');
// 1x1 transparent PNG byte stream
const dummyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
fs.writeFileSync(dummyImagePath, dummyPng);

const BASE_URL = 'http://localhost:5050/api';

async function runTests() {
  console.log('🧪 Starting Zyverse Backend End-to-End Tests...\n');

  // Clean up any existing test records in SQLite
  try {
    const { default: db } = await import('./db.js');
    db.prepare("DELETE FROM users WHERE email IN ('alice@srmvec.edu.in', 'bob@srmvec.edu.in', 'charlie@srmvec.edu.in')").run();
  } catch (e) {
    // Ignore cleanup error if db file locked or not initialized
  }

  try {
    // 1. Health check
    console.log('1️⃣ Testing Health Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('   Response:', healthData.message);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // 2. Dev Google Auth for User A
    console.log('\n2️⃣ Testing Google Auth (User A)...');
    const authARes = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testEmail: 'alice@srmvec.edu.in',
        testName: 'Alice Vance',
        testGoogleId: 'google_alice_123',
      }),
    });
    const authA = await authARes.json();
    console.log(`   User A Logged In. Token: ${authA.token.substring(0, 20)}...`);
    const tokenA = authA.token;

    // 3. Dev Google Auth for User B
    console.log('\n3️⃣ Testing Google Auth (User B)...');
    const authBRes = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testEmail: 'bob@srmvec.edu.in',
        testName: 'Bob Smith',
        testGoogleId: 'google_bob_456',
      }),
    });
    const authB = await authBRes.json();
    console.log(`   User B Logged In. Token: ${authB.token.substring(0, 20)}...`);
    const tokenB = authB.token;

    // 4. Dev Google Auth for User C (for testing team size overflow)
    const authCRes = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testEmail: 'charlie@srmvec.edu.in',
        testName: 'Charlie Brown',
        testGoogleId: 'google_charlie_789',
      }),
    });
    const authC = await authCRes.json();
    const tokenC = authC.token;

    // 5. Onboarding for User A
    console.log('\n4️⃣ Testing User Onboarding (User A)...');
    const formA = new FormData();
    formA.append('first_name', 'Alice');
    formA.append('last_name', 'Vance');
    formA.append('phone_number', '9876543210');
    formA.append('email', 'alice@srmvec.edu.in');
    formA.append('id_card', new Blob([dummyPng], { type: 'image/png' }), 'alice_id.png');
    formA.append('profile_pic', new Blob([dummyPng], { type: 'image/png' }), 'alice_pic.png');

    const onboardARes = await fetch(`${BASE_URL}/user/onboarding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formA,
    });
    const onboardA = await onboardARes.json();
    console.log('   Onboarding Result:', onboardA.message, '| Is Onboarded:', onboardA.user.isOnboarded);
    if (!onboardA.user.isOnboarded) throw new Error('Onboarding failed for User A');

    // Onboarding for User B & C
    const formB = new FormData();
    formB.append('first_name', 'Bob');
    formB.append('last_name', 'Smith');
    formB.append('phone_number', '9876543211');
    formB.append('email', 'bob@srmvec.edu.in');
    formB.append('id_card', new Blob([dummyPng], { type: 'image/png' }), 'bob_id.png');
    formB.append('profile_pic', new Blob([dummyPng], { type: 'image/png' }), 'bob_pic.png');
    await fetch(`${BASE_URL}/user/onboarding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: formB,
    });

    const formC = new FormData();
    formC.append('first_name', 'Charlie');
    formC.append('last_name', 'Brown');
    formC.append('phone_number', '9876543212');
    formC.append('email', 'charlie@srmvec.edu.in');
    formC.append('id_card', new Blob([dummyPng], { type: 'image/png' }), 'charlie_id.png');
    formC.append('profile_pic', new Blob([dummyPng], { type: 'image/png' }), 'charlie_pic.png');
    await fetch(`${BASE_URL}/user/onboarding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
      body: formC,
    });

    // 6. List Events
    console.log('\n5️⃣ Testing Get Events...');
    const eventsRes = await fetch(`${BASE_URL}/events`);
    const eventsData = await eventsRes.json();
    console.log(`   Found ${eventsData.events.length} hardcoded events:`, eventsData.events.map((e) => e.name).join(', '));

    // 7. Event Registration (User A into 'siege-of-servers')
    console.log('\n6️⃣ Testing Event Registration (User A -> Siege of Servers)...');
    const regFormA = new FormData();
    regFormA.append('event_id', 'siege-of-servers');
    regFormA.append('payment_screenshot', new Blob([dummyPng], { type: 'image/png' }), 'payment_a.png');

    const regARes = await fetch(`${BASE_URL}/events/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: regFormA,
    });
    const regA = await regARes.json();
    console.log('   Registration Result:', regA.message, '| Status:', regA.registration.status);

    // 8. Test 1-event registration constraint (Attempt User A into 2nd event)
    console.log('\n7️⃣ Testing 1-Event Restriction Constraint...');
    const regFormA2 = new FormData();
    regFormA2.append('event_id', 'iron-throne');
    regFormA2.append('payment_screenshot', new Blob([dummyPng], { type: 'image/png' }), 'payment_a2.png');

    const regA2Res = await fetch(`${BASE_URL}/events/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: regFormA2,
    });
    const regA2 = await regA2Res.json();
    console.log(`   Status Code: ${regA2Res.status} | Error Message: "${regA2.error}"`);
    if (regA2Res.status === 400 && regA2.error.includes('register for only 1 event')) {
      console.log('   ✅ 1-event constraint enforced correctly!');
    } else {
      throw new Error('1-event constraint verification failed!');
    }

    // Register User B & User C for 'siege-of-servers' as well
    const regFormB = new FormData();
    regFormB.append('event_id', 'siege-of-servers');
    regFormB.append('payment_screenshot', new Blob([dummyPng], { type: 'image/png' }), 'payment_b.png');
    await fetch(`${BASE_URL}/events/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: regFormB,
    });

    const regFormC = new FormData();
    regFormC.append('event_id', 'siege-of-servers');
    regFormC.append('payment_screenshot', new Blob([dummyPng], { type: 'image/png' }), 'payment_c.png');
    await fetch(`${BASE_URL}/events/register`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenC}` },
      body: regFormC,
    });

    // 9. Team Creation (User A creates "Cyber Knights")
    console.log('\n8️⃣ Testing Team Creation (User A)...');
    const teamCreateRes = await fetch(`${BASE_URL}/teams/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Cyber Knights' }),
    });
    const teamCreate = await teamCreateRes.json();
    console.log(`   Team Created: "${teamCreate.team.name}" | Secret Code: [${teamCreate.team.code}] | Members: ${teamCreate.team.memberCount}/2`);
    const secretCode = teamCreate.team.code;

    // 10. Team Join (User B joins using Secret Code)
    console.log('\n9️⃣ Testing Team Join using Secret Code (User B)...');
    const teamJoinRes = await fetch(`${BASE_URL}/teams/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: secretCode }),
    });
    const teamJoin = await teamJoinRes.json();
    console.log(`   Join Result: ${teamJoin.message} | Member Count: ${teamJoin.team.memberCount}/2`);
    console.log('   Current Team Members:', teamJoin.team.members.map((m) => `${m.first_name} ${m.last_name}`).join(', '));

    // 11. Test Max 2 Members Limit (User C tries to join full team)
    console.log('\n🔟 Testing Max 2 Members Constraint (User C)...');
    const teamJoinFullRes = await fetch(`${BASE_URL}/teams/join`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenC}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: secretCode }),
    });
    const teamJoinFull = await teamJoinFullRes.json();
    console.log(`   Status Code: ${teamJoinFullRes.status} | Error Message: "${teamJoinFull.error}"`);
    if (teamJoinFullRes.status === 400 && teamJoinFull.error.includes('already full')) {
      console.log('   ✅ Max 2 members constraint enforced correctly!');
    } else {
      throw new Error('Max 2 members constraint verification failed!');
    }

    console.log('\n🎉 ALL BACKEND TESTS PASSED SUCCESSFULLY! 🚀\n');
  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(dummyImagePath)) {
      fs.unlinkSync(dummyImagePath);
    }
  }
}

runTests();
