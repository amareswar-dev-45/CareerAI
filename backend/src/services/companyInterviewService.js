const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const CompanyInterviewPlan = require('../models/CompanyInterviewPlan');
const aiService = require('./aiService');

class CompanyInterviewService {
  constructor() {
    this.tavilyApiKey = env.TAVILY_API_KEY || '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';
    this.serpApiKey = env.SERP_API_KEY;
    this.geminiApiKey = env.GEMINI_COMMUNICATION_API || env.GEMINI_API_KEY;
    this.deepgramApiKey = env.SPEECH_TO_TEXT_API_KEY || env.VOICE_AGENT_API_KEY;
    this.ttsApiKey = env.TEXT_TO_SPEECH_API_KEY || env.SPEECH_TO_TEXT_API_KEY;
    this.models = ['models/gemini-3.5-flash-lite', 'models/gemini-3.8-flash'];
  }

  // 1. Tavily Search Helper
  async searchTavily(query, maxResults = 3) {
    if (!this.tavilyApiKey) return [];
    try {
      const res = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults
      }, { timeout: 12000 });

      if (res.data && Array.isArray(res.data.results)) {
        return res.data.results.map(r => ({
          title: r.title || 'Public Report',
          url: r.url || '',
          snippet: r.content || r.snippet || '',
          provenance: 'Tavily public web search'
        }));
      }
    } catch (err) {
      console.warn(`[CompanyInterview] Tavily search notice for "${query}":`, err.response?.data?.error || err.message);
    }
    return [];
  }

  // 2. SerpAPI Search Helper
  async searchSerpApi(query, maxResults = 3) {
    if (!this.serpApiKey) return [];
    try {
      const res = await axios.get('https://serpapi.com/search.json', {
        params: {
          engine: 'google',
          q: query,
          api_key: this.serpApiKey,
          num: maxResults
        },
        timeout: 10000
      });

      if (res.data && Array.isArray(res.data.organic_results)) {
        return res.data.organic_results.slice(0, maxResults).map(r => ({
          title: r.title || 'Public Search Result',
          url: r.link || '',
          snippet: r.snippet || '',
          provenance: 'SerpAPI Google Search'
        }));
      }
    } catch (err) {
      console.warn(`[CompanyInterview] SerpAPI query notice for "${query}":`, err.message);
    }
    return [];
  }

  // 3. Fallback Web Search
  async searchWithFallback(query, maxResults = 3) {
    let results = await this.searchTavily(query, maxResults);
    if (!results || results.length < 2) {
      const serpResults = await this.searchSerpApi(query, maxResults);
      results = [...results, ...serpResults];
    }
    // Deduplicate by URL
    const seen = new Set();
    return (results || []).filter(r => {
      if (!r || !r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });
  }

  // 4. Gemini AI Calling
  async callGeminiJSON(prompt, systemInstruction = "You are an expert AI Interview Director. Output valid JSON only.") {
    if (this.geminiApiKey) {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}\n\nCRITICAL: Output raw valid JSON only. Do not wrap in markdown or backticks.` }]
          }
        ]
      };

      for (const model of this.models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${this.geminiApiKey}`;
          const res = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 20000
          });

          const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            return JSON.parse(cleaned);
          }
        } catch (e) {
          // continue to next model
        }
      }
    }

    if (env.GROQ_API_KEY) {
      try {
        const groqRes = await aiService.callGroq(prompt, systemInstruction);
        if (groqRes) return groqRes;
      } catch (err) {
        console.warn('[CompanyInterview] Groq fallback notice:', err.message);
      }
    }

    return null;
  }

  // =========================================================================
  // STEP 1 & 2: RESEARCH COMPANY INTERVIEW PROCESS & DYNAMIC FLOW
  // =========================================================================
  async researchInterviewProcess(companyName, targetRole = 'Software Engineer', forceRefresh = false) {
    const cleanCompany = (companyName || 'Google').trim();
    const cleanRole = (targetRole || 'Software Engineer').trim();
    const normCompany = cleanCompany.toLowerCase();
    const normRole = cleanRole.toLowerCase();

    // Check MongoDB cache
    if (!forceRefresh && mongoose.connection.readyState === 1) {
      try {
        const cached = await CompanyInterviewPlan.findOne({
          normalizedCompanyName: normCompany,
          normalizedRole: normRole
        });
        if (cached && cached.rounds && cached.rounds.length > 0) {
          const ageDays = (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (ageDays < 7) {
            console.log(`[CompanyInterview] Cache hit for ${cleanCompany} — ${cleanRole}`);
            return cached.toObject ? cached.toObject() : cached;
          }
        }
      } catch (e) {
        console.warn('[CompanyInterview] Cache read warning:', e.message);
      }
    }

    console.log(`[CompanyInterview] Researching interview process for ${cleanCompany} — ${cleanRole}...`);

    // Search queries
    const q1 = `"${cleanCompany}" "${cleanRole}" interview process rounds stages`;
    const q2 = `"${cleanCompany}" "${cleanRole}" aptitude assessment technical hr round interview experience questions`;

    const [snippets1, snippets2] = await Promise.all([
      this.searchWithFallback(q1, 4),
      this.searchWithFallback(q2, 4)
    ]);

    const seenUrls = new Set();
    const allSnippets = [...snippets1, ...snippets2].filter(s => {
      if (!s.url || seenUrls.has(s.url)) return false;
      seenUrls.add(s.url);
      return true;
    });

    // Gemini Prompt to extract the verified interview process
    const prompt = `Analyze these real public search snippets regarding the hiring and interview process for "${cleanCompany}" for the role "${cleanRole}".

CRITICAL RULES:
1. Do NOT invent interview rounds. Only create a round if there is public evidence in the snippets.
2. Label each round's evidenceType as "Reported by candidates", "Official company information", or "Based on multiple public sources".
3. Typical rounds might include:
   - "aptitude": Online Assessment / Aptitude / Cognitive Test / NQT
   - "technical": Technical Interview / Coding & DSA / Frameworks & System Design
   - "hr": HR & Behavioral Interview / Managerial Round / Cultural Fit (Gemini Live)
4. For each round, provide roundKey ("aptitude", "technical", or "hr"), roundNumber, name, description, durationMinutes, reportedTopics, passThreshold (e.g. 60).
5. If the company rarely conducts an aptitude round (e.g. some startups go straight to technical/coding), reflect that! But if it's TCS, Infosys, Wipro, Accenture, Cognizant, etc., an aptitude/assessment round is almost always round 1.
6. If public data is scarce, explicitly note: "Limited public interview data is available for this company and role."
7. Extract frequentlyAskedTopics, interviewDifficulty ("Easy", "Medium", "Hard"), and candidateExperience summary.

Search Snippets:
${JSON.stringify(allSnippets.slice(0, 8))}

Output valid JSON matching this schema:
{
  "difficulty": "Medium",
  "summary": "Brief summary of the researched interview flow",
  "rounds": [
    {
      "roundKey": "aptitude" | "technical" | "hr",
      "roundNumber": 1,
      "name": "Round Title",
      "description": "Round overview",
      "evidenceType": "Reported by candidates" | "Official company information" | "Based on multiple public sources",
      "durationMinutes": 15,
      "reportedTopics": ["Topic 1", "Topic 2"],
      "passThreshold": 60
    }
  ],
  "frequentlyAskedTopics": ["Topic 1", "Topic 2"],
  "candidateExperience": "Summary of overall candidate experience reports",
  "hasLimitedData": false
}`;

    const systemInstruction = `You are a corporate hiring researcher synthesizing factual public candidate reports. Never invent interview stages. Return valid JSON only.`;

    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    // Fallback if AI or snippets are thin
    let rounds = Array.isArray(aiRes?.rounds) && aiRes.rounds.length > 0 ? aiRes.rounds : [];

    if (rounds.length === 0) {
      rounds = this.buildDynamicRounds(cleanCompany, cleanRole);
    } else {
      // Ensure all rounds have required properties
      rounds = rounds.map((r, i) => ({
        roundKey: r.roundKey || (i === 0 ? 'aptitude' : i === 1 ? 'technical' : 'hr'),
        roundNumber: r.roundNumber || (i + 1),
        name: r.name || `Round ${i + 1}`,
        description: r.description || `Assessment round for ${cleanRole}`,
        roundType: r.roundType || (r.roundKey === 'aptitude' ? 'aptitude' : r.roundKey === 'hr' ? 'hr' : 'technical'),
        evidenceType: r.evidenceType || 'Reported by candidates',
        durationMinutes: r.durationMinutes || (r.roundKey === 'technical' ? 25 : 15),
        questionCount: r.questionCount || (r.roundKey === 'technical' ? 5 : 10),
        reportedTopics: Array.isArray(r.reportedTopics) ? r.reportedTopics : this.getRoleDefaultTopics(cleanRole, r.roundKey),
        passThreshold: r.passThreshold || 60
      }));
    }

    const planData = {
      companyName: cleanCompany,
      normalizedCompanyName: normCompany,
      targetRole: cleanRole,
      normalizedRole: normRole,
      difficulty: aiRes?.difficulty || 'Medium',
      rounds,
      summary: aiRes?.summary || `Researched ${rounds.length}-stage tailored interview process for ${cleanCompany} (${cleanRole}).`,
      frequentlyAskedTopics: Array.isArray(aiRes?.frequentlyAskedTopics) && aiRes.frequentlyAskedTopics.length > 0
        ? aiRes.frequentlyAskedTopics
        : this.getRoleDefaultTopics(cleanRole, 'all'),
      candidateExperience: aiRes?.candidateExperience || 'Structured evaluation focusing on role-specific competency and technical execution.',
      sourceAttribution: allSnippets.length > 0 
        ? `Based on ${allSnippets.length} public candidate reports & verified hiring patterns` 
        : 'AI-generated based on hiring patterns (no verified official claim made).',
      sources: allSnippets.slice(0, 6).map(s => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet
      })),
      lastResearched: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await CompanyInterviewPlan.findOneAndUpdate(
          { normalizedCompanyName: normCompany, normalizedRole: normRole },
          { $set: planData },
          { upsert: true, new: true }
        );
        return saved.toObject ? saved.toObject() : saved;
      } catch (err) {
        console.warn('[CompanyInterview] Cache save warning:', err.message);
      }
    }

    return planData;
  }

  // Helper: Default topics per role and round
  getRoleDefaultTopics(role = '', roundKey = 'technical') {
    const r = role.toLowerCase();
    if (r.includes('data analyst') || r.includes('business analyst') || r.includes('data science')) {
      if (roundKey === 'aptitude') return ['Data Interpretation', 'Quantitative Aptitude', 'Logical Deduction', 'Basic Probability'];
      if (roundKey === 'hr') return ['Business Communication', 'Stakeholder Management', 'Analytics Projects', 'Why Analytics'];
      return ['SQL Queries & Joins', 'Excel & Pivot Tables', 'Statistics & A/B Testing', 'Python / Pandas', 'Data Cleaning & ETL'];
    }
    if (r.includes('mern') || r.includes('full stack') || r.includes('react') || r.includes('frontend') || r.includes('node') || r.includes('web')) {
      if (roundKey === 'aptitude') return ['Logic & Pseudocode', 'Numerical Ability', 'Verbal Reasoning'];
      if (roundKey === 'hr') return ['Team Collaboration', 'Agile & Sprints', 'Project Challenges', 'Career Growth'];
      return ['JavaScript & ES6+', 'React Hooks & State', 'Node.js & Express', 'MongoDB & Aggregation', 'REST APIs & Auth'];
    }
    if (r.includes('devops') || r.includes('cloud')) {
      return ['Docker & Kubernetes', 'CI/CD Pipelines', 'Linux & Networking', 'AWS/Cloud Infrastructure', 'Terraform & IaC'];
    }
    if (r.includes('qa') || r.includes('test')) {
      return ['Manual Testing & Bug Life Cycle', 'Selenium / Cypress', 'API Testing (Postman)', 'Test Case Design', 'CI/CD Integration'];
    }
    // Standard SDE / Software Engineer
    if (roundKey === 'aptitude') return ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Technical Reasoning'];
    if (roundKey === 'hr') return ['STAR Behavioral Scenarios', 'Why This Company', 'Project Deep-Dive', 'Team Collaboration'];
    return ['Data Structures & Algorithms', 'Object-Oriented Programming', 'DBMS & SQL', 'Operating Systems & Concurrency', 'System Architecture'];
  }

  // Helper: Build dynamic interview rounds depending on Company + Role
  buildDynamicRounds(companyName, targetRole) {
    const comp = (companyName || 'TCS').trim();
    const role = (targetRole || 'Software Engineer').trim();
    const compLower = comp.toLowerCase();
    const roleLower = role.toLowerCase();

    const isServiceBased = /tcs|infosys|wipro|cognizant|accenture|capgemini|hcl|tech mahindra|l&t|hexaware/i.test(compLower);
    const isBigTech = /google|microsoft|amazon|meta|apple|netflix|uber|adobe|atlassian|salesforce/i.test(compLower);

    // 1. Data Analyst / Analytics
    if (roleLower.includes('data analyst') || roleLower.includes('business analyst')) {
      return [
        {
          roundKey: 'aptitude',
          roundNumber: 1,
          name: `${comp} Data & Quantitative Assessment`,
          description: 'Timed assessment evaluating data interpretation, numerical reasoning, and basic statistics.',
          roundType: 'aptitude',
          evidenceType: isServiceBased ? 'Reported by candidates' : 'AI-generated based on hiring patterns',
          durationMinutes: 15,
          questionCount: 10,
          reportedTopics: ['Data Interpretation', 'Quantitative Aptitude', 'Probability & Averages', 'Logical Deduction'],
          passThreshold: 60
        },
        {
          roundKey: 'technical',
          roundNumber: 2,
          name: `${role} Technical & Analytics Interview`,
          description: `Deep dive into SQL joins, Excel functions, data wrangling with Python, and business metrics for ${comp}.`,
          roundType: 'technical',
          evidenceType: 'AI-generated based on hiring patterns',
          durationMinutes: 25,
          questionCount: 5,
          reportedTopics: ['SQL (JOINs, GROUP BY, Window Functions)', 'Excel & Spreadsheets', 'Statistics & Hypothesis Testing', 'Python / Pandas', 'Business Case Scenarios'],
          passThreshold: 60
        },
        {
          roundKey: 'hr',
          roundNumber: 3,
          name: 'Managerial, Behavioral & Business Fit',
          description: `Interactive conversational interview evaluating client communication, storytelling with data, and fit for ${comp}.`,
          roundType: 'hr',
          evidenceType: 'Reported by candidates',
          durationMinutes: 15,
          questionCount: 4,
          reportedTopics: ['Stakeholder Communication', 'Project Walkthrough', 'Handling Missing Data', `Why ${comp}`],
          passThreshold: 60
        }
      ];
    }

    // 2. MERN Stack / Full Stack Developer
    if (roleLower.includes('mern') || roleLower.includes('full stack') || roleLower.includes('web developer')) {
      const rounds = [];
      let roundNum = 1;

      if (isServiceBased) {
        rounds.push({
          roundKey: 'aptitude',
          roundNumber: roundNum++,
          name: `${comp} Foundation & Cognitive Assessment`,
          description: 'Timed evaluation of logical reasoning, numerical aptitude, and pseudocode.',
          roundType: 'aptitude',
          evidenceType: 'Reported by candidates',
          durationMinutes: 15,
          questionCount: 10,
          reportedTopics: ['Quantitative Ability', 'Logical Reasoning', 'Pseudocode / Logic'],
          passThreshold: 60
        });
      }

      rounds.push({
        roundKey: 'technical',
        roundNumber: roundNum++,
        name: `MERN & Full Stack Architecture Interview`,
        description: `Comprehensive interview covering React internals, Node.js event loop, Express middleware, and MongoDB document modeling.`,
        roundType: 'technical',
        evidenceType: 'AI-generated based on hiring patterns',
        durationMinutes: 30,
        questionCount: 5,
        reportedTopics: ['JavaScript & Async / Event Loop', 'React Hooks & State Management', 'Node.js & Express REST APIs', 'MongoDB Schema & Indexes', 'JWT Authentication & Security'],
        passThreshold: 60
      });

      rounds.push({
        roundKey: 'hr',
        roundNumber: roundNum++,
        name: 'HR & Cultural Alignment (Gemini Live)',
        description: `Interactive conversational evaluation of team collaboration, agile execution, and career aspirations at ${comp}.`,
        roundType: 'hr',
        evidenceType: 'Reported by candidates',
        durationMinutes: 15,
        questionCount: 4,
        reportedTopics: ['Project Highlights', 'Agile & Sprint Deadlines', 'Conflict Resolution', `Why ${comp}`],
        passThreshold: 60
      });

      return rounds;
    }

    // 3. BigTech SDE (e.g. Google, Microsoft, Amazon)
    if (isBigTech) {
      return [
        {
          roundKey: 'technical',
          roundNumber: 1,
          name: `${comp} Algorithms & Problem Solving Round`,
          description: 'Deep dive into data structures, algorithm complexity, dynamic programming, and graph traversal.',
          roundType: 'technical',
          evidenceType: 'Reported by candidates',
          durationMinutes: 30,
          questionCount: 5,
          reportedTopics: ['Data Structures (Trees, Heaps, Graphs)', 'Dynamic Programming & Recursion', 'Time & Space Complexity', 'Algorithmic Optimization'],
          passThreshold: 65
        },
        {
          roundKey: 'hr',
          roundNumber: 2,
          name: `${comp} Behavioral & Leadership Principles`,
          description: `Conversational interview evaluating cultural tenets, ownership, dealing with ambiguity, and technical trade-offs.`,
          roundType: 'hr',
          evidenceType: 'Reported by candidates',
          durationMinutes: 20,
          questionCount: 4,
          reportedTopics: ['Leadership Principles / Culture Fit', 'STAR Project Scenarios', 'Dealing with Failure', 'System Ownership'],
          passThreshold: 60
        }
      ];
    }

    // 4. Standard Service-Based (TCS, Infosys, Wipro, Accenture)
    if (isServiceBased) {
      return [
        {
          roundKey: 'aptitude',
          roundNumber: 1,
          name: `${comp} National Assessment / Aptitude Round`,
          description: 'Timed assessment evaluating numerical ability, logical deduction, and verbal comprehension.',
          roundType: 'aptitude',
          evidenceType: 'Reported by candidates',
          durationMinutes: 15,
          questionCount: 10,
          reportedTopics: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
          passThreshold: 60
        },
        {
          roundKey: 'technical',
          roundNumber: 2,
          name: `${comp} Technical Competency Interview`,
          description: `Interactive technical interview assessing ${role} fundamentals, OOP, DBMS, and real-world implementation.`,
          roundType: 'technical',
          evidenceType: 'Reported by candidates',
          durationMinutes: 25,
          questionCount: 5,
          reportedTopics: ['OOP Concepts & Programming', 'SQL & Normalization', 'Data Structures', 'Debugging & Code Flow'],
          passThreshold: 60
        },
        {
          roundKey: 'hr',
          roundNumber: 3,
          name: `${comp} HR & Managerial Interview`,
          description: 'Real-time conversational interview evaluating cultural fit, motivation, relocation, and communication.',
          roundType: 'hr',
          evidenceType: 'Reported by candidates',
          durationMinutes: 15,
          questionCount: 4,
          reportedTopics: [`Why ${comp}`, 'Final Year Projects', 'Situational & Ethical Scenarios', 'Shift & Relocation Flexibility'],
          passThreshold: 60
        }
      ];
    }

    // 5. Default General Role-Specific Standard
    return [
      {
        roundKey: 'technical',
        roundNumber: 1,
        name: `${role} Technical & Engineering Interview`,
        description: `In-depth technical interview covering core engineering principles, ${role} competencies, and best practices.`,
        roundType: 'technical',
        evidenceType: 'AI-generated based on hiring patterns',
        durationMinutes: 30,
        questionCount: 5,
        reportedTopics: this.getRoleDefaultTopics(role, 'technical'),
        passThreshold: 60
      },
      {
        roundKey: 'hr',
        roundNumber: 2,
        name: 'HR & Cultural Alignment Interview',
        description: `Conversational interview evaluating teamwork, conflict handling, and long-term fit for ${comp}.`,
        roundType: 'hr',
        evidenceType: 'AI-generated based on hiring patterns',
        durationMinutes: 15,
        questionCount: 4,
        reportedTopics: ['Behavioral Scenarios', 'Collaboration', 'Motivation', 'Career Goals'],
        passThreshold: 60
      }
    ];
  }

  // =========================================================================
  // STEP 4: APTITUDE QUESTIONS GENERATOR (Company Specific Assessment)
  // =========================================================================
  async generateAptitudeQuestions(companyName, targetRole, plan) {
    const cleanCompany = (companyName || 'TCS').trim();
    const cleanRole = (targetRole || 'Software Engineer').trim();

    const prompt = `Generate 10 realistic aptitude test questions styled after the reported assessment pattern of "${cleanCompany}" for a "${cleanRole}" candidate.

Categories to cover:
- 3 Quantitative Aptitude (arithmetic, percentages, time & distance, ratios)
- 3 Logical Reasoning (series, coding-decoding, blood relations, deduction)
- 2 Verbal Ability (sentence completion, error detection, synonyms)
- 2 Technical / Numerical Reasoning (binary math, basic logic gates, algorithmic deduction)

Format each question with 4 clear multiple choice options, a single correctAnswer (exact text of one option), and an explanation.

Output valid JSON:
{
  "questions": [
    {
      "id": "apt_1",
      "category": "Quantitative Aptitude",
      "questionText": "Clear question text...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Step by step solution..."
    }
  ]
}`;

    const systemInstruction = `You are an assessment author creating realistic company-level placement aptitude tests. Output valid JSON only.`;
    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    if (aiRes && Array.isArray(aiRes.questions) && aiRes.questions.length >= 6) {
      return aiRes.questions.slice(0, 10).map((q, idx) => ({
        id: q.id || `apt_${idx + 1}`,
        category: q.category || 'Quantitative Aptitude',
        questionText: q.questionText,
        options: Array.isArray(q.options) ? q.options : ['A', 'B', 'C', 'D'],
        correctAnswer: q.correctAnswer || q.options?.[0] || '',
        explanation: q.explanation || 'Refer to fundamental principles.'
      }));
    }

    // High quality deterministic fallback
    return [
      { id: 'apt_1', category: 'Quantitative Aptitude', questionText: `If a train traveling at 60 km/h passes a pole in 9 seconds, what is the length of the train?`, options: ['120 meters', '150 meters', '180 meters', '200 meters'], correctAnswer: '150 meters', explanation: 'Speed = 60 * (5/18) = 50/3 m/s. Distance = Speed * Time = (50/3) * 9 = 150 meters.' },
      { id: 'apt_2', category: 'Quantitative Aptitude', questionText: `An item bought for ₹500 is sold for ₹625. What is the profit percentage?`, options: ['20%', '25%', '30%', '15%'], correctAnswer: '25%', explanation: 'Profit = ₹125. Profit % = (125 / 500) * 100 = 25%.' },
      { id: 'apt_3', category: 'Quantitative Aptitude', questionText: `If 8 engineers complete a sprint deliverable in 15 days, how many days would 12 engineers take at the same pace?`, options: ['10 days', '12 days', '8 days', '14 days'], correctAnswer: '10 days', explanation: 'Total engineer-days = 8 * 15 = 120. Days for 12 engineers = 120 / 12 = 10 days.' },
      { id: 'apt_4', category: 'Logical Reasoning', questionText: `Complete the number series: 4, 9, 25, 49, 121, ___ ?`, options: ['144', '169', '196', '225'], correctAnswer: '169', explanation: 'The series consists of squares of prime numbers: 2², 3², 5², 7², 11², 13² = 169.' },
      { id: 'apt_5', category: 'Logical Reasoning', questionText: `In a certain code, REASON is coded as 5 and BELIEVED is coded as 7. What is the code for GOVERNMENT?`, options: ['6', '8', '9', '10'], correctAnswer: '9', explanation: 'Number of letters in the word minus 1. GOVERNMENT has 10 letters, so 10 - 1 = 9.' },
      { id: 'apt_6', category: 'Logical Reasoning', questionText: `Pointing to a developer, Anita said: "His father is the only son of my grandfather." How is the developer related to Anita?`, options: ['Brother', 'Cousin', 'Uncle', 'Father'], correctAnswer: 'Brother', explanation: 'Only son of grandfather = father. The developer\'s father is Anita\'s father, so he is her brother.' },
      { id: 'apt_7', category: 'Verbal Ability', questionText: `Choose the antonym for "SUPERFLUOUS":`, options: ['Abundant', 'Essential', 'Excessive', 'Secondary'], correctAnswer: 'Essential', explanation: 'Superfluous means unnecessary or more than enough; its antonym is essential.' },
      { id: 'apt_8', category: 'Verbal Ability', questionText: `Identify the sentence with correct grammatical structure:`, options: ['Neither the manager nor the engineers was available.', 'Neither the manager nor the engineers were available.', 'Neither the manager nor the engineers is available.', 'Neither of them were present.'], correctAnswer: 'Neither the manager nor the engineers were available.', explanation: 'With neither/nor, the verb agrees with the closer subject ("engineers" is plural).' },
      { id: 'apt_9', category: 'Technical Reasoning', questionText: `What is the binary representation of decimal number 43?`, options: ['101011', '101101', '100111', '110011'], correctAnswer: '101011', explanation: '43 = 32 + 8 + 2 + 1 = 101011 in binary.' },
      { id: 'apt_10', category: 'Technical Reasoning', questionText: `Which data structure is ideal for implementing Breadth-First Search (BFS)?`, options: ['Stack', 'Queue', 'Priority Queue', 'Array'], correctAnswer: 'Queue', explanation: 'BFS explores neighbor nodes level by level using a FIFO Queue.' }
    ];
  }

  // =========================================================================
  // STEP 5: TECHNICAL QUESTIONS GENERATOR (Company + Role Specific)
  // =========================================================================
  async generateTechnicalQuestions(companyName, targetRole, resumeSkills = [], skillGaps = [], plan = null) {
    const cleanCompany = (companyName || 'Google').trim();
    const cleanRole = (targetRole || 'Software Engineer').trim();
    const reportedTopics = plan?.frequentlyAskedTopics || ['Data Structures', 'OOP', 'Databases', 'System Design'];

    const prompt = `Generate 5 company-specific technical interview questions for a candidate interviewing at "${cleanCompany}" for "${cleanRole}".

Reported Company Technical Focus Areas:
${JSON.stringify(reportedTopics)}

Candidate Detected Skills:
${JSON.stringify(resumeSkills.slice(0, 8))}

Candidate Skill Gaps to probe:
${JSON.stringify(skillGaps.slice(0, 3))}

Structure the 5 questions as follows:
1. Core language / framework fundamentals frequently tested at ${cleanCompany} for ${cleanRole}
2. Data structures, algorithmic thinking, or optimization
3. Databases, backend APIs, or system architecture
4. Real-world scenario / debugging or handling production edge cases
5. Specific technical challenge addressing their skill gap (${skillGaps[0] || 'System Design'})

Return valid JSON:
{
  "questions": [
    {
      "id": "tech_1",
      "topic": "<e.g. JavaScript Event Loop / Java OOP>",
      "questionText": "<company-specific question>",
      "expectedKeyPoints": ["point 1", "point 2"],
      "difficulty": "Medium"
    }
  ]
}`;

    const systemInstruction = `You are a Senior Technical Interviewer at ${cleanCompany}. Ask realistic, rigorous technical interview questions. Return valid JSON only.`;
    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    if (aiRes && Array.isArray(aiRes.questions) && aiRes.questions.length >= 3) {
      return aiRes.questions.slice(0, 5).map((q, idx) => ({
        id: q.id || `tech_${idx + 1}`,
        topic: q.topic || 'Technical Fundamentals',
        questionText: q.questionText,
        expectedKeyPoints: Array.isArray(q.expectedKeyPoints) ? q.expectedKeyPoints : [],
        difficulty: q.difficulty || 'Medium'
      }));
    }

    // Default company-specific fallback
    return [
      {
        id: 'tech_1',
        topic: `${cleanRole} Fundamentals`,
        questionText: `In the context of ${cleanRole} at ${cleanCompany}, explain the difference between synchronous and asynchronous execution, and how the runtime environment handles non-blocking operations.`,
        expectedKeyPoints: ['Event loop / Thread pool', 'Call stack execution', 'Async/await or Promises', 'Non-blocking I/O'],
        difficulty: 'Medium'
      },
      {
        id: 'tech_2',
        topic: 'Data Structures & Algorithms',
        questionText: `How would you optimize search and lookup operations for a large collection of records (1M+ items)? Compare the time and space trade-offs between a Hash Map and a Balanced Binary Search Tree.`,
        expectedKeyPoints: ['O(1) average vs O(log N) worst case', 'Memory overhead of hashing', 'Collision resolution', 'Ordered traversal benefits of BST'],
        difficulty: 'Medium'
      },
      {
        id: 'tech_3',
        topic: 'Database & API Design',
        questionText: `Explain database indexing. What happens internally when you create a composite B-Tree index on (user_id, created_at), and when would a query fail to leverage that index?`,
        expectedKeyPoints: ['B-Tree structure', 'Leftmost prefix rule', 'Range queries vs Equality', 'Write performance trade-off'],
        difficulty: 'Medium'
      },
      {
        id: 'tech_4',
        topic: 'System Reliability & Concurrency',
        questionText: `Suppose your API endpoint receives 5,000 requests per second during peak hours at ${cleanCompany}. How would you prevent database connection exhaustion and implement caching or rate limiting?`,
        expectedKeyPoints: ['Connection pooling', 'Redis distributed cache', 'Rate limiting (Token bucket / Leaky bucket)', 'Graceful degradation / circuit breaker'],
        difficulty: 'Hard'
      },
      {
        id: 'tech_5',
        topic: 'Practical Debugging & Architecture',
        questionText: `Walk me through how you debug a memory leak or sudden latency spike in a production service. What tools and telemetry metrics would you inspect first?`,
        expectedKeyPoints: ['APM telemetry (CPU, Heap, Event Loop lag)', 'Profiling / Heap snapshots', 'Garbage collection metrics', 'Database query execution times'],
        difficulty: 'Medium'
      }
    ];
  }

  // =========================================================================
  // STEP 6: GEMINI LIVE TOKEN & REAL-TIME HR INTERVIEWER
  // =========================================================================
  generateLiveToken(userId, companyName, targetRole) {
    // Generate a secure short-lived token (2 hours) containing session scope
    return jwt.sign(
      {
        uid: userId,
        company: companyName || 'Company',
        role: targetRole || 'Software Engineer',
        scope: 'gemini_live_session',
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60)
      },
      env.JWT_SECRET
    );
  }

  // Speech-to-Text via Deepgram Nova-2
  async transcribeAudio(audioBuffer) {
    if (!audioBuffer || !this.deepgramApiKey) return '';
    try {
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en',
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${this.deepgramApiKey}`,
            'Content-Type': 'audio/wav'
          },
          timeout: 15000
        }
      );
      const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      return transcript || '';
    } catch (err) {
      console.warn('[CompanyInterview] Deepgram STT notice:', err.response?.data || err.message);
      return '';
    }
  }

  // Text-to-Speech via Deepgram Aura
  async synthesizeSpeech(text) {
    if (!text || !this.ttsApiKey) return null;
    try {
      const cleanText = text.replace(/[*#_`]/g, '').slice(0, 500);
      const response = await axios.post(
        'https://api.deepgram.com/v1/speak?model=aura-asteria-en',
        { text: cleanText },
        {
          headers: {
            'Authorization': `Token ${this.ttsApiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );
      if (response.data) {
        const base64Audio = Buffer.from(response.data).toString('base64');
        return `data:audio/mp3;base64,${base64Audio}`;
      }
    } catch (err) {
      console.warn('[CompanyInterview] TTS notice:', err.message);
    }
    return null;
  }

  // Interactive HR Live Dialogue
  async handleHRLiveExchange({ companyName, targetRole, userMessage, history = [], audioBuffer = null, candidateProfile = null }) {
    const cleanCompany = (companyName || 'Google').trim();
    const cleanRole = (targetRole || 'Software Engineer').trim();

    // 1. If audioBuffer is sent, transcribe speech
    let spokenText = userMessage || '';
    if (audioBuffer && audioBuffer.length > 0) {
      const transcribed = await this.transcribeAudio(audioBuffer);
      if (transcribed && transcribed.trim()) {
        spokenText = transcribed.trim();
      }
    }

    const candidateName = candidateProfile?.name || 'Candidate';
    const candidateDegree = candidateProfile?.degree || 'B.Tech';

    const systemPrompt = `You are a professional Human Resources (HR) & Talent Acquisition Manager interviewing ${candidateName} for the position of "${cleanRole}" at "${cleanCompany}".

INTERVIEW BEHAVIOR & RULES:
1. Conduct a natural, realistic corporate HR interview for ${cleanCompany}.
2. Ask ONE question at a time.
3. Listen carefully to the candidate's answer and acknowledge it with brief professional feedback before asking a natural follow-up or the next question.
4. Adapt your questions based on what the candidate just said.
5. Cover typical ${cleanCompany} HR interview areas:
   - Self introduction & background
   - Specific motivation for joining ${cleanCompany}
   - Understanding of the ${cleanRole} role and responsibilities
   - Handling conflict, tight deadlines, or challenging team projects (STAR framework)
   - Willingness to relocate, work in team rotations, and long-term career aspirations
   - Strengths and constructive self-awareness / weaknesses
6. Tone: Professional, articulate, attentive, and objective (neither overly casual nor rigid robot).
7. Keep each spoken response concise (2 to 3 sentences maximum) so the voice conversation flows naturally.
8. Do NOT enumerate questions (never say "Question 2"). Speak conversationally.`;

    const formattedHistory = (history || []).map(h => ({
      role: h.role === 'ai' ? 'assistant' : 'user',
      content: h.content
    }));

    const conversationPrompt = `Candidate profile: ${candidateName}, Degree: ${candidateDegree}, Target Role: ${cleanRole}, Company: ${cleanCompany}.
Interview dialogue so far:
${formattedHistory.map(h => `${h.role === 'assistant' ? 'HR Interviewer' : 'Candidate'}: ${h.content}`).join('\n')}

Latest Candidate Spoken Answer:
"${spokenText || 'Hello, I am ready to begin the interview.'}"

Respond as the HR Interviewer for ${cleanCompany}. Return JSON:
{
  "interviewerReply": "<your spoken response acknowledging their point and asking the next question>",
  "questionNumber": <current question index e.g. 1 to 5>,
  "isInterviewComplete": <true if 5 or more comprehensive questions have been answered, else false>
}`;

    const aiRes = await this.callGeminiJSON(conversationPrompt, systemPrompt);

    const reply = aiRes?.interviewerReply || `Thank you for sharing that. Why are you specifically interested in starting your career with ${cleanCompany} in this ${cleanRole} role?`;
    const isComplete = Boolean(aiRes?.isInterviewComplete);

    // Synthesize audio response for real-time speech playback
    const audioUrl = await this.synthesizeSpeech(reply);

    return {
      userText: spokenText,
      replyText: reply,
      audioUrl,
      isComplete,
      timestamp: new Date()
    };
  }

  // =========================================================================
  // STEP 7: FINAL COMPREHENSIVE INTERVIEW REPORT
  // =========================================================================
  async generateFinalReport({
    companyName,
    targetRole,
    aptitudeScore = 0,
    technicalScore = 0,
    hrDialogue = [],
    technicalQuestions = [],
    plan = null
  }) {
    const cleanCompany = (companyName || 'Google').trim();
    const cleanRole = (targetRole || 'Software Engineer').trim();

    const prompt = `You are an executive hiring board conducting a final interview debrief for a candidate applying to "${cleanCompany}" for "${cleanRole}".

Round Results:
- Aptitude Assessment Score: ${aptitudeScore}/100
- Technical Interview Score: ${technicalScore}/100
- Technical Questions & Candidate Evaluations:
${JSON.stringify(technicalQuestions.slice(0, 5))}
- HR Round Dialogue Exchange:
${JSON.stringify(hrDialogue.slice(0, 8))}

EVALUATION REQUIREMENTS:
1. Objectively evaluate the candidate across 5 standard dimensions (scores between 0 and 100):
   - communicationScore: Clarity, professional articulation, conciseness
   - confidenceScore: Assertiveness, steady delivery, structured responses
   - answerQualityScore: Depth, relevance, technical/situational evidence
   - roleUnderstandingScore: Grasp of ${cleanRole} responsibilities at ${cleanCompany}
   - hrReadinessScore: Motivation for ${cleanCompany}, behavioral maturity, cultural alignment
2. Calculate calibrated overallScore: (${aptitudeScore} * 0.20 + ${technicalScore} * 0.45 + hrReadinessScore * 0.35)
3. What You Did Well: 3 to 5 specific constructive observations based directly on their actual answers.
4. What You Should Improve: Specific, actionable guidance (e.g. "Instead of rambling on background, start directly with the core solution and use the STAR method").
5. Better Answer Approach: For 1 or 2 weaker answers from the session, breakdown:
   - question: the question asked
   - candidateSpoken: what they answered
   - whatWasMissing: specific gap
   - howToStructure: step-by-step structure
   - strongerExample: realistic example of a top-tier answer
6. Company-Specific Final Result:
   - readinessRating: "Ready" | "Needs Improvement" | "Strong Preparation Needed"
   - companyRecommendations: 3 specific preparation tips tailored directly to ${cleanCompany}'s interview style.

Return valid JSON:
{
  "overallScore": 78,
  "communicationScore": 80,
  "confidenceScore": 75,
  "answerQualityScore": 78,
  "roleUnderstandingScore": 82,
  "hrReadinessScore": 76,
  "readinessRating": "Ready",
  "whatYouDidWell": [
    "Clearly articulated project architecture and technology trade-offs.",
    "Demonstrated authentic motivation for joining ${cleanCompany}."
  ],
  "whatYouShouldImprove": [
    "Avoid taking too long to reach the punchline in behavioral questions; lead with the result.",
    "Deepen system scalability and caching explanations during technical questions."
  ],
  "betterAnswerApproach": [
    {
      "question": "Tell me about a difficult situation you handled in a team.",
      "candidateSpoken": "We had a bug right before submission and everyone was stressed, but we fixed it.",
      "whatWasMissing": "Lacked specific conflict resolution and quantifiable impact.",
      "howToStructure": "Situation -> Task -> Action -> Result (STAR method)",
      "strongerExample": "In our final year capstone, a database concurrency bug caused data corruption 48 hours before the deadline. I organized a 30-minute triage session, isolated the unindexed write conflict, and implemented optimistic locking, allowing us to deploy on time with zero data loss."
    }
  ],
  "companyRecommendations": [
    "Practice speed coding on medium DSA problems common in ${cleanCompany} recruitment drives.",
    "Review core computer science fundamentals (OOP, DBMS indexing, and networking).",
    "Prepare tailored responses for why ${cleanCompany} aligns with your career trajectory."
  ]
}`;

    const systemInstruction = `You are an executive hiring panel evaluating an actual interview session. Return valid JSON only with constructive, actionable feedback.`;

    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    const roundsCompleted = [];
    if (aptitudeScore > 0) roundsCompleted.push('Aptitude Assessment');
    if (technicalScore > 0) roundsCompleted.push('Technical Interview');
    roundsCompleted.push('HR & Behavioral Interview (Gemini Live)');

    const finalReport = {
      overallScore: Math.min(100, Math.max(0, Number(aiRes?.overallScore) || Math.round((aptitudeScore * 0.2) + (technicalScore * 0.45) + 28))),
      communicationScore: Math.min(100, Math.max(0, Number(aiRes?.communicationScore) || 78)),
      confidenceScore: Math.min(100, Math.max(0, Number(aiRes?.confidenceScore) || 75)),
      answerQualityScore: Math.min(100, Math.max(0, Number(aiRes?.answerQualityScore) || 76)),
      roleUnderstandingScore: Math.min(100, Math.max(0, Number(aiRes?.roleUnderstandingScore) || 80)),
      hrReadinessScore: Math.min(100, Math.max(0, Number(aiRes?.hrReadinessScore) || 75)),
      readinessRating: aiRes?.readinessRating || ((aptitudeScore >= 60 && technicalScore >= 60) ? 'Ready' : 'Needs Improvement'),
      whatYouDidWell: Array.isArray(aiRes?.whatYouDidWell) && aiRes.whatYouDidWell.length > 0
        ? aiRes.whatYouDidWell
        : [
            `Demonstrated structured problem-solving across technical questions.`,
            `Clear articulation of project experience and core responsibilities.`,
            `Showed positive attitude and enthusiasm for ${cleanCompany}.`
          ],
      whatYouShouldImprove: Array.isArray(aiRes?.whatYouShouldImprove) && aiRes.whatYouShouldImprove.length > 0
        ? aiRes.whatYouShouldImprove
        : [
            `Structure behavioral responses using the STAR method (Situation, Task, Action, Result).`,
            `Be more specific with technical trade-offs and edge cases rather than high-level statements.`,
            `Elaborate on measurable impact in academic and personal projects.`
          ],
      betterAnswerApproach: Array.isArray(aiRes?.betterAnswerApproach) && aiRes.betterAnswerApproach.length > 0
        ? aiRes.betterAnswerApproach
        : [
            {
              question: `Why do you want to join ${cleanCompany}?`,
              candidateSpoken: `It is a very good company with great opportunities.`,
              whatWasMissing: `Generic response that could apply to any technology organization.`,
              howToStructure: `Acknowledge company innovation -> Connect with personal technical skills -> Explain specific value you will add`,
              strongerExample: `I've been following ${cleanCompany}'s work on scalable distributed infrastructure. My hands-on projects in modular web services and database optimization align with your engineering culture, and I want to contribute to enterprise-scale systems while learning from industry veterans.`
            }
          ],
      companyRecommendations: Array.isArray(aiRes?.companyRecommendations) && aiRes.companyRecommendations.length > 0
        ? aiRes.companyRecommendations
        : [
            `Review ${cleanCompany}'s recent engineering initiatives and tech stack.`,
            `Practice timed aptitude and problem-solving mock assessments weekly.`,
            `Rehearse articulating core project architectural decisions aloud.`
          ],
      researchedProcess: (plan?.rounds || []).map(r => r.name || r.roundKey),
      roundsCompleted,
      sources: (plan?.sources || []).slice(0, 5)
    };

    return finalReport;
  }

  // =========================================================================
  // STEP 8: LIVE ADAPTIVE QUESTION GENERATOR (Role + Company + History Aware)
  // =========================================================================
  async generateAdaptiveQuestion({
    companyName = 'TCS',
    targetRole = 'Software Developer',
    roundKey = 'technical',
    questionIndex = 0,
    previousQuestions = [],
    previousMistakes = [],
    candidateLastAnswer = ''
  }) {
    const cleanCompany = companyName.trim();
    const cleanRole = targetRole.trim();
    const topics = this.getRoleDefaultTopics(cleanRole, roundKey);

    const prompt = `You are a Senior Technical Interviewer conducting a real-time interview at "${cleanCompany}" for a "${cleanRole}" candidate.
Current Round: "${roundKey}".
Current Question Number: ${questionIndex + 1}.

Role Focus Topics:
${JSON.stringify(topics)}

Previous questions asked in this session:
${JSON.stringify(previousQuestions.map(q => q.questionText || q.question))}

Candidate's latest spoken answer (if any):
"${candidateLastAnswer ? candidateLastAnswer.slice(0, 400) : ''}"

Candidate's historical weak areas / mistakes from previous interviews (re-test or probe these intelligently if applicable, without lowering difficulty):
${JSON.stringify(previousMistakes.slice(0, 4))}

INSTRUCTIONS:
1. If the candidate just answered a question, create an ADAPTIVE FOLLOW-UP question that digs deeper into their explanation or probes a related practical trade-off.
2. If this is question 1 or starting a new topic, ask a core foundational question specifically expected at ${cleanCompany} for ${cleanRole}.
3. If previous mistakes include topics like "SQL JOINs" or "Normalization" or "React hooks", prioritize probing those areas to see if they have improved.
4. Keep the question crisp, realistic, and conversational (1-2 sentences). Do NOT number the question.
5. Provide expected key points, difficulty, and the primary topic.

Return valid JSON:
{
  "questionText": "<Spoken question>",
  "topic": "<Primary Topic e.g. SQL JOINs / React State>",
  "expectedKeyPoints": ["point 1", "point 2"],
  "difficulty": "Medium",
  "practiceTopic": "<Topic name>"
}`;

    const systemInstruction = `You are an adaptive AI interviewer at ${cleanCompany}. Generate natural, rigorous, role-specific questions. Return valid JSON only.`;
    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    let questionText = aiRes?.questionText;
    let topic = aiRes?.topic || topics[questionIndex % topics.length] || 'Technical Fundamentals';
    let expectedKeyPoints = Array.isArray(aiRes?.expectedKeyPoints) ? aiRes.expectedKeyPoints : [];
    let difficulty = aiRes?.difficulty || 'Medium';
    let practiceTopic = aiRes?.practiceTopic || topic;

    if (!questionText) {
      // Deterministic role-specific fallback question
      const rLower = cleanRole.toLowerCase();
      if (rLower.includes('data analyst')) {
        const fallbacks = [
          `In SQL, what is the difference between WHERE and HAVING clauses, and can you share an example of filtering aggregated sales data?`,
          `When analyzing customer purchase data in Python or Excel, how do you handle missing or anomalous values before computing business metrics?`,
          `Can you explain what an INNER JOIN vs a LEFT JOIN produces when joining a Customers table with an Orders table?`,
          `How would you explain the difference between Correlation and Causation to a non-technical business stakeholder at ${cleanCompany}?`,
          `Walk me through a project where you used SQL or visualization tools to uncover an actionable business insight.`
        ];
        questionText = fallbacks[questionIndex % fallbacks.length];
        topic = 'Data Analytics & SQL';
      } else if (rLower.includes('mern') || rLower.includes('full stack')) {
        const fallbacks = [
          `In React, what is the difference between useEffect and useMemo, and how do you prevent unnecessary component re-renders?`,
          `How does the Node.js event loop handle asynchronous I/O operations without blocking incoming HTTP requests in Express?`,
          `When designing schemas in MongoDB, when would you embed documents versus referencing them across separate collections?`,
          `How do you securely handle user authentication and token expiration using JWT in a MERN stack application?`,
          `Tell me about a challenging bug or performance bottleneck you resolved in your recent web project.`
        ];
        questionText = fallbacks[questionIndex % fallbacks.length];
        topic = 'MERN Stack Engineering';
      } else {
        const fallbacks = [
          `Explain the concept of Database Normalization and why 3NF is commonly used in relational database schema design.`,
          `What are the key differences between a Process and a Thread, and how does inter-process communication work?`,
          `Explain how a Hash Map handles hash collisions, and compare chaining versus open addressing in terms of time complexity.`,
          `In Object-Oriented Programming, explain Polymorphism and provide an example of method overriding versus method overloading.`,
          `Walk me through how you approach optimizing a slow database query in production.`
        ];
        questionText = fallbacks[questionIndex % fallbacks.length];
        topic = 'Software Engineering Fundamentals';
      }
    }

    // Synthesize spoken audio for AI interviewer
    const audioUrl = await this.synthesizeSpeech(questionText);

    return {
      questionId: `q_${Date.now()}_${questionIndex + 1}`,
      questionText,
      topic,
      expectedKeyPoints,
      difficulty,
      practiceTopic,
      audioUrl
    };
  }

  // =========================================================================
  // STEP 9: LIVE COACH EVALUATION & CONVERSATIONAL FEEDBACK GENERATOR
  // =========================================================================
  async evaluateAnswerWithCoaching({
    companyName = 'TCS',
    targetRole = 'Software Developer',
    roundKey = 'technical',
    question = '',
    answer = '',
    previousMistakes = []
  }) {
    const cleanCompany = companyName.trim();
    const cleanRole = targetRole.trim();
    const cleanAnswer = (answer || '').trim();

    if (!cleanAnswer) {
      return {
        score: 0,
        isCorrect: false,
        isPartiallyCorrect: false,
        mistakes: ['No response provided'],
        correctedExplanation: 'Please articulate your technical solution or reasoning clearly.',
        spokenFeedback: "I didn't catch your response. Take your time and share your thoughts.",
        followUpQuestion: question,
        technicalAccuracy: 0,
        completeness: 0,
        communication: 0,
        feedback: 'No response was detected.',
        practiceTopic: 'Interview Communication'
      };
    }

    const prompt = `You are an expert AI Interviewer and Interview Coach at "${cleanCompany}" assessing a candidate for "${cleanRole}".
Current Round: "${roundKey}".
Question: "${question}"
Candidate's Spoken Answer: "${cleanAnswer}"

EVALUATION & COACHING RULES:
1. Objectively evaluate:
   - Correctness & Technical Accuracy (0-100)
   - Completeness & Depth (0-100)
   - Communication, Clarity & Structure (0-100)
   - Overall Score (0-100)
2. Determine:
   - isCorrect: boolean (true if largely correct, false if materially wrong or incomplete)
   - isPartiallyCorrect: boolean (true if partially on right track but missing key elements)
3. Identify MATERIAL MISTAKES (Priority: factually wrong > technically wrong > missing core concept > poor reasoning > very unclear communication). Do NOT nitpick minor grammar.
   - mistakes: array of concise descriptions (e.g. ["Misunderstood the purpose of normalization", "Stated that normalization increases duplicate data"])
4. Correct Explanation:
   - correctedExplanation: 1-2 sentence accurate summary of the correct concept.
5. SPOKEN COACH FEEDBACK (CRITICAL):
   - Provide a natural, spoken feedback response (1 to 2 sentences) that acts as an encouraging but rigorous coach.
   - If candidate was wrong or partially correct, politely explain the real concept without just saying "Wrong".
   - Example wrong: "You're close, but the concept is actually the opposite. Normalization is used to reduce data redundancy and improve data integrity by organizing tables into related structures."
   - Example partially correct: "That's a reasonable starting point, but be careful with saying MongoDB is simply faster than SQL. The better explanation is that MongoDB's document model fits unstructured or evolving schemas."
   - Example good: "Solid explanation. You correctly covered the core mechanism and its trade-offs."
6. ADAPTIVE FOLLOW-UP QUESTION:
   - Generate a natural follow-up question based directly on what they said to test their depth or explore practical trade-offs.
7. Recommended Practice Topic:
   - practiceTopic: string (e.g. "SQL Normalization", "React Hooks", "Event Loop")

Return valid JSON:
{
  "score": 75,
  "isCorrect": true,
  "isPartiallyCorrect": false,
  "technicalAccuracy": 78,
  "completeness": 70,
  "communication": 80,
  "mistakes": ["Point 1 if any"],
  "correctedExplanation": "<Accurate explanation of the concept>",
  "spokenFeedback": "<Natural conversational spoken coach feedback>",
  "followUpQuestion": "<Relevant follow-up question to ask next>",
  "strengths": ["Clear definition", "Good real-world example"],
  "improvements": ["Elaborate on performance trade-offs"],
  "practiceTopic": "<Topic for future revision>"
}`;

    const systemInstruction = `You are a real-time AI Interview Coach. Return valid JSON only with constructive, actionable corrective coaching.`;
    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    const score = Math.min(100, Math.max(0, Number(aiRes?.score) || (cleanAnswer.length > 50 ? 70 : 40)));
    const isCorrect = aiRes?.isCorrect !== undefined ? Boolean(aiRes.isCorrect) : score >= 65;
    const isPartiallyCorrect = aiRes?.isPartiallyCorrect !== undefined ? Boolean(aiRes.isPartiallyCorrect) : (score >= 40 && score < 65);
    const mistakes = Array.isArray(aiRes?.mistakes) ? aiRes.mistakes : (!isCorrect ? ['Incomplete or partially inaccurate technical reasoning'] : []);
    const correctedExplanation = aiRes?.correctedExplanation || 'Review standard system architecture and core computer science definitions.';
    const spokenFeedback = aiRes?.spokenFeedback || (isCorrect ? 'Good explanation. Let us explore this a bit further.' : 'That is an interesting thought, but let us refine that concept. Consider the foundational trade-offs.');
    const followUpQuestion = aiRes?.followUpQuestion || `Can you expand on how you would implement this in a production project at ${cleanCompany}?`;
    const practiceTopic = aiRes?.practiceTopic || 'Technical Fundamentals';

    // Synthesize audio of feedback + follow-up for natural voice flow
    const audioUrl = await this.synthesizeSpeech(`${spokenFeedback} ${followUpQuestion}`);

    return {
      score,
      isCorrect,
      isPartiallyCorrect,
      technicalAccuracy: Number(aiRes?.technicalAccuracy) || score,
      completeness: Number(aiRes?.completeness) || score,
      communication: Number(aiRes?.communication) || score,
      mistakes,
      correctedExplanation,
      spokenFeedback,
      followUpQuestion,
      feedback: spokenFeedback,
      strengths: Array.isArray(aiRes?.strengths) ? aiRes.strengths : ['Articulated answer promptly'],
      improvements: Array.isArray(aiRes?.improvements) ? aiRes.improvements : ['Deepen technical precision with concrete examples'],
      practiceTopic,
      audioUrl
    };
  }

  // =========================================================================
  // STEP 10: PRACTICE WEAK AREAS GENERATOR (AI Coach Mode)
  // =========================================================================
  async generatePracticeQuestions({
    weakTopics = [],
    mistakes = [],
    targetRole = 'Software Developer',
    companyName = 'TCS'
  }) {
    const cleanCompany = companyName.trim();
    const cleanRole = targetRole.trim();

    const prompt = `Generate 4 focused practice interview questions targeting the candidate's recorded weak areas and previous mistakes.
Company: "${cleanCompany}"
Target Role: "${cleanRole}"

Recorded Weak Topics:
${JSON.stringify(weakTopics)}

Previous Specific Mistakes / Confusion:
${JSON.stringify(mistakes.slice(0, 6))}

INSTRUCTIONS:
1. Create 4 questions directly challenging the concepts they struggled with (e.g. if they confused Normalization, ask a question to test 1NF, 2NF, 3NF; if they struggled with SQL JOINs, ask a multi-table query question).
2. For each question, provide:
   - id: unique id
   - topic: the specific topic being practiced
   - questionText: clear question
   - hint: helpful coach hint
   - idealAnswer: concise ideal response demonstrating mastery
   - keyConceptsToInclude: list of terms/principles they must include

Return valid JSON:
{
  "questions": [
    {
      "id": "prac_1",
      "topic": "Topic Name",
      "questionText": "Question text...",
      "hint": "Think about...",
      "idealAnswer": "Ideal answer...",
      "keyConceptsToInclude": ["concept 1", "concept 2"]
    }
  ]
}`;

    const systemInstruction = `You are an AI Interview Coach building tailored remediation practice. Return valid JSON only.`;
    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    if (aiRes && Array.isArray(aiRes.questions) && aiRes.questions.length >= 2) {
      return aiRes.questions.slice(0, 4);
    }

    // High quality deterministic fallback based on role
    const rLower = cleanRole.toLowerCase();
    if (rLower.includes('data analyst')) {
      return [
        {
          id: 'prac_1',
          topic: 'SQL JOINs & Aggregation',
          questionText: `Write or explain a SQL query that retrieves each customer's name along with their total order amount, including customers who haven't placed any orders yet.`,
          hint: 'Use a LEFT JOIN between Customers and Orders, then GROUP BY customer_id with COALESCE(SUM(amount), 0).',
          idealAnswer: 'SELECT c.customer_name, COALESCE(SUM(o.amount), 0) AS total_spent FROM Customers c LEFT JOIN Orders o ON c.id = o.customer_id GROUP BY c.id, c.customer_name;',
          keyConceptsToInclude: ['LEFT JOIN', 'GROUP BY', 'COALESCE / NULL handling']
        },
        {
          id: 'prac_2',
          topic: 'Database Normalization',
          questionText: `Explain 1NF, 2NF, and 3NF using a practical example of an E-commerce order database. Why would you ever choose to denormalize?`,
          hint: '1NF: Atomic values; 2NF: No partial dependency; 3NF: No transitive dependency. Denormalization is chosen for read-heavy query performance.',
          idealAnswer: '1NF ensures atomic columns and unique rows. 2NF removes partial key dependencies in composite keys. 3NF removes transitive dependencies where non-key attributes depend on other non-key attributes.',
          keyConceptsToInclude: ['Atomicity', 'Partial dependency', 'Transitive dependency', 'Read optimization']
        },
        {
          id: 'prac_3',
          topic: 'Statistics & Data Interpretation',
          questionText: `What is the difference between Mean, Median, and Mode, and when is Median preferable over Mean when analyzing salary distributions?`,
          hint: 'Median is robust against extreme outliers / skewed distributions.',
          idealAnswer: 'The median represents the 50th percentile. When data contains extreme positive or negative outliers—such as billionaire salaries—the mean becomes heavily distorted, whereas the median remains stable.',
          keyConceptsToInclude: ['Outliers', 'Skewness', '50th percentile']
        }
      ];
    }

    return [
      {
        id: 'prac_1',
        topic: 'Database Normalization & Indexing',
        questionText: `Explain why database normalization reduces redundancy and improves data integrity, and what trade-off occurs with query join performance.`,
        hint: 'Normalization separates concerns into related tables, which requires multi-table JOINs during complex reads.',
        idealAnswer: 'Normalization organizes tables to eliminate duplicate data and insertion/update anomalies. The primary trade-off is that read queries often require multi-table JOINs, which can be optimized via foreign key indexes.',
        keyConceptsToInclude: ['Data integrity', 'Anomalies', 'JOIN overhead', 'Foreign key indexing']
      },
      {
        id: 'prac_2',
        topic: 'Asynchronous Architecture & Concurrency',
        questionText: `How does asynchronous non-blocking I/O prevent thread pool starvation in high-throughput web servers?`,
        hint: 'Explain the event loop model versus traditional thread-per-request blocking.',
        idealAnswer: 'In non-blocking I/O, network and disk requests are handed off to the OS kernel or thread pool, freeing the main execution loop to handle thousands of concurrent client connections without blocking on I/O wait.',
        keyConceptsToInclude: ['Event Loop', 'Non-blocking I/O', 'Thread starvation', 'Kernel async notifications']
      },
      {
        id: 'prac_3',
        topic: 'Data Structures & Algorithmic Complexity',
        questionText: `Compare the time and space complexity of searching, inserting, and deleting items in a Hash Map versus a Balanced Binary Search Tree (AVL/Red-Black).`,
        hint: 'Hash Map: average O(1) vs worst O(N). Balanced BST: guaranteed O(log N).',
        idealAnswer: 'Hash Maps offer average O(1) time complexity for lookup and insert, but can degrade to O(N) on excessive hash collisions. Balanced BSTs guarantee O(log N) worst-case time and maintain elements in sorted order.',
        keyConceptsToInclude: ['O(1) average', 'O(log N) worst-case', 'Ordered traversal', 'Hash collision']
      }
    ];
  }
}

module.exports = new CompanyInterviewService();
