const BuiltResume = require('../models/BuiltResume');
const CandidateProfile = require('../models/CandidateProfile');
const axios = require('axios');
const env = require('../config/env');
const aiService = require('../services/aiService');

// Helper to call Gemini / Groq for Resume Builder
async function callGemini(prompt, systemInstruction = "You are a professional technical resume editor. Improve clarity, impact, and structure based ONLY on user-supplied information. Never invent jobs, companies, projects, or credentials. Output clean text.") {
  const geminiApiKey = env.GEMINI_COMMUNICATION_API || env.GEMINI_API_KEY;
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  if (geminiApiKey) {
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}` }]
        }
      ]
    };

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiApiKey}`;
        const res = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw && raw.trim()) {
          return raw.trim();
        }
      } catch (e) {
        // continue to next model
      }
    }
  }

  // Fallback to Groq if configured
  if (env.GROQ_API_KEY) {
    try {
      const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (groqRes.data?.choices?.[0]?.message?.content) {
        return groqRes.data.choices[0].message.content.trim();
      }
    } catch (err) {
      console.warn('[ResumeBuilder] Groq fallback notice:', err.message);
    }
  }

  return null;
}

// 1. List user's built resumes
exports.listResumes = async (req, res) => {
  try {
    const resumes = await BuiltResume.find({ userId: req.user.firebaseUid })
      .select('title template targetRole targetCompany updatedAt createdAt')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, data: resumes });
  } catch (error) {
    console.error('listResumes error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 2. Get specific or latest resume
exports.getResume = async (req, res) => {
  try {
    const { id } = req.params;
    let resume = null;

    if (id && id !== 'latest') {
      resume = await BuiltResume.findOne({ _id: id, userId: req.user.firebaseUid });
    } else {
      resume = await BuiltResume.findOne({ userId: req.user.firebaseUid }).sort({ updatedAt: -1 });
    }

    // If none exists, populate initial template with candidate profile
    if (!resume) {
      const profile = await CandidateProfile.findOne({ userId: req.user.firebaseUid });
      const defaultTitle = `${profile?.targetRole || 'Software Developer'} Resume`;
      resume = await BuiltResume.create({
        userId: req.user.firebaseUid,
        title: defaultTitle,
        targetRole: profile?.targetRole || 'Software Developer',
        targetCompany: profile?.dreamCompany || '',
        personal: {
          name: req.user.name || '',
          email: req.user.email || '',
          phone: '',
          location: '',
          linkedin: '',
          github: '',
          portfolio: ''
        },
        education: [
          {
            id: 'edu-1',
            degree: profile?.degree || 'B.Tech in Computer Science & Engineering',
            institution: profile?.collegeName || 'Government College of Engineering Kalahandi',
            location: 'Bhawanipatna, Odisha',
            startYear: '2022',
            endYear: '2026',
            grade: '8.4 CGPA'
          }
        ],
        skills: {
          programming: ['JavaScript', 'Java', 'Python', 'C++'],
          frameworks: ['React', 'Node.js', 'Express', 'Tailwind CSS'],
          databases: ['MongoDB', 'MySQL', 'PostgreSQL'],
          tools: ['Git', 'GitHub', 'VS Code', 'Postman'],
          other: ['Data Structures & Algorithms', 'REST APIs', 'System Design']
        }
      });
    }

    return res.json({ success: true, data: resume });
  } catch (error) {
    console.error('getResume error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 3. Save / Update resume
exports.saveResume = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;
    delete updateData.userId;

    let resume;
    if (id && id !== 'new') {
      resume = await BuiltResume.findOneAndUpdate(
        { _id: id, userId: req.user.firebaseUid },
        { $set: updateData },
        { new: true, upsert: true }
      );
    } else {
      resume = await BuiltResume.create({
        ...updateData,
        userId: req.user.firebaseUid
      });
    }

    return res.json({ success: true, data: resume });
  } catch (error) {
    console.error('saveResume error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 4. Duplicate resume
exports.duplicateResume = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await BuiltResume.findOne({ _id: id, userId: req.user.firebaseUid });
    if (!original) {
      return res.status(404).json({ success: false, error: { message: 'Resume not found' } });
    }

    const obj = original.toObject();
    delete obj._id;
    delete obj.createdAt;
    delete obj.updatedAt;
    obj.title = `${original.title} (Copy)`;

    const duplicated = await BuiltResume.create(obj);
    return res.json({ success: true, data: duplicated });
  } catch (error) {
    console.error('duplicateResume error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 5. Delete resume
exports.deleteResume = async (req, res) => {
  try {
    const { id } = req.params;
    await BuiltResume.deleteOne({ _id: id, userId: req.user.firebaseUid });
    return res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('deleteResume error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 6. AI Features (Strictly improves provided content without hallucinating)
exports.aiImprove = async (req, res) => {
  try {
    const { type, text, targetRole, targetCompany, skills } = req.body;

    if (!type) {
      return res.status(400).json({ success: false, error: { message: 'Type is required' } });
    }

    const role = targetRole || 'Software Developer';
    const company = targetCompany || 'target tech company';

    let prompt = '';
    let systemInstruction = "You are a professional technical resume editor. Improve clarity, impact, active verbs, and structure based ONLY on user-supplied information. Never invent jobs, companies, projects, or credentials. Output clean text.";

    if (type === 'summary') {
      prompt = `Improve this candidate's career summary for a ${role} role at ${company}.
Original text:
"${text || ''}"

Rules:
1. Use strong, professional wording with an active voice.
2. Align tone with the ${role} target role.
3. NEVER invent skills or achievements the user didn't mention.
4. Keep it concise (2 to 4 sentences).
Return ONLY the polished summary text.`;
    } else if (type === 'bullet') {
      prompt = `Rewrite this resume responsibility/achievement bullet point for a ${role} position.
Original bullet point:
"${text || ''}"

Rules:
1. Start with a strong action verb (e.g., Developed, Architected, Optimized, Engineered).
2. Follow standard Action -> Context -> Result impact structure.
3. Do NOT invent numbers or metrics if not provided.
4. Keep concise and professional.
Return ONLY the rewritten bullet point.`;
    } else if (type === 'project') {
      prompt = `Enhance this project description for a resume targeting a ${role} role.
Original description:
"${text || ''}"

Rules:
1. Highlight engineering problem-solving and architectural clarity.
2. Strictly base on the provided project concept; DO NOT invent false features.
3. Keep to 2-3 concise, impactful sentences or bullet points.
Return ONLY the enhanced project description.`;
    } else if (type === 'suggest_skills') {
      const currentSkills = Array.isArray(skills) ? skills.join(', ') : (typeof skills === 'object' ? Object.values(skills).flat().join(', ') : '');
      prompt = `The candidate is targeting the role: "${role}".
Their current listed skills are: "${currentSkills}".

Suggest 5 to 7 relevant technical skills that are standard for a ${role}.
CRITICAL RULE: Return raw JSON with an array of suggestions where each suggestion includes an item and a note reminding them to add it ONLY if they have practical experience with it.

Format JSON:
{
  "suggestions": [
    { "skill": "Docker", "category": "tools", "note": "Consider adding this skill if you actually have experience with containerization." },
    { "skill": "PostgreSQL", "category": "databases", "note": "Consider adding this skill if you actually have experience with relational databases." }
  ]
}`;
      systemInstruction = "You are a technical career advisor. Output valid JSON only.";
    }

    const result = await callGemini(prompt, systemInstruction);

    if (type === 'suggest_skills') {
      try {
        const cleaned = (result || '').replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.json({ success: true, data: parsed });
      } catch (err) {
        // Fallback default suggestions for role
        const fallback = [
          { skill: 'Git', category: 'tools', note: 'Consider adding this skill if you actually have experience with version control.' },
          { skill: 'REST APIs', category: 'frameworks', note: 'Consider adding this skill if you actually have experience building or integrating APIs.' },
          { skill: 'Data Structures & Algorithms', category: 'other', note: 'Consider adding this skill if you have solved DSA problems.' }
        ];
        return res.json({ success: true, data: { suggestions: fallback } });
      }
    }

    return res.json({
      success: true,
      data: {
        improvedText: result || text
      }
    });
  } catch (error) {
    console.error('aiImprove error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// 7. Check ATS Score (Estimated ATS Readiness)
exports.atsCheck = async (req, res) => {
  try {
    const { resumeData, targetRole } = req.body;
    if (!resumeData) {
      return res.status(400).json({ success: false, error: { message: 'Resume data is required' } });
    }

    const role = targetRole || resumeData.targetRole || 'Software Developer';
    
    // Evaluate resume completeness and matching
    const strengths = [];
    const missingAreas = [];
    const suggestions = [];
    let score = 50;

    // Contact details check
    const p = resumeData.personal || {};
    if (p.name && p.email && p.phone) {
      strengths.push('Complete personal and contact details');
      score += 10;
    } else {
      missingAreas.push('Incomplete contact information (ensure name, email, and phone are provided)');
    }

    if (p.linkedin || p.github) {
      strengths.push('Included professional profile links (LinkedIn/GitHub)');
      score += 5;
    } else {
      suggestions.push('Add your GitHub or LinkedIn link to improve profile visibility');
    }

    // Summary check
    if (resumeData.summary && resumeData.summary.trim().length > 40) {
      strengths.push('Clear professional summary aligned with target career direction');
      score += 10;
    } else {
      missingAreas.push('Brief or missing career objective / summary');
      suggestions.push('Add a 2-3 sentence career summary highlighting your technical focus');
    }

    // Education check
    if (Array.isArray(resumeData.education) && resumeData.education.length > 0) {
      strengths.push('Clear educational background and degree details');
      score += 10;
    } else {
      missingAreas.push('Missing education details');
    }

    // Projects check
    if (Array.isArray(resumeData.projects) && resumeData.projects.length >= 2) {
      strengths.push(`Showcased ${resumeData.projects.length} practical projects demonstrating applied skills`);
      score += 10;
    } else if (Array.isArray(resumeData.projects) && resumeData.projects.length === 1) {
      strengths.push('Contains project experience');
      score += 5;
      suggestions.push('Consider adding at least 2 key projects to demonstrate breadth');
    } else {
      missingAreas.push('No technical projects listed');
      suggestions.push('Add at least 2 relevant projects with technologies and your contributions');
    }

    // Skills check
    const s = resumeData.skills || {};
    const totalSkillsCount = (s.programming?.length || 0) + (s.frameworks?.length || 0) + (s.databases?.length || 0) + (s.tools?.length || 0) + (s.other?.length || 0);
    if (totalSkillsCount >= 8) {
      strengths.push(`Strong categorized skill section with ${totalSkillsCount} technical competencies`);
      score += 10;
    } else if (totalSkillsCount > 3) {
      score += 5;
      suggestions.push('Expand your skills categories (Programming, Frameworks, Databases, Tools)');
    } else {
      missingAreas.push('Sparse technical skills section');
    }

    // Experience check
    if (Array.isArray(resumeData.experience) && resumeData.experience.length > 0) {
      strengths.push('Contains relevant internship or professional work experience');
      score += 5;
    }

    const clampedScore = Math.min(95, Math.max(35, score));

    const result = {
      score: clampedScore,
      ratingLabel: `Estimated ATS Readiness: ${clampedScore}/100`,
      strengths,
      missingAreas,
      suggestions: suggestions.length > 0 ? suggestions : ['Keep project bullet points updated with quantifiable results']
    };

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('atsCheck error:', error);
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
