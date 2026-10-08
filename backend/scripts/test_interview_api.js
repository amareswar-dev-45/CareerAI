const axios = require('axios');
const mongoose = require('mongoose');
const env = require('../src/config/env');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api/v1/interview';

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  
  let student = await User.findOne({ role: 'student' });
  if (!student) {
    console.log('No student found, finding any user...');
    student = await User.findOne({});
  }
  
  if (!student) {
    console.error('No user found in database');
    process.exit(1);
  }
  
  console.log('Found user:', student.email, student.name);
  const token = jwt.sign(
    { 
      uid: student.firebaseUid, 
      id: student._id, 
      email: student.email, 
      name: student.name, 
      role: student.role 
    },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  try {
    console.log('\n--- 1. Testing GET /plan ---');
    const planRes = await axios.get(`${BASE_URL}/plan?company=TCS&role=Software Developer`, authHeaders);
    console.log('Plan response status:', planRes.status, 'Success:', planRes.data.success);
    const plan = planRes.data.data;
    console.log('Company:', plan.companyName);
    console.log('Rounds count:', plan.rounds.length);
    plan.rounds.forEach(r => console.log(`  Round ${r.roundNumber}: ${r.name} (${r.roundKey}) - Evidence: ${r.evidenceType}`));
    console.log('Sources count:', plan.sources.length);

    console.log('\n--- 2. Testing POST /aptitude/start ---');
    const aptRes = await axios.post(`${BASE_URL}/aptitude/start`, {
      company: 'TCS',
      role: 'Software Developer'
    }, authHeaders);
    console.log('Aptitude start status:', aptRes.status, 'Session ID:', aptRes.data.data.sessionId);
    console.log('Questions count:', aptRes.data.data.questions.length);
    console.log('Sample question 1:', aptRes.data.data.questions[0].questionText);

    const sessionId = aptRes.data.data.sessionId;

    console.log('\n--- 3. Testing POST /aptitude/complete ---');
    const answers = aptRes.data.data.questions.map((q, idx) => ({
      questionIndex: idx,
      selectedOption: q.correctAnswer !== undefined ? q.correctAnswer : 0
    }));
    const aptCompleteRes = await axios.post(`${BASE_URL}/aptitude/complete`, {
      sessionId,
      answers,
      timeTakenSeconds: 320
    }, authHeaders);
    console.log('Aptitude complete score:', aptCompleteRes.data.data.score, 'Passed:', aptCompleteRes.data.data.passed);

    console.log('\n--- 4. Testing POST /technical/start ---');
    const techRes = await axios.post(`${BASE_URL}/technical/start`, {
      company: 'TCS',
      role: 'Software Developer'
    }, authHeaders);
    console.log('Technical start status:', techRes.status, 'Session ID:', techRes.data.data.sessionId);
    console.log('Questions count:', techRes.data.data.questions.length);
    const techSessionId = techRes.data.data.sessionId;

    console.log('\n--- 5. Testing POST /technical/evaluate-answer ---');
    const evalRes = await axios.post(`${BASE_URL}/technical/evaluate-answer`, {
      sessionId: techSessionId,
      questionId: techRes.data.data.questions[0].questionId,
      question: techRes.data.data.questions[0].questionText,
      answer: 'In Java, OOP concepts include Encapsulation, Abstraction, Inheritance, and Polymorphism. Polymorphism allows methods to do different things based on the object, like overloading and overriding.'
    }, authHeaders);
    console.log('Answer score:', evalRes.data.data.score, 'Feedback:', evalRes.data.data.feedback);

    console.log('\n--- 6. Testing POST /live-token ---');
    const tokenRes = await axios.post(`${BASE_URL}/live-token`, {
      company: 'TCS',
      role: 'Software Developer'
    }, authHeaders);
    console.log('Live token response:', tokenRes.data.success, 'Token prefix:', tokenRes.data.data.token.substring(0, 20));

    console.log('\n--- 7. Testing POST /hr/live-exchange ---');
    const hrExchangeRes = await axios.post(`${BASE_URL}/hr/live-exchange`, {
      company: 'TCS',
      role: 'Software Developer',
      userMessage: 'Hello, I am excited to interview for the Software Developer role at TCS. I have built full-stack applications and I love solving complex engineering problems.',
      history: []
    }, authHeaders);
    console.log('HR AI reply:', hrExchangeRes.data.data.aiText);
    console.log('Audio received:', !!hrExchangeRes.data.data.audioUrl);

    console.log('\n--- 8. Testing POST /hr/complete ---');
    const hrCompleteRes = await axios.post(`${BASE_URL}/hr/complete`, {
      sessionId: techSessionId,
      company: 'TCS',
      role: 'Software Developer'
    }, authHeaders);
    console.log('Report generated successfully!');
    const finalReport = hrCompleteRes.data.data.finalReport;
    console.log('Overall score:', finalReport.overallScore);
    console.log('Readiness:', finalReport.companyReadiness);
    console.log('What you did well (count):', finalReport.whatYouDidWell?.length);
    console.log('Better answer approaches (count):', finalReport.betterAnswerApproaches?.length);

    console.log('\nALL 8 INTERVIEW ENDPOINTS VERIFIED SUCCESFULLY! 🎉');
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
