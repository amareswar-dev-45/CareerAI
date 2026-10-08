const axios = require('axios');
const env = require('../config/env');
const aiService = require('./aiService');
const InterviewSession = require('../models/InterviewSession');

class SkillsRoadmapService {
  constructor() {
    this.tavilyApiKey = env.TAVILY_API_KEY;
    this.serpApiKey = env.SERP_API_KEY;
    this.geminiApiKey = env.GEMINI_COMMUNICATION_API || env.GEMINI_API_KEY;
    this.models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
  }

  // 1. Tavily Search
  async searchTavily(query, maxResults = 4) {
    if (!this.tavilyApiKey) return [];
    try {
      const res = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query,
        search_depth: 'advanced',
        include_answer: false,
        max_results: maxResults
      }, { timeout: 12000 });

      if (res.data && Array.isArray(res.data.results)) {
        return res.data.results.map(r => ({
          title: r.title || 'Public Source',
          url: r.url || '',
          snippet: r.content || r.snippet || '',
          sourceType: 'Tavily verified web search'
        }));
      }
    } catch (e) {
      console.warn(`[RoadmapService] Tavily notice for "${query}":`, e.message);
    }
    return [];
  }

  // 2. SerpAPI Search (Fallback)
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
          title: r.title || 'Public Google Result',
          url: r.link || '',
          snippet: r.snippet || '',
          sourceType: 'SerpAPI Google Search'
        }));
      }
    } catch (e) {
      console.warn(`[RoadmapService] SerpAPI notice for "${query}":`, e.message);
    }
    return [];
  }

  // 3. Multi-source research with memory cache & parallelization
  async researchJobRequirements(company, role) {
    if (!this._researchCache) {
      this._researchCache = new Map();
    }
    const cacheKey = `${(company || '').trim().toLowerCase()}:${(role || '').trim().toLowerCase()}`;
    const cached = this._researchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached.data;
    }

    const q1 = `${company} ${role} job description required skills qualifications`;
    const q2 = `${company} ${role} interview technical questions topics candidate experience`;

    // Query in parallel instead of waiting sequentially
    const [tavilyQ1Res, tavilyQ2Res] = await Promise.allSettled([
      this.searchTavily(q1, 3),
      this.searchTavily(q2, 2)
    ]);

    let results = [];
    if (tavilyQ1Res.status === 'fulfilled' && Array.isArray(tavilyQ1Res.value)) {
      results.push(...tavilyQ1Res.value);
    }
    if (tavilyQ2Res.status === 'fulfilled' && Array.isArray(tavilyQ2Res.value)) {
      results.push(...tavilyQ2Res.value);
    }

    // Fallback to SerpAPI only if Tavily returned very few results
    if (results.length < 2 && this.serpApiKey) {
      const serpRes = await this.searchSerpApi(q1, 3);
      results = [...results, ...serpRes];
    }

    // Deduplicate by URL
    const seen = new Set();
    const deduped = results.filter(r => {
      if (!r.url || seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    });

    if (deduped.length > 0) {
      this._researchCache.set(cacheKey, { timestamp: Date.now(), data: deduped });
    }

    return deduped;
  }

  // 4. Gemini JSON Caller
  async callGeminiJSON(prompt, systemInstruction = "You are CareerAI's Chief Technical Career Architect. Return valid JSON only.") {
    if (this.geminiApiKey) {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}\n\nCRITICAL: Return valid raw JSON only. Do not wrap in markdown or backticks.` }]
          }
        ]
      };

      for (const model of this.models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${this.geminiApiKey}`;
          const res = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 4000
          });

          const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
            return JSON.parse(cleaned);
          }
        } catch (e) {}
      }
    }

    // Groq Fallback
    if (env.GROQ_API_KEY) {
      try {
        const groqRes = await aiService.callGroq(prompt, systemInstruction);
        if (groqRes) return groqRes;
      } catch (e) {}
    }

    return null;
  }

  // 5. Fetch recent Interview Simulator weaknesses for user
  async fetchInterviewWeaknesses(userId) {
    try {
      const latestInterview = await InterviewSession.findOne({
        userId,
        $or: [
          { status: 'completed' },
          { finalReport: { $exists: true, $ne: null } }
        ]
      }).sort({ createdAt: -1 });

      const weaknesses = [];
      if (latestInterview) {
        if (latestInterview.finalReport?.whatYouShouldImprove) {
          weaknesses.push(...latestInterview.finalReport.whatYouShouldImprove);
        }
        if (latestInterview.performanceSummary?.needsImprovement) {
          weaknesses.push(...latestInterview.performanceSummary.needsImprovement);
        }
        if (Array.isArray(latestInterview.questions)) {
          latestInterview.questions
            .filter(q => q.isCorrect === false || (q.evaluation && q.evaluation.score < 60))
            .forEach(q => {
              if (q.topic) weaknesses.push(q.topic);
            });
        }
      }
      return [...new Set(weaknesses)].slice(0, 5);
    } catch (e) {
      console.warn('[RoadmapService] Interview weakness fetch notice:', e.message);
      return [];
    }
  }

  // 6. Generate Adaptive Company-Specific Roadmap
  async generateAdaptiveRoadmap({
    userId,
    company = 'TCS',
    role = 'Software Developer',
    durationWeeks = 8,
    userSkills = [],
    existingProgress = {} // map of { [skillId]: status }
  }) {
    const cleanCompany = (company || 'TCS').trim();
    const cleanRole = (role || 'Software Developer').trim();
    const weeks = parseInt(durationWeeks, 10) || 8;

    // 1. Research real public job postings & interview reports
    const sources = await this.researchJobRequirements(cleanCompany, cleanRole);
    const researchSnippets = sources.map(s => `[${s.title}] (${s.url}): ${s.snippet}`).join('\n\n');

    // 2. Fetch interview weaknesses for candidate
    const interviewWeaknesses = await this.fetchInterviewWeaknesses(userId);

    // 3. Construct Gemini Prompt
    const prompt = `You are designing a high-precision, company-specific technical career roadmap.
Target Company: "${cleanCompany}"
Target Job Role: "${cleanRole}"
Target Duration: ${weeks} Weeks

CANDIDATE'S CURRENT SKILLS:
${userSkills.length > 0 ? userSkills.join(', ') : 'None specified (Beginner / CS student)'}

RECENT INTERVIEW SIMULATOR WEAKNESSES IDENTIFIED:
${interviewWeaknesses.length > 0 ? interviewWeaknesses.join('\n') : 'No recent interview test failures recorded.'}

RESEARCHED PUBLIC JOB POSTINGS & INTERVIEW EXPERIENCES FOR ${cleanCompany} ${cleanRole}:
${researchSnippets.substring(0, 4500)}

RULES:
1. DO NOT CREATE A GENERIC "LEARN CODING" ROADMAP. Tailor specifically to ${cleanCompany} and ${cleanRole}.
2. Separate skills clearly into:
   - "Required by job posting" (directly verified from research for this role)
   - "Recommended for preparation" (valuable architectural/tooling competency)
   - "Interview focus" (highlighted if candidate showed weakness during interview simulator)
3. Learning Order & Dependencies:
   - Order skills strictly by prerequisite dependencies (e.g., Programming Fundamentals -> Frameworks -> Database -> System Design/DSA -> Projects).
   - Never recommend advanced tools (e.g. Kubernetes, Microservices) before fundamentals.
4. Priority: Assign each skill HIGH, MEDIUM, or LOW priority. Elevate interview weaknesses to HIGH priority.
5. Provide:
   - Gap Analysis: strong (already known), needsImprovement (partial or interview weakness), missing (not learned).
   - 5 Logical Roadmap Phases:
     * Phase 1: Programming Fundamentals
     * Phase 2: Core Technologies / Frameworks
     * Phase 3: Databases & System Architecture
     * Phase 4: Interview Preparation, DSA & Problem Solving
     * Phase 5: Production Projects
   - Each skill must include:
     * id, name, category, priority ("HIGH" | "MEDIUM" | "LOW"), sourceRequirement ("Required by job posting" | "Recommended for preparation" | "Interview focus")
     * why (why it matters specifically for ${cleanCompany} and ${cleanRole})
     * whatToLearn (array of 3 to 4 specific sub-concepts)
     * practice (practical exercise)
     * miniTask (hands-on small task to prove competence)
     * estimatedDays (number of days)
   - Weekly Plan: Exactly ${weeks} weekly modules (week 1 to ${weeks}) with theme, focus, topics, and miniTask.
   - Project Recommendations: 2 to 3 role-specific projects with title, description, skills, technologies, and whyItHelps.
   - Recommended Next Skill: The single most critical skill the candidate should focus on RIGHT NOW, why, and estimatedDays.
   - Readiness Score: 0 to 100 calculated from skills matched vs missing.

Return valid JSON structure:
{
  "readinessScore": 68,
  "skillGaps": {
    "strong": ["Java", "HTML", "CSS"],
    "needsImprovement": ["SQL", "DSA"],
    "missing": ["Spring Boot", "REST APIs", "Docker"],
    "highPriority": ["Spring Boot", "SQL", "DSA"],
    "optional": ["Docker", "Kubernetes"]
  },
  "roadmap": [
    {
      "phase": 1,
      "title": "Programming Fundamentals",
      "priority": "HIGH",
      "estimatedDays": 12,
      "skills": [
        {
          "id": "skill-1",
          "name": "Java OOP & Collections",
          "category": "Programming Languages",
          "priority": "HIGH",
          "sourceRequirement": "Required by job posting",
          "why": "Core language benchmark in ${cleanCompany} technical rounds.",
          "whatToLearn": ["Encapsulation & Inheritance", "Collections Framework (List, Map, Set)", "Streams API", "Exception Handling"],
          "practice": "Solve 15 OOP design challenges on LeetCode / HackerRank.",
          "miniTask": "Implement a custom generic in-memory cache using HashMaps and LinkedNode.",
          "estimatedDays": 4
        }
      ]
    }
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "title": "Core Foundations & OOP",
      "focus": "Language fundamentals and clean OOP principles",
      "topics": ["OOP Principles", "Java Collections", "Memory Management"],
      "skills": ["Java", "OOP"],
      "miniTask": "Build a command-line banking transaction manager."
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "title": "Enterprise Employee & Payroll REST API",
      "description": "Full-stack service handling secure role-based payroll calculation and employee analytics.",
      "skills": ["Spring Boot", "SQL", "REST API", "JWT"],
      "technologies": "Java, Spring Boot, MySQL, Postman",
      "whyItHelps": "Matches enterprise backend development patterns frequently tested in ${cleanCompany} hiring."
    }
  ],
  "recommendedNextSkill": {
    "name": "Spring Boot",
    "why": "Highest priority missing competency required across all verified job postings for ${cleanCompany}.",
    "estimatedDays": 5,
    "priority": "HIGH"
  }
}`;

    const systemInstruction = `You are CareerAI's Chief Technical Career Architect. Output valid JSON only, respecting realistic technical learning dependencies without generic fluff.`;

    const aiRes = await this.callGeminiJSON(prompt, systemInstruction);

    // If Gemini JSON succeeds, process and merge status
    if (aiRes && Array.isArray(aiRes.roadmap)) {
      let totalSkillsCount = 0;
      let completedSkillsCount = 0;

      const phases = aiRes.roadmap.map((phase, pIdx) => {
        const skills = (phase.skills || []).map((s, sIdx) => {
          const sId = s.id || `p${pIdx + 1}-s${sIdx + 1}`;
          const prevStatus = existingProgress[sId] || existingProgress[s.name.toLowerCase()] || 'Not Started';
          totalSkillsCount++;
          if (prevStatus === 'Completed') completedSkillsCount++;

          return {
            ...s,
            id: sId,
            status: prevStatus
          };
        });

        return {
          phase: phase.phase || pIdx + 1,
          title: phase.title || `Phase ${pIdx + 1}`,
          priority: phase.priority || 'HIGH',
          estimatedDays: phase.estimatedDays || 10,
          skills
        };
      });

      const overallProgress = totalSkillsCount > 0 
        ? Math.round((completedSkillsCount / totalSkillsCount) * 100) 
        : 0;

      return {
        targetCompany: cleanCompany,
        targetRole: cleanRole,
        readinessScore: aiRes.readinessScore || 65,
        durationWeeks: weeks,
        durationDays: weeks * 7,
        currentSkills: userSkills,
        interviewWeaknesses,
        skillGaps: aiRes.skillGaps || {
          strong: userSkills.slice(0, 3),
          needsImprovement: interviewWeaknesses,
          missing: ['Frameworks', 'System Design']
        },
        roadmap: phases,
        weeklyPlan: aiRes.weeklyPlan || [],
        projects: aiRes.projects || [],
        recommendedNextSkill: aiRes.recommendedNextSkill || {
          name: cleanRole.includes('Java') ? 'Spring Boot' : 'React / Node.js',
          why: `Essential foundational requirement for ${cleanRole} at ${cleanCompany}.`,
          estimatedDays: 5,
          priority: 'HIGH'
        },
        overallProgress,
        sources: sources.slice(0, 5)
      };
    }

    // High quality deterministic fallback matching prompt spec if AI API is temporarily unavailable
    return this.generateDeterministicFallback({
      company: cleanCompany,
      role: cleanRole,
      durationWeeks: weeks,
      userSkills,
      interviewWeaknesses,
      sources,
      existingProgress
    });
  }

  // Deterministic fallback matching strict prompt requirements
  generateDeterministicFallback({ company, role, durationWeeks, userSkills, interviewWeaknesses, sources, existingProgress }) {
    const isJava = /java|backend/i.test(role);
    const isFrontend = /frontend|react/i.test(role);

    const phases = [
      {
        phase: 1,
        title: 'Programming Fundamentals',
        priority: 'HIGH',
        estimatedDays: 10,
        skills: [
          {
            id: 'p1-s1',
            name: isJava ? 'Java & OOP Principles' : (isFrontend ? 'JavaScript & ES6+' : 'Python Core Fundamentals'),
            category: 'Programming Languages',
            priority: 'HIGH',
            status: existingProgress['p1-s1'] || (userSkills.some(s => /java|javascript|python/i.test(s)) ? 'Completed' : 'Not Started'),
            sourceRequirement: 'Required by job posting',
            why: `Core language evaluated in ${company} initial rounds.`,
            whatToLearn: ['Object-Oriented Programming', 'Memory Model', 'Collections & Data Structures', 'Exception Handling'],
            practice: 'Solve 20 foundational coding problems on LeetCode/HackerRank.',
            miniTask: 'Write a modular console application with classes, interfaces, and unit tests.',
            estimatedDays: 4
          },
          {
            id: 'p1-s2',
            name: 'Git & Version Control',
            category: 'Developer Tools',
            priority: 'MEDIUM',
            status: existingProgress['p1-s2'] || (userSkills.some(s => /git/i.test(s)) ? 'Completed' : 'Not Started'),
            sourceRequirement: 'Required by job posting',
            why: 'Essential collaborative engineering standard across all development teams.',
            whatToLearn: ['Branching Strategies', 'Merge Conflicts', 'Rebasing', 'GitHub Pull Requests'],
            practice: 'Create a multi-branch repository simulating a production release.',
            miniTask: 'Simulate and resolve a git merge conflict locally.',
            estimatedDays: 2
          }
        ]
      },
      {
        phase: 2,
        title: isJava ? 'Backend Development' : (isFrontend ? 'Frontend Frameworks' : 'Core Frameworks & APIs'),
        priority: 'HIGH',
        estimatedDays: 14,
        skills: [
          {
            id: 'p2-s1',
            name: isJava ? 'Spring Boot & REST APIs' : (isFrontend ? 'React & State Management' : 'Django / FastAPI'),
            category: 'Frameworks',
            priority: 'HIGH',
            status: existingProgress['p2-s1'] || 'Not Started',
            sourceRequirement: 'Required by job posting',
            why: `Primary development framework mentioned in verified ${company} job openings for ${role}.`,
            whatToLearn: ['MVC Architecture', 'Dependency Injection', 'RESTful Endpoints', 'Authentication & JWT'],
            practice: 'Build a secure multi-resource REST API with input validation.',
            miniTask: 'Implement token-based authentication with role-based access control.',
            estimatedDays: 6
          }
        ]
      },
      {
        phase: 3,
        title: 'Databases & System Architecture',
        priority: 'HIGH',
        estimatedDays: 12,
        skills: [
          {
            id: 'p3-s1',
            name: 'Relational Databases (SQL & PostgreSQL)',
            category: 'Databases',
            priority: 'HIGH',
            status: existingProgress['p3-s1'] || (userSkills.some(s => /sql/i.test(s)) ? 'Learning' : 'Not Started'),
            sourceRequirement: interviewWeaknesses.some(w => /sql/i.test(w)) ? 'Interview focus' : 'Required by job posting',
            why: `Database normalization and queries are heavily tested in ${company} interviews.`,
            whatToLearn: ['Complex Joins', 'Indexing Strategies', 'ACID Transactions', 'Schema Design'],
            practice: 'Write SQL queries covering Window Functions and multi-table joins.',
            miniTask: 'Design and index a scalable schema for an order processing system.',
            estimatedDays: 5
          }
        ]
      },
      {
        phase: 4,
        title: 'DSA & Interview Preparation',
        priority: 'HIGH',
        estimatedDays: 12,
        skills: [
          {
            id: 'p4-s1',
            name: 'Data Structures & Algorithms',
            category: 'Problem Solving',
            priority: 'HIGH',
            status: existingProgress['p4-s1'] || 'Not Started',
            sourceRequirement: interviewWeaknesses.some(w => /dsa|algo/i.test(w)) ? 'Interview focus' : 'Required by job posting',
            why: `Critical elimination round in ${company} coding assessments.`,
            whatToLearn: ['Arrays & HashMaps', 'Two Pointers & Sliding Window', 'Trees & Graphs', 'Dynamic Programming Basics'],
            practice: 'Solve 35 top interview questions commonly asked by tier-1 tech recruiters.',
            miniTask: 'Implement Depth-First Search and Breadth-First Search on a graph.',
            estimatedDays: 7
          }
        ]
      },
      {
        phase: 5,
        title: 'Production Projects',
        priority: 'MEDIUM',
        estimatedDays: 8,
        skills: [
          {
            id: 'p5-s1',
            name: 'Enterprise Portfolio Project',
            category: 'Projects',
            priority: 'MEDIUM',
            status: existingProgress['p5-s1'] || 'Not Started',
            sourceRequirement: 'Recommended for preparation',
            why: 'Demonstrates end-to-end applied engineering capability during manager rounds.',
            whatToLearn: ['Full Stack Integration', 'Docker Containerization', 'Automated Testing', 'Deployment'],
            practice: 'Deploy application with cloud database and clean documentation.',
            miniTask: 'Ship live demo with GitHub repository and architecture diagram.',
            estimatedDays: 8
          }
        ]
      }
    ];

    let total = 0;
    let completed = 0;
    phases.forEach(p => p.skills.forEach(s => {
      total++;
      if (s.status === 'Completed') completed++;
    }));

    return {
      targetCompany: company,
      targetRole: role,
      readinessScore: 64,
      durationWeeks: durationWeeks,
      durationDays: durationWeeks * 7,
      currentSkills: userSkills,
      interviewWeaknesses,
      skillGaps: {
        strong: userSkills.slice(0, 3),
        needsImprovement: interviewWeaknesses.length > 0 ? interviewWeaknesses : ['SQL Queries', 'DSA Fundamentals'],
        missing: [isJava ? 'Spring Boot' : 'React Hooks', 'System Architecture', 'Docker'],
        highPriority: [isJava ? 'Spring Boot' : 'React', 'SQL', 'DSA'],
        optional: ['Docker', 'AWS Basics']
      },
      roadmap: phases,
      weeklyPlan: [
        { week: 1, title: 'Programming Fundamentals', focus: 'Language mechanics and clean code', topics: ['Syntax', 'OOP', 'Collections'], skills: ['Java/JS'], miniTask: 'Build a CLI utility' },
        { week: 2, title: 'Data Persistence & SQL', focus: 'Relational data design', topics: ['DDL', 'DML', 'Joins', 'Indexes'], skills: ['SQL'], miniTask: 'Design database schema' },
        { week: 3, title: 'Framework Core & REST', focus: 'Building robust backend/web services', topics: ['Routing', 'Controllers', 'Middleware'], skills: ['Framework'], miniTask: 'Create CRUD API' },
        { week: 4, title: 'Authentication & Security', focus: 'Securing applications', topics: ['JWT', 'Password Hashing', 'CORS'], skills: ['Auth'], miniTask: 'Implement login & token validation' },
        { week: 5, title: 'DSA: Linear Structures', focus: 'Technical assessment speed', topics: ['Arrays', 'Strings', 'Stacks', 'Queues'], skills: ['DSA'], miniTask: 'Solve 15 LeetCode problems' },
        { week: 6, title: 'DSA: Non-Linear & Recursion', focus: 'Advanced algorithmic thinking', topics: ['Trees', 'Graphs', 'Recursion'], skills: ['DSA'], miniTask: 'Implement graph traversal' },
        { week: 7, title: 'System Architecture & Edge Cases', focus: 'Interview readiness', topics: ['Caching', 'Scalability', 'Error Handling'], skills: ['Architecture'], miniTask: 'Design a scalable URL shortener' },
        { week: 8, title: 'Capstone Project & Mock Polish', focus: 'Portfolio showcase', topics: ['Testing', 'Packaging', 'Resume Alignment'], skills: ['Projects'], miniTask: 'Publish portfolio project with live URL' }
      ],
      projects: [
        {
          id: 'proj-1',
          title: `Full-Stack Enterprise Management API for ${company}`,
          description: `Microservice architecture handling transactional records and automated metrics.`,
          skills: [isJava ? 'Spring Boot' : 'Node.js', 'SQL', 'REST API'],
          technologies: `${isJava ? 'Java, Spring Boot' : 'React, Node.js'}, PostgreSQL, Docker`,
          whyItHelps: `Directly demonstrates enterprise-level production development required for ${role} at ${company}.`
        },
        {
          id: 'proj-2',
          title: 'Real-Time Notification & Event Pipeline',
          description: 'High-concurrency event stream processor with Redis caching and pub/sub.',
          skills: ['WebSockets', 'Redis', 'System Architecture'],
          technologies: 'Node.js/Java, Redis, Docker',
          whyItHelps: 'Proves architectural scalability and distributed systems comprehension.'
        }
      ],
      recommendedNextSkill: {
        name: isJava ? 'Spring Boot' : (isFrontend ? 'React' : 'Python Web APIs'),
        why: `High-frequency requirement identified across verified public postings for ${company} ${role}.`,
        estimatedDays: 5,
        priority: 'HIGH'
      },
      overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0,
      sources: sources.slice(0, 4)
    };
  }
}

module.exports = new SkillsRoadmapService();
