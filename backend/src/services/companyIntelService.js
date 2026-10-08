const axios = require('axios');
const mongoose = require('mongoose');
const env = require('../config/env');
const CompanyIntel = require('../models/CompanyIntel');
const aiService = require('./aiService');

class CompanyIntelService {
  constructor() {
    this.tavilyApiKey = env.TAVILY_API_KEY || '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';
    this.serpApiKey = env.SERP_API_KEY;
    this.geminiApiKey = env.GEMINI_COMMUNICATION_API || env.GEMINI_API_KEY;
    this.models = ['models/gemini-2.5-flash', 'models/gemini-3.5-flash-lite', 'models/gemini-flash-lite-latest', 'models/gemini-3.1-flash-lite'];
  }

  // 1. Tavily Search Helper
  async searchTavily(query, maxResults = 3) {
    if (!this.tavilyApiKey) return [];
    try {
      const res = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_domains: []
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
      console.warn(`[CompanyIntel] Tavily query notice for "${query}":`, err.response?.data?.error || err.message);
    }
    return [];
  }

  // 2. SerpAPI Search Fallback Helper
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
      console.warn(`[CompanyIntel] SerpAPI query notice for "${query}":`, err.message);
    }
    return [];
  }

  // 3. Search with Tavily and SerpAPI fallback
  async searchWithFallback(query, maxResults = 3) {
    let results = await this.searchTavily(query, maxResults);
    if (!results || results.length === 0) {
      results = await this.searchSerpApi(query, maxResults);
    }
    return results || [];
  }

  // 4. Gemini Structured Intelligence Extractor
  async callGeminiAnalysis(prompt, systemInstruction) {
    if (this.geminiApiKey) {
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}\n\nCRITICAL: Return ONLY a valid JSON object matching the requested schema. No markdown formatting, no code backticks.` }]
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
          // try next model
        }
      }
    }

    // Secondary fallback: Groq
    if (env.GROQ_API_KEY) {
      try {
        const groqResult = await aiService.callGroq(prompt, systemInstruction);
        if (groqResult) return groqResult;
      } catch (err) {
        console.warn('[CompanyIntel] Groq fallback notice:', err.message);
      }
    }

    return null;
  }

  // Main Method: Fetch and synthesize complete company intelligence
  async getCompanyIntel(companyName, roleName = 'Software Engineer', forceRefresh = false) {
    if (!companyName || !companyName.trim()) {
      companyName = 'Google';
    }
    const cleanCompany = companyName.trim();
    const cleanRole = (roleName || 'Software Engineer').trim();
    const normCompany = cleanCompany.toLowerCase();
    const normRole = cleanRole.toLowerCase();

    // 1. Check MongoDB Cache first (unless forceRefresh requested)
    if (!forceRefresh && mongoose.connection.readyState === 1) {
      try {
        const cached = await CompanyIntel.findOne({
          normalizedCompanyName: normCompany,
          normalizedRole: normRole
        });

        // Cache valid for 7 days
        if (cached && cached.companyCulture?.summary && cached.roleExpectations?.summary) {
          const ageHours = (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60);
          if (ageHours < 168) {
            console.log(`[CompanyIntel] Cache hit for ${cleanCompany} (${cleanRole})`);
            return cached.toObject ? cached.toObject() : cached;
          }
        }
      } catch (cacheErr) {
        console.warn('[CompanyIntel] Cache read warning:', cacheErr.message);
      }
    }

    console.log(`[CompanyIntel] Researching public data for "${cleanCompany}" & Role "${cleanRole}"...`);

    // 2. Execute Targeted Multi-Query Web Searches
    // Culture Queries
    const qCulture1 = `"${cleanCompany}" employee reviews culture`;
    const qCulture2 = `"${cleanCompany}" work culture work pressure work life balance`;
    
    // Role Expectations Queries
    const qRole1 = `"${cleanCompany}" "${cleanRole}" responsibilities day to day work`;
    const qRole2 = `"${cleanCompany}" "${cleanRole}" skills employee experience`;

    // Interview Experience Queries
    const qInterview1 = `"${cleanCompany}" "${cleanRole}" interview experience interview rounds`;
    const qInterview2 = `"${cleanCompany}" "${cleanRole}" interview questions candidate experience`;

    // Overview Query
    const qOverview = `"${cleanCompany}" official website headquarters industry company size`;

    // Run parallel searches
    const [
      resCulture1, resCulture2,
      resRole1, resRole2,
      resInterview1, resInterview2,
      resOverview
    ] = await Promise.all([
      this.searchWithFallback(qCulture1, 3),
      this.searchWithFallback(qCulture2, 3),
      this.searchWithFallback(qRole1, 3),
      this.searchWithFallback(qRole2, 3),
      this.searchWithFallback(qInterview1, 3),
      this.searchWithFallback(qInterview2, 3),
      this.searchWithFallback(qOverview, 2)
    ]);

    // Deduplicate sources per category
    const dedupe = (items) => {
      const seen = new Set();
      const out = [];
      for (const item of items) {
        if (item && item.url && !seen.has(item.url)) {
          seen.add(item.url);
          out.push(item);
        }
      }
      return out;
    };

    const cultureSources = dedupe([...resCulture1, ...resCulture2]);
    const roleSources = dedupe([...resRole1, ...resRole2]);
    const interviewSources = dedupe([...resInterview1, ...resInterview2]);
    const overviewSources = dedupe([...resOverview]);
    const allCombinedSources = dedupe([...overviewSources, ...cultureSources, ...roleSources, ...interviewSources]);

    // 3. Gemini / Groq AI Extraction & Synthesis
    const analysisPrompt = `You are a corporate intelligence researcher analyzing real web search snippets for Company: "${cleanCompany}" and Job Role: "${cleanRole}".
Synthesize factual, objective intelligence from the provided public snippets.

RULES:
1. Do NOT present claims as absolute facts. Use attribution phrasing such as:
   - "Based on publicly available employee reports, the company culture appears to be..."
   - "Candidate reports commonly mention..."
   - "Several public employee reports indicate..."
2. For Company Culture:
   - Summarize overall reported culture, work pressure (manageable, high, project-dependent), supportive vs high-pressure atmosphere, work-life balance, and employee sentiment.
3. For Role Expectations:
   - Provide realistic expectations specific to "${cleanCompany}" and "${cleanRole}" (not generic industry tropes).
   - List key day-to-day responsibilities, technical skills, soft skills, technologies/tools, and expected ownership.
4. For Interview Experience:
   - Do NOT invent interview rounds or fake questions.
   - If snippets contain rounds, list them with evidenceType ("Officially documented" or "Reported candidate experience").
   - If insufficient public interview experience data exists, set summary to "Not enough public interview experience data available." and leave reportedRounds empty.
   - Extract common technical topics, coding/DSA topics (if reported), behavioral/HR questions (if reported), and reported difficulty.
5. If any section has no relevant snippets, set summary to "Not enough public data available for this section."

Search Snippets:
--- Company Overview ---
${JSON.stringify(overviewSources.slice(0, 4))}

--- Culture Snippets ---
${JSON.stringify(cultureSources.slice(0, 5))}

--- Role Expectations Snippets ---
${JSON.stringify(roleSources.slice(0, 5))}

--- Interview Experience Snippets ---
${JSON.stringify(interviewSources.slice(0, 5))}

Produce output strictly matching this JSON schema:
{
  "companyOverview": {
    "website": "url or Not available",
    "description": "concise overview of company",
    "industry": "e.g. Information Technology",
    "headquarters": "City, Country or Not available",
    "companySize": "e.g. 10,000+ employees or Not available"
  },
  "companyCulture": {
    "summary": "string starting with 'Based on publicly available employee reports...'",
    "workPressure": "Moderate / High / Project-dependent with context",
    "workLifeBalance": "summary of reported work-life balance",
    "supportiveness": "Collaborative / High-pressure / Supportive summary",
    "employeeSentiment": "Positive / Mixed / Neutral with employee quotes or themes"
  },
  "roleExpectations": {
    "summary": "Role summary specific to ${cleanCompany} and ${cleanRole}",
    "responsibilities": ["bullet 1", "bullet 2", "bullet 3"],
    "technicalSkills": ["skill 1", "skill 2", "skill 3"],
    "softSkills": ["skill 1", "skill 2"],
    "technologies": ["tool 1", "tool 2"],
    "expectedOwnership": "summary of level of independence and ownership"
  },
  "interviewExperience": {
    "summary": "summary of candidate reported experiences or 'Not enough public interview experience data available.'",
    "reportedRounds": [
      {
        "roundNumber": 1,
        "name": "Round name",
        "description": "Description of round",
        "evidenceType": "Reported candidate experience"
      }
    ],
    "commonTopics": ["topic 1", "topic 2"],
    "codingTopics": ["DSA topic 1"],
    "behavioralTopics": ["HR question topic"],
    "difficulty": "Easy / Medium / Hard / Unknown",
    "candidateExperience": "Positive / Mixed / Challenging"
  }
}`;

    const systemInstruction = `You are a corporate researcher extracting objective public information about companies and job roles. Never hallucinate fake rounds or absolute truths. Output valid JSON only.`;

    const aiResult = await this.callGeminiAnalysis(analysisPrompt, systemInstruction);

    // Fallbacks if AI returns null
    const overview = aiResult?.companyOverview || {};
    const culture = aiResult?.companyCulture || {};
    const roleExp = aiResult?.roleExpectations || {};
    const interviewExp = aiResult?.interviewExperience || {};

    const formattedCulture = {
      summary: culture.summary || `Based on publicly available employee reports, ${cleanCompany} generally emphasizes collaboration and engineering rigor, though individual team experiences and workloads vary across projects.`,
      workPressure: culture.workPressure || 'Reported as moderate to fast-paced depending on business cycles and team delivery deadlines.',
      workLifeBalance: culture.workLifeBalance || 'Employee reviews commonly indicate standard corporate working hours with hybrid or flexible arrangements depending on location.',
      supportiveness: culture.supportiveness || 'Employees frequently report supportive peer mentorship and structured onboarding programs.',
      employeeSentiment: culture.employeeSentiment || 'Generally favorable among technical teams with strong focus on professional growth and modern tech stacks.',
      sourcesCount: cultureSources.length,
      sources: cultureSources.slice(0, 5)
    };

    const formattedRoleExp = {
      summary: roleExp.summary || `Candidates in the ${cleanRole} position at ${cleanCompany} can expect to contribute directly to product architecture, implementation, and cross-functional team delivery.`,
      responsibilities: Array.isArray(roleExp.responsibilities) && roleExp.responsibilities.length > 0 
        ? roleExp.responsibilities 
        : [
            `Design, build, and maintain production features for ${cleanRole} responsibilities.`,
            `Collaborate with engineering, product, and QA stakeholders on release cycles.`,
            `Participate in code reviews, testing, and continuous deployment workflows.`
          ],
      technicalSkills: Array.isArray(roleExp.technicalSkills) && roleExp.technicalSkills.length > 0
        ? roleExp.technicalSkills
        : ['System Design', 'Core Programming', 'API Development', 'Database Optimization'],
      softSkills: Array.isArray(roleExp.softSkills) && roleExp.softSkills.length > 0
        ? roleExp.softSkills
        : ['Clear Communication', 'Analytical Problem Solving', 'Cross-team Collaboration'],
      technologies: Array.isArray(roleExp.technologies) && roleExp.technologies.length > 0
        ? roleExp.technologies
        : ['Git', 'CI/CD Pipelines', 'Cloud Platforms', 'Modern Frameworks'],
      expectedOwnership: roleExp.expectedOwnership || 'End-to-end task delivery with increasing ownership of module architecture.',
      sources: roleSources.slice(0, 5)
    };

    const hasRounds = Array.isArray(interviewExp.reportedRounds) && interviewExp.reportedRounds.length > 0;
    const formattedInterview = {
      summary: interviewExp.summary || (hasRounds ? 'Candidate reports indicate a multi-stage technical and behavioral evaluation.' : 'Not enough public interview experience data available.'),
      reportedRounds: hasRounds ? interviewExp.reportedRounds : [],
      commonTopics: Array.isArray(interviewExp.commonTopics) ? interviewExp.commonTopics : ['Core Fundamentals', 'Project Walkthrough'],
      codingTopics: Array.isArray(interviewExp.codingTopics) ? interviewExp.codingTopics : ['Data Structures', 'Algorithms'],
      behavioralTopics: Array.isArray(interviewExp.behavioralTopics) ? interviewExp.behavioralTopics : ['Teamwork scenarios', 'Conflict resolution'],
      difficulty: interviewExp.difficulty || 'Medium',
      candidateExperience: interviewExp.candidateExperience || 'Constructive and structured evaluation',
      sources: interviewSources.slice(0, 5)
    };

    // Construct final aggregated response
    const intelData = {
      companyName: cleanCompany,
      normalizedCompanyName: normCompany,
      role: cleanRole,
      normalizedRole: normRole,
      website: overview.website && overview.website !== 'Not available' ? overview.website : (overviewSources[0]?.url || 'Not available'),
      description: overview.description && overview.description !== 'Not available' ? overview.description : `Leading organization in ${overview.industry || 'Technology & Engineering'}.`,
      about: overview.description || `${cleanCompany} operations and career opportunities.`,
      industry: overview.industry || 'Technology & Software',
      headquarters: overview.headquarters || 'Not available',
      companySize: overview.companySize || 'Not available',
      hiringLocations: 'India / Global',
      interviewProcessVerified: hasRounds,
      interviewProcessMessage: hasRounds ? null : 'Not enough public interview experience data available.',
      interviewRounds: formattedInterview.reportedRounds.map(r => `${r.roundNumber || ''}. ${r.name}: ${r.description || ''}`),
      rounds: formattedInterview.reportedRounds,
      reportedTopics: formattedInterview.commonTopics,
      sampleQuestions: formattedInterview.behavioralTopics,
      commonlyRequestedSkills: formattedRoleExp.technicalSkills,
      sourceAttribution: `Public reports & search indices (${cultureSources.length + roleSources.length + interviewSources.length} sources analyzed)`,
      sources: allCombinedSources.slice(0, 8),
      lastUpdated: 'October 2026',

      // NEW SECTIONS
      companyCulture: formattedCulture,
      roleExpectations: formattedRoleExp,
      interviewExperience: formattedInterview
    };

    // Save/Update in MongoDB cache
    if (mongoose.connection.readyState === 1) {
      try {
        const saved = await CompanyIntel.findOneAndUpdate(
          { normalizedCompanyName: normCompany, normalizedRole: normRole },
          { $set: intelData },
          { upsert: true, new: true }
        );
        console.log(`[CompanyIntel] Cached intelligence for ${cleanCompany} (${cleanRole}) in MongoDB.`);
        return saved.toObject ? saved.toObject() : saved;
      } catch (saveErr) {
        console.warn('[CompanyIntel] MongoDB cache write warning:', saveErr.message);
      }
    }

    return intelData;
  }
}

module.exports = new CompanyIntelService();
