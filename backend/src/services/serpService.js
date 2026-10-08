const axios = require('axios');
const mongoose = require('mongoose');
const env = require('../config/env');
const CompanyIntel = require('../models/CompanyIntel');
const aiService = require('./aiService');

class SerpService {
  async searchCompany(companyName) {
    if (!companyName) return null;
    const normalized = companyName.toLowerCase().trim();

    // Check MongoDB cache first if connected
    if (mongoose.connection.readyState === 1) {
      try {
        const existing = await CompanyIntel.findOne({ normalizedCompanyName: normalized });
        if (existing && existing.rounds && existing.rounds.length > 0) {
          return existing;
        }
      } catch (err) {}
    }

    let searchResults = [];
    let knowledgeGraph = null;

    if (env.SERP_API_KEY) {
      try {
        // Query 1: Company Overview
        const overviewPromise = axios.get('https://serpapi.com/search.json', {
          params: {
            engine: 'google',
            q: `${companyName} company overview official website headquarters industry company size`,
            api_key: env.SERP_API_KEY
          },
          timeout: 9000
        }).catch(() => null);

        // Query 2: Interview Process & Candidate Experience
        const interviewPromise = axios.get('https://serpapi.com/search.json', {
          params: {
            engine: 'google',
            q: `${companyName} interview rounds recruitment process`,
            api_key: env.SERP_API_KEY
          },
          timeout: 9000
        }).catch(() => null);

        const [resOverview, resInterview] = await Promise.all([overviewPromise, interviewPromise]);

        let overviewSnippets = [];
        let interviewSnippets = [];

        if (resOverview && resOverview.data) {
          knowledgeGraph = resOverview.data.knowledge_graph || null;
          if (resOverview.data.organic_results) {
            overviewSnippets = resOverview.data.organic_results.slice(0, 6).map(r => ({
              title: r.title,
              url: r.link,
              snippet: r.snippet || '',
              provenance: 'Official web & company profiles'
            }));
          }
        }

        if (resInterview && resInterview.data && resInterview.data.organic_results) {
          interviewSnippets = resInterview.data.organic_results.slice(0, 6).map(r => ({
            title: r.title,
            url: r.link,
            snippet: r.snippet || '',
            provenance: 'Candidate experiences & career reports'
          }));
        }

        searchResults = [...overviewSnippets, ...interviewSnippets];
      } catch (err) {
        console.log('[SerpService] SerpAPI query notice:', err.message);
      }
    }

    // Deduplicate search results by URL
    const seenUrls = new Set();
    const uniqueSnippets = [];
    for (const r of searchResults) {
      if (r.url && !seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        uniqueSnippets.push(r);
      }
    }

    if (uniqueSnippets.length === 0) {
      return {
        companyName,
        normalizedCompanyName: normalized,
        website: 'Not available',
        description: 'Company overview is currently unavailable from public search sources.',
        about: 'Company overview is currently unavailable from public search sources.',
        industry: 'Technology & Software',
        headquarters: 'Not available',
        companySize: 'Not available',
        hiringLocations: 'Not available',
        interviewProcessVerified: false,
        interviewProcessMessage: 'Interview process information is currently unavailable from reliable public sources.',
        interviewRounds: [],
        rounds: [],
        reportedTopics: [],
        sampleQuestions: [],
        commonlyRequestedSkills: [],
        hiringInfo: 'Hiring information currently unavailable.',
        sourceAttribution: 'Public search sources',
        sources: [],
        lastUpdated: 'September 2026'
      };
    }

    // Separate overview and interview candidate reports
    const interviewContextSnippets = uniqueSnippets.filter(s => s.provenance.includes('Candidate') || /interview|round|question|process|drive/i.test(`${s.title} ${s.snippet}`));
    const companyContextSnippets = uniqueSnippets.filter(s => !interviewContextSnippets.includes(s));

    // Use Groq to extract structured factual corporate & interview intelligence
    const prompt = `You are a corporate intelligence researcher analyzing real web search results for "${companyName}".
Extract verified company overview and interview process details.

Company Information Snippets:
${JSON.stringify((companyContextSnippets.length > 0 ? companyContextSnippets : uniqueSnippets).slice(0, 6))}

Interview Experience & Recruitment Snippets:
${JSON.stringify((interviewContextSnippets.length > 0 ? interviewContextSnippets : uniqueSnippets).slice(0, 6))}

Knowledge Graph Data:
${JSON.stringify(knowledgeGraph || {})}


Guidelines:
1. OVERVIEW:
   - Extract official website, concise description/about, industry, headquarters, company size, and hiring locations.
   - If not found in snippets, set to "Not available".
2. INTERVIEW PROCESS & ROUNDS:
   - Do NOT invent interview rounds.
   - Extract stages or rounds described in snippets (e.g., Online Assessment, Technical Interview, System Design, HR / Cultural Fit).
   - For each round, assign "evidenceType": "Officially documented" if from official company careers page, or "Reported candidate experience" if from candidate feedback/Glassdoor/AmbitionBox, or "AI Insight" if synthesized.
   - If no interview rounds can be verified from snippets, set "interviewProcessVerified": false and "interviewProcessMessage": "Interview process information is currently unavailable from reliable public sources.", and "rounds": [].
3. TOPICS & QUESTIONS:
   - Extract frequently reported interview topics (e.g. DSA, System Design, React, SQL).
   - Extract real candidate-reported sample questions if present.
4. SOURCE ATTRIBUTION:
   - Set "sourceAttribution" describing where the data originated (e.g. "Glassdoor / AmbitionBox / Public Candidate Reports (Sep 2026)").

Return valid JSON matching this schema:
{
  "website": "<url or Not available>",
  "description": "<concise company summary>",
  "about": "<detailed overview of products/services>",
  "industry": "<e.g. Information Technology & Services>",
  "headquarters": "<city, country or Not available>",
  "companySize": "<e.g. 10,000+ employees or Not available>",
  "hiringLocations": "<e.g. Bangalore, Hyderabad, Remote or Not available>",
  "interviewProcessVerified": <true or false>,
  "interviewProcessMessage": "<null if verified, or 'Interview process information is currently unavailable from reliable public sources.'>",
  "rounds": [
    {
      "roundNumber": 1,
      "name": "Online Assessment / Aptitude",
      "description": "Timed coding or aptitude evaluation",
      "evidenceType": "Reported candidate experience"
    }
  ],
  "reportedTopics": ["Data Structures & Algorithms", "System Design"],
  "sampleQuestions": ["Explain closures in JavaScript", "Reverse a linked list"],
  "commonlyRequestedSkills": ["React", "Node.js", "SQL", "Cloud"],
  "hiringInfo": "<summary of recent hiring activity>",
  "sourceAttribution": "Public candidate reports & career platforms"
}`;

    const summarized = await aiService.callGroq(
      prompt,
      "You are a factual corporate research analyst. Extract verified facts from the snippets. Never hallucinate rounds or numbers."
    );

    const rounds = Array.isArray(summarized?.rounds) ? summarized.rounds : [];
    const isVerified = Boolean(summarized?.interviewProcessVerified && rounds.length > 0);

    const intel = {
      companyName,
      normalizedCompanyName: normalized,
      website: summarized?.website && summarized.website !== 'Not available' ? summarized.website : (knowledgeGraph?.website || uniqueSnippets[0]?.url || 'Not available'),
      description: summarized?.description && summarized.description !== 'Not available' ? summarized.description : (knowledgeGraph?.description || uniqueSnippets[0]?.snippet || 'Not available'),
      about: summarized?.about || summarized?.description || 'Company details from public web records.',
      industry: summarized?.industry || 'Technology & Engineering',
      headquarters: summarized?.headquarters || 'Not available',
      companySize: summarized?.companySize || 'Not available',
      hiringLocations: summarized?.hiringLocations || 'India / Global',
      interviewProcessVerified: isVerified,
      interviewProcessMessage: isVerified 
        ? null 
        : (summarized?.interviewProcessMessage || 'Interview process information is currently unavailable from reliable public sources.'),
      interviewRounds: rounds.map(r => typeof r === 'string' ? r : `${r.roundNumber ? r.roundNumber + '. ' : ''}${r.name}`),
      rounds: rounds.map((r, idx) => ({
        roundNumber: r.roundNumber || (idx + 1),
        name: r.name || `Round ${idx + 1}`,
        description: r.description || 'Evaluated from verified candidate reports',
        evidenceType: r.evidenceType || 'Reported candidate experience'
      })),
      interviewPatterns: rounds.map((r, idx) => ({
        roundName: typeof r === 'string' ? r : r.name,
        focus: typeof r === 'string' ? 'Public candidate reports' : (r.description || 'Public candidate reports'),
        provenance: typeof r === 'string' ? 'Reported candidate experience' : (r.evidenceType || 'Reported candidate experience')
      })),
      reportedTopics: Array.isArray(summarized?.reportedTopics) ? summarized.reportedTopics : [],
      sampleQuestions: Array.isArray(summarized?.sampleQuestions) ? summarized.sampleQuestions : [],
      commonlyRequestedSkills: Array.isArray(summarized?.commonlyRequestedSkills) ? summarized.commonlyRequestedSkills : [],
      hiringInfo: summarized?.hiringInfo || 'Active campus and lateral hiring observed on public job boards.',
      sourceAttribution: summarized?.sourceAttribution || 'Public search indices & candidate reports (Sep 2026)',
      sources: uniqueSnippets.slice(0, 6).map(s => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        provenance: s.provenance || 'Public source'
      })),
      lastUpdated: 'September 2026'
    };

    try {
      const saved = await CompanyIntel.findOneAndUpdate(
        { normalizedCompanyName: normalized },
        { $set: intel },
        { upsert: true, new: true }
      );
      return saved;
    } catch (e) {
      return intel;
    }
  }
}

module.exports = new SerpService();
