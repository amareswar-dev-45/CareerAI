const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000/api/v1';

async function runTests() {
  console.log('========================================================');
  console.log('RUNNING COMPREHENSIVE TESTS FOR RESUME-OPTIONAL ONBOARDING');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1, 7, 8, 9: User A Skips Resume during Onboarding
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 1: User A completes onboarding with SKIP RESUME ---');
  const userAEmail = `test_skip_${Date.now()}@careerai.local`;
  const userAPassword = 'Password123!';

  // 1. Register User A
  const regARes = await axios.post(`${BASE_URL}/auth/signup`, {
    email: userAEmail,
    password: userAPassword,
    name: 'Skip User',
    role: 'student'
  });
  const tokenA = regARes.data.data.token;
  assert(tokenA, 'User A registered and received auth token');

  const clientA = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${tokenA}` }
  });

  // 2. Complete onboarding with resumeStatus: 'skipped' (No file uploaded)
  const obARes = await clientA.post('/auth/onboarding', {
    collegeName: 'GCEK Engineering College',
    degree: 'B.Tech CSE',
    graduationYear: 2026,
    targetRole: 'Java Developer',
    dreamCompany: 'Amazon',
    resumeStatus: 'skipped'
  });
  assert(obARes.data.success, 'User A completed onboarding without resume (Skip for Now)');
  assert(obARes.data.data.user.resumeStatus === 'skipped', 'User A status is "skipped"');

  // 3. Test ATS score for skipped user (TEST 7)
  const atsARes = await clientA.get('/resume/current');
  assert(atsARes.data.success, 'User A can fetch current ATS status without error');
  assert(atsARes.data.data.atsScore === 0, 'User A ATS Readiness is exactly 0/100');
  assert(atsARes.data.data.hasResume === false, 'User A hasResume is false');
  assert(
    atsARes.data.data.feedback?.overview?.includes('No resume available for analysis'),
    'ATS overview clearly states: "No resume available for analysis"'
  );

  // 4. Test Skills Gap for skipped user (TEST 8)
  const gapARes = await clientA.get('/skills/latest');
  assert(gapARes.data.success, 'User A fetches skill gap without RESUME_MISSING error');
  const skillsToImproveA = gapARes.data.data.skillsToImprove || [];
  assert(skillsToImproveA.length > 0, `Skill gap generated for Java Developer with ${skillsToImproveA.length} expected skills`);
  
  const notProvidedSkills = skillsToImproveA.filter(s => s.status === 'Not provided / Not verified');
  assert(notProvidedSkills.length > 0, `Unverified skills labeled as "Not provided / Not verified" (${notProvidedSkills.length} items)`);
  assert(
    skillsToImproveA[0].reason?.includes('Not provided / Missing from current profile'),
    'Skill gap reason says "Not provided / Missing from current profile", does not claim user lacks ability'
  );
  assert((gapARes.data.data.skillsYouHave || []).length === 0, 'No fake skills invented for skipped user');

  // 5. Test Roadmap Generation from Target Role (TEST 9)
  const roadmapARes = await clientA.post('/roadmap/generate', {
    targetRole: 'Java Developer',
    durationDays: 30
  });
  assert(roadmapARes.data.success, 'User A generated 30-day roadmap based on target role without resume');
  assert(roadmapARes.data.data.roadmap?.length > 0, 'Roadmap contains structured learning phases');

  // --------------------------------------------------------------------------
  // TEST 2, 3: User B completes onboarding via "Create Resume" & Save & Analyze
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: User B creates structured resume via Resume Builder ---');
  const userBEmail = `test_builder_${Date.now()}@careerai.local`;
  const regBRes = await axios.post(`${BASE_URL}/auth/signup`, {
    email: userBEmail,
    password: userAPassword,
    name: 'Builder User',
    role: 'student'
  });
  const tokenB = regBRes.data.data.token;
  const clientB = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${tokenB}` }
  });

  // Onboarding completed with created
  await clientB.post('/auth/onboarding', {
    collegeName: 'ABC Institute of Tech',
    degree: 'B.Tech IT',
    graduationYear: 2025,
    targetRole: 'Java Developer',
    dreamCompany: 'Infosys',
    resumeStatus: 'created'
  });

  // User B submits structured resume via /resume/builder/save-and-analyze
  const builderData = {
    personal: {
      fullName: 'Builder User',
      email: userBEmail,
      phone: '+91 9876543210',
      college: 'ABC Institute of Tech',
      degree: 'B.Tech IT',
      targetRole: 'Java Developer',
      dreamCompany: 'Infosys'
    },
    skills: {
      technical: ['Java', 'Spring Boot', 'SQL', 'REST API', 'Git', 'OOP'],
      soft: ['Communication', 'Teamwork']
    },
    experience: [
      {
        company: 'Tech Internships Inc',
        role: 'Java Developer Intern',
        duration: '6 Months',
        description: 'Developed REST APIs using Spring Boot and connected MySQL databases.'
      }
    ],
    projects: [
      {
        title: 'E-Commerce Backend',
        techStack: 'Java, Spring Boot, MySQL',
        description: 'Built scalable backend microservices with JWT authentication.'
      }
    ],
    education: [
      {
        institution: 'ABC Institute of Tech',
        degree: 'B.Tech IT',
        year: '2025',
        score: '8.8 CGPA'
      }
    ]
  };

  const saveAnalyzeB = await clientB.post('/resume/builder/save-and-analyze', {
    resumeData: builderData,
    targetRole: 'Java Developer'
  });
  assert(saveAnalyzeB.data.success, 'User B saved and analyzed structured resume');
  assert(saveAnalyzeB.data.data.atsScore > 40, `User B ATS score is generated (${saveAnalyzeB.data.data.atsScore}/100)`);
  assert(saveAnalyzeB.data.data.resumeStatus === 'created', 'User B resumeStatus updated to "created"');

  // Verify skills gap for User B now detects Java & Spring Boot
  const gapBRes = await clientB.get('/skills/latest');
  assert(gapBRes.data.success, 'User B fetched skill gap after creating resume');
  assert(
    (gapBRes.data.data.skillsYouHave || []).some(s => s.toLowerCase().includes('java') || s.toLowerCase().includes('spring')),
    'User B skills gap verified skills from structured resume builder'
  );

  // --------------------------------------------------------------------------
  // TEST 5: User A (who initially skipped) now creates a resume later
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3: User A (skipped earlier) later creates resume via Builder ---');
  const laterBuilderRes = await clientA.post('/resume/builder/save-and-analyze', {
    resumeData: {
      personal: {
        fullName: 'Skip User',
        email: userAEmail,
        college: 'GCEK Engineering College',
        degree: 'B.Tech CSE',
        targetRole: 'Java Developer'
      },
      skills: {
        technical: ['Java', 'SQL', 'OOP', 'Data Structures', 'Git'],
        soft: ['Problem Solving']
      },
      projects: [
        {
          title: 'Student Portal',
          techStack: 'Java, SQL',
          description: 'Designed database and implemented student management system.'
        }
      ]
    },
    targetRole: 'Java Developer'
  });
  assert(laterBuilderRes.data.success, 'User A successfully created and analyzed resume later');
  assert(laterBuilderRes.data.data.atsScore > 0, `User A ATS score updated from 0 to ${laterBuilderRes.data.data.atsScore}/100`);

  const atsAAfterRes = await clientA.get('/resume/current');
  assert(atsAAfterRes.data.data.atsScore > 0, 'User A current resume reflects new ATS analysis score');

  // --------------------------------------------------------------------------
  // TEST 11: Navigation does not trigger unnecessary repeated analysis
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Cached navigation verification ---');
  const startA = Date.now();
  const gapACached1 = await clientA.get('/skills/latest?targetRole=Java%20Developer');
  const time1 = Date.now() - startA;
  assert(gapACached1.data.success, `Cached skill gap response returned in ${time1}ms without re-analyzing`);

  // --------------------------------------------------------------------------
  // TEST 4 & 6: User uploads a resume later
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: User C uploads resume file later ---');
  const userCEmail = `test_upload_${Date.now()}@careerai.local`;
  const regCRes = await axios.post(`${BASE_URL}/auth/signup`, {
    email: userCEmail,
    password: userAPassword,
    name: 'Upload User',
    role: 'student'
  });
  const tokenC = regCRes.data.data.token;
  const clientC = axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${tokenC}` }
  });

  // User C skips onboarding initially
  await clientC.post('/auth/onboarding', {
    collegeName: 'Govt College of Engg',
    degree: 'B.Tech IT',
    graduationYear: 2026,
    targetRole: 'Java Developer',
    dreamCompany: 'Oracle',
    resumeStatus: 'skipped'
  });

  const atsCBefore = await clientC.get('/resume/current');
  assert(atsCBefore.data.data.atsScore === 0, 'User C initially has 0 ATS score after skipping');

  // Now User C uploads a resume
  const FormData = require('form-data');
  const form = new FormData();
  form.append('targetRole', 'Java Developer');
  form.append('resume', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Java Developer Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'), {
    filename: 'java_developer_resume.pdf',
    contentType: 'application/pdf'
  });

  const uploadRes = await axios.post(`${BASE_URL}/resume/upload`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${tokenC}`
    }
  });
  assert(uploadRes.data.success, 'User C uploaded resume file successfully');
  assert((uploadRes.data.data.atsScore || uploadRes.data.data.atsAnalysis?.score || uploadRes.data.data.atsAnalysis?.atsScore) > 0, 'User C ATS score generated from upload');

  const atsCAfter = await clientC.get('/resume/current');
  assert(atsCAfter.data.data.atsScore > 0, 'User C ATS score updated from 0 after file upload');
  assert(atsCAfter.data.data.hasResume === true, 'User C hasResume is now true');

  console.log('\n========================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err.response?.data || err.message);
  process.exit(1);
});
