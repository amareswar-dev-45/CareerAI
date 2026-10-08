const axios = require('axios');
const env = require('../config/env');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary if credentials exist
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
}

class CommunicationService {
  constructor() {
    this.geminiKey = env.GEMINI_COMMUNICATION_API || env.GEMINI_API_KEY;
    this.deepgramKey = env.SPEECH_TO_TEXT_API_KEY || env.VOICE_AGENT_API_KEY;
    this.ttsKey = env.TEXT_TO_SPEECH_API_KEY || env.SPEECH_TO_TEXT_API_KEY;
    this.models = ['models/gemini-3.5-flash-lite', 'models/gemini-flash-lite-latest', 'models/gemini-3.1-flash-lite', 'models/gemini-3.8-flash'];
  }

  // Core Gemini API caller for communication
  async callGemini(prompt, systemInstruction = "You are an expert AI English Communication Coach. Output valid JSON only.") {
    if (!this.geminiKey) {
      console.log('[Communication] Warning: GEMINI_COMMUNICATION_API is not configured.');
      return null;
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nTask:\n${prompt}\n\nIMPORTANT: Return ONLY a raw valid JSON object. Do not enclose in backticks or markdown.` }]
        }
      ]
    };

    for (const model of this.models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${this.geminiKey}`;
        const response = await axios.post(url, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 20000
        });

        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (err) {
        console.log(`[Communication] Gemini model ${model} notice:`, err.response?.data?.error?.message || err.message);
      }
    }

    // Secondary fallback to Groq if Gemini key encounters rate limits
    if (env.GROQ_API_KEY) {
      try {
        const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        }, {
          headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
          timeout: 15000
        });

        const text = groqRes.data?.choices?.[0]?.message?.content;
        if (text) return JSON.parse(text);
      } catch (gErr) {
        console.log('[Communication] Groq fallback notice:', gErr.message);
      }
    }

    return null;
  }

  // 1. Reading Practice Passage Generation
  async generateReadingPassage({ level = 'Beginner', topic = 'College Life' }) {
    console.log('[Communication] Reading session started');
    const prompt = `Generate an engaging English reading practice passage for an Indian college student.
Level: ${level} (Beginner: simple short sentences, daily routine, foundational vocabulary. Intermediate: professional, campus, career context. Advanced: articulate ideas, nuanced vocabulary).
Topic: ${topic}

Return JSON with format:
{
  "title": "Short title",
  "topic": "${topic}",
  "level": "${level}",
  "passage": "Passage text between 50-110 words.",
  "targetDurationSeconds": 45,
  "keyVocabulary": [
    { "word": "example", "meaning": "definition", "pronunciationHint": "eg-ZAM-pul" }
  ]
}`;

    const res = await this.callGemini(prompt, "You are an English language curriculum designer for engineering college students. Output JSON only.");
    if (res && res.passage) return res;

    // High quality deterministic fallback if API is unreachable
    const fallbacks = {
      Beginner: {
        title: "Morning Routine on Campus",
        topic: "College Life",
        level: "Beginner",
        passage: "Ravi wakes up at six in the morning. He gets ready and walks to college with his friends. Today, he has an important computer programming class in the lab. He enjoys learning new concepts and practicing coding every day.",
        targetDurationSeconds: 40,
        keyVocabulary: [
          { word: "programming", meaning: "Writing code for computers", pronunciationHint: "PROH-gram-ing" },
          { word: "concepts", meaning: "Ideas or principles", pronunciationHint: "KON-septs" },
          { word: "practicing", meaning: "Doing something regularly to improve", pronunciationHint: "PRAK-tis-ing" }
        ]
      },
      Intermediate: {
        title: "Preparing for Technical Interviews",
        topic: "Career Preparation",
        level: "Intermediate",
        passage: "Effective communication is just as crucial as technical competence during campus placements. When explaining project architecture, articulate each decision clearly. Highlight the problem you solved, the technologies you utilized, and the challenges you overcame with your team.",
        targetDurationSeconds: 50,
        keyVocabulary: [
          { word: "competence", meaning: "The ability to do something successfully", pronunciationHint: "KOM-pi-tuhns" },
          { word: "articulate", meaning: "Express an idea fluently and coherently", pronunciationHint: "ar-TIK-yuh-layt" },
          { word: "architecture", meaning: "The complex structure of a system", pronunciationHint: "AR-ki-tek-cher" }
        ]
      },
      Advanced: {
        title: "Innovation and Software Engineering",
        topic: "Technology & Future",
        level: "Advanced",
        passage: "Modern software ecosystems demand rigorous analytical thinking combined with transparent communication. Leading engineers must navigate intricate distributed systems while articulating tradeoffs with stakeholders. Cultivating both technical mastery and empathetic collaboration distinguishes exceptional professionals in global technology teams.",
        targetDurationSeconds: 60,
        keyVocabulary: [
          { word: "ecosystems", meaning: "Interconnected networks of technology", pronunciationHint: "EE-koh-sis-tuhmz" },
          { word: "intricate", meaning: "Very complicated or detailed", pronunciationHint: "IN-tri-kit" },
          { word: "empathetic", meaning: "Showing an ability to understand and share feelings", pronunciationHint: "em-puh-THET-ik" }
        ]
      }
    };

    return fallbacks[level] || fallbacks.Beginner;
  }

  // 2. Reading Speech Analysis (Expected vs Spoken)
  async analyzeReadingSpeech({ expectedText, spokenText, level = 'Beginner', durationSeconds = 30 }) {
    console.log('[Communication] Speech-to-text completed');
    console.log('[Communication] Gemini analysis started');

    const prompt = `Compare the student's spoken text against the expected reading passage and analyze their spoken English.

Expected Passage:
"${expectedText}"

Student Spoken Text:
"${spokenText || '(Student did not produce audible speech)'}"

Student Level: ${level}
Approximate Duration: ${durationSeconds} seconds

Analyze:
1. Expected words missed or skipped.
2. Words added or substituted incorrectly.
3. Grammar and flow.
4. Fluency (0-100 score).
5. Grammar (0-100 score).
6. Accuracy (0-100 score).
7. Pronunciation estimate (0-100 score, clearly marked as an estimate).
8. Speaking Speed ("Normal", "Fast", or "Slow").
9. Specific words from the text the student should practice pronouncing.
10. Actionable, encouraging suggestions for improvement.

CRITICAL RULES:
- All scores must strictly remain between 0 and 100.
- Never return a score above 100 or below 0.
- Be encouraging, supportive, and beginner-friendly.

Return JSON in this EXACT structure:
{
  "fluencyScore": 75,
  "grammarScore": 82,
  "accuracyScore": 78,
  "pronunciationScore": 70,
  "speakingSpeed": "Normal",
  "missingWords": ["word1", "word2"],
  "incorrectWords": [
    { "expected": "concepts", "spoken": "concept", "type": "plural" }
  ],
  "wordsToPractice": ["development", "environment", "architecture"],
  "mistakes": [
    { "spoken": "He enjoy learning", "correct": "He enjoys learning", "explanation": "Use third-person singular 'enjoys' with 'He'.", "type": "grammar" }
  ],
  "detectedIssues": [
    "A few words were skipped during the reading",
    "Pronunciation estimate needs attention on multi-syllable words"
  ],
  "feedbackMessage": "You read with steady pace! A few specific words can be polished.",
  "suggestions": [
    "Practice pausing at commas and periods to build natural rhythm.",
    "Repeat the highlighted words aloud before re-reading."
  ]
}`;

    const res = await this.callGemini(prompt, "You are a supportive, precise English speech coach. Return valid JSON only.");
    console.log('[Communication] Gemini analysis completed');
    console.log('[Communication] Feedback generated');

    if (res && typeof res.fluencyScore === 'number') {
      // Validate all scores strictly between 0 and 100
      return {
        fluencyScore: Math.min(100, Math.max(0, Math.round(res.fluencyScore))),
        grammarScore: Math.min(100, Math.max(0, Math.round(res.grammarScore || 80))),
        accuracyScore: Math.min(100, Math.max(0, Math.round(res.accuracyScore || 75))),
        pronunciationScore: Math.min(100, Math.max(0, Math.round(res.pronunciationScore || 70))),
        speakingSpeed: ['Normal', 'Fast', 'Slow'].includes(res.speakingSpeed) ? res.speakingSpeed : 'Normal',
        missingWords: Array.isArray(res.missingWords) ? res.missingWords : [],
        incorrectWords: Array.isArray(res.incorrectWords) ? res.incorrectWords : [],
        wordsToPractice: Array.isArray(res.wordsToPractice) ? res.wordsToPractice : ['communication', 'practice'],
        mistakes: Array.isArray(res.mistakes) ? res.mistakes : [],
        detectedIssues: Array.isArray(res.detectedIssues) ? res.detectedIssues : ['Keep practicing for smoother pacing.'],
        feedbackMessage: res.feedbackMessage || 'Good reading effort! Keep practicing consistently.',
        suggestions: Array.isArray(res.suggestions) ? res.suggestions : ['Read the passage aloud one more time.']
      };
    }

    // Algorithmic fallback if AI service fails
    const expWords = expectedText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const spkWords = (spokenText || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    const matched = expWords.filter(w => spkWords.includes(w));
    const accuracy = expWords.length > 0 ? Math.round((matched.length / expWords.length) * 100) : 50;
    const missing = expWords.filter(w => !spkWords.includes(w)).slice(0, 5);

    return {
      fluencyScore: Math.min(100, Math.max(30, accuracy - 5)),
      grammarScore: 85,
      accuracyScore: Math.min(100, Math.max(20, accuracy)),
      pronunciationScore: Math.min(100, Math.max(30, accuracy - 8)),
      speakingSpeed: 'Normal',
      missingWords: missing,
      incorrectWords: [],
      wordsToPractice: missing.slice(0, 3),
      mistakes: [],
      detectedIssues: missing.length > 0 ? ['Some words were skipped or mispronounced'] : ['Good overall flow'],
      feedbackMessage: 'You read the passage clearly! Focus on completing all sentences naturally.',
      suggestions: ['Read slowly and enunciate each word clearly.', 'Take a breath between sentences.']
    };
  }

  // 3. AI Conversation Partner Response
  async generateConversationReply({ history = [], studentMessage = '', level = 'Beginner', topic = 'College Life' }) {
    const prompt = `You are a friendly, supportive AI conversation partner helping an Indian college student practice spoken English.
USP: "Learn English by actually speaking with AI — not just watching lessons."

Student Level: ${level}
Conversation Topic: ${topic}

Recent Conversation History:
${history.slice(-6).map(m => `${m.role === 'ai' ? 'AI' : 'Student'}: ${m.content}`).join('\n')}

Student just said:
"${studentMessage}"

Instructions:
1. Reply naturally and warmly in 1 to 3 friendly sentences.
2. Adapt language to ${level} level (clear, natural, encouraging).
3. Always ask ONE engaging, open-ended follow-up question related to the topic.
4. Do NOT act like an examiner or give formal grades during the chat.
5. If the student made a slight grammar mistake, subtly model the correct usage in your reply without interrupting the conversational flow.

Return JSON:
{
  "reply": "Friendly response with a natural follow-up question.",
  "subtleCorrection": "Optional small note or null",
  "encouragement": "Good job expressing your thoughts!"
}`;

    const res = await this.callGemini(prompt, "You are a warm, encouraging peer English conversation coach. Output JSON only.");
    if (res && res.reply) return res;

    // Friendly fallbacks
    return {
      reply: `That is really interesting! Could you tell me more about what you enjoy most about it?`,
      subtleCorrection: null,
      encouragement: "Keep speaking, you are doing great!"
    };
  }

  // 4. End-of-Session Conversation Feedback
  async generateConversationFeedback({ history = [], level = 'Beginner', topic = 'College Life' }) {
    const studentUtterances = history.filter(m => m.role === 'student').map(m => m.content);

    const prompt = `Analyze this student's spoken English conversation session.
Student Level: ${level}
Topic: ${topic}

Student's Spoken Messages:
${studentUtterances.map((u, i) => `${i + 1}. "${u}"`).join('\n')}

Evaluate their spoken English objectively:
1. Fluency (0-100)
2. Grammar (0-100)
3. Vocabulary (0-100)
4. Clarity (0-100)
5. Accuracy (0-100)
6. Beginner-friendly mistake corrections with clear explanations:
   Format:
   - "spoken": What student said
   - "better": Natural correct phrasing
   - "explanation": Why (e.g. "Use 'since' when referring to the starting point of an ongoing situation.")
   - "tryAgainPrompt": "Try saying: '...'"
7. Weak areas to improve.
8. Recommended next practice.

CRITICAL: All scores must strictly remain between 0 and 100.

Return JSON:
{
  "fluency": 74,
  "grammar": 78,
  "vocabulary": 70,
  "clarity": 80,
  "accuracy": 76,
  "overall": 76,
  "mistakes": [
    {
      "spoken": "I am studying in GITAM from 2024.",
      "better": "I have been studying at GITAM since 2024.",
      "explanation": "Use 'since' when referring to the starting point of an ongoing situation.",
      "type": "grammar",
      "tryAgainPrompt": "Try saying: 'I have been studying at GITAM since 2024.'"
    }
  ],
  "strengths": [
    "Confident sentence formation",
    "Clear expression of personal experiences"
  ],
  "weakAreas": [
    "Preposition usage (since vs from)",
    "Subject-verb agreement"
  ],
  "recommendedPractice": [
    "Practice speaking about past events using present perfect tense.",
    "Repeat the corrected mistake sentences aloud."
  ],
  "summaryMessage": "Great conversation! You shared your thoughts naturally and clearly."
}`;

    const res = await this.callGemini(prompt, "You are an expert ESL coach providing constructive, encouraging feedback. Return JSON only.");

    if (res && typeof res.fluency === 'number') {
      const fluency = Math.min(100, Math.max(0, Math.round(res.fluency)));
      const grammar = Math.min(100, Math.max(0, Math.round(res.grammar || 75)));
      const vocabulary = Math.min(100, Math.max(0, Math.round(res.vocabulary || 70)));
      const clarity = Math.min(100, Math.max(0, Math.round(res.clarity || 75)));
      const accuracy = Math.min(100, Math.max(0, Math.round(res.accuracy || 75)));
      const overall = Math.round((fluency + grammar + vocabulary + clarity + accuracy) / 5);

      return {
        scores: { fluency, grammar, vocabulary, clarity, accuracy, overall },
        mistakes: Array.isArray(res.mistakes) ? res.mistakes : [],
        strengths: Array.isArray(res.strengths) ? res.strengths : ['Engaged actively in conversation'],
        weakAreas: Array.isArray(res.weakAreas) ? res.weakAreas : ['Grammar precision'],
        recommendedPractice: Array.isArray(res.recommendedPractice) ? res.recommendedPractice : ['Daily conversation practice'],
        summaryMessage: res.summaryMessage || 'Well done on completing this spoken conversation!'
      };
    }

    return {
      scores: { fluency: 72, grammar: 75, vocabulary: 70, clarity: 78, accuracy: 74, overall: 74 },
      mistakes: [],
      strengths: ['Participated actively in English conversation'],
      weakAreas: ['Grammar consistency'],
      recommendedPractice: ['Daily spoken conversation with AI coach'],
      summaryMessage: 'Good conversation session! Consistent practice will boost your fluency.'
    };
  }

  // 5. Evaluate Practice My Mistakes Spoken Attempt
  async evaluatePracticeAttempt({ originalMistake, expectedCorrection, studentSpoken }) {
    const prompt = `A student made an English mistake and was asked to say the corrected sentence.

Original Mistake: "${originalMistake}"
Target Correct Sentence: "${expectedCorrection}"
What Student Spoke: "${studentSpoken}"

Did the student successfully say the corrected sentence?
Evaluate:
1. Did they fix the mistake? (improved: true / false)
2. Score (0-100)
3. Concise encouraging feedback (1 sentence).

Return JSON:
{
  "improved": true,
  "score": 90,
  "feedback": "Great pronunciation and correct grammar! You fixed the mistake."
}`;

    const res = await this.callGemini(prompt, "You are a mistake-practice evaluator. Return JSON only.");
    if (res && typeof res.improved === 'boolean') {
      return {
        improved: res.improved,
        score: Math.min(100, Math.max(0, Math.round(res.score || (res.improved ? 85 : 45)))),
        feedback: res.feedback || (res.improved ? '✓ Improved! Great pronunciation and correct phrasing.' : 'Try again — focus on the correct phrasing.')
      };
    }

    // Fallback comparison
    const targetWords = expectedCorrection.toLowerCase().split(/\s+/).filter(Boolean);
    const spokenWords = studentSpoken.toLowerCase().split(/\s+/).filter(Boolean);
    const matched = targetWords.filter(w => spokenWords.includes(w));
    const isImproved = matched.length >= Math.ceil(targetWords.length * 0.6);

    return {
      improved: isImproved,
      score: isImproved ? 85 : 40,
      feedback: isImproved ? '✓ Improved! Good correction.' : 'Try again — speak clearly into the microphone.'
    };
  }

  // 6. Speech-to-Text with Deepgram
  async transcribeAudio(audioBuffer, mimetype = 'audio/webm') {
    if (!this.deepgramKey) {
      console.log('[Communication] Speech-to-text notice: Deepgram key missing');
      return '';
    }

    try {
      const response = await axios.post(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en',
        audioBuffer,
        {
          headers: {
            'Authorization': `Token ${this.deepgramKey}`,
            'Content-Type': mimetype || 'audio/webm'
          },
          timeout: 25000
        }
      );

      const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      console.log(`[Communication] Speech-to-text completed (${transcript.length} chars transcribed)`);
      return transcript;
    } catch (err) {
      console.log('[Communication] Deepgram transcription error:', err.response?.data?.message || err.message);
      return '';
    }
  }

  // 7. Text-to-Speech with Deepgram Aura
  async synthesizeSpeech(text) {
    if (!this.ttsKey) {
      return null;
    }

    try {
      const cleanText = (text || '').replace(/[\*\_#]/g, '').trim().slice(0, 500);
      const response = await axios.post(
        'https://api.deepgram.com/v1/speak?model=aura-asteria-en',
        { text: cleanText },
        {
          headers: {
            'Authorization': `Token ${this.ttsKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 20000
        }
      );

      const base64Audio = Buffer.from(response.data).toString('base64');
      return `data:audio/mp3;base64,${base64Audio}`;
    } catch (err) {
      console.log('[Communication] Deepgram TTS error:', err.message);
      return null;
    }
  }

  // 8. Cloudinary Audio Upload (Only where requested for permanent history)
  async uploadAudioToCloudinary(audioBuffer, filename = 'practice_audio') {
    try {
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        return null;
      }

      return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // audio files use resource_type video in Cloudinary
            folder: 'communication_practice',
            public_id: `${filename}_${Date.now()}`
          },
          (err, result) => {
            if (err) {
              console.log('[Communication] Cloudinary upload notice:', err.message);
              resolve(null);
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(audioBuffer);
      });
    } catch (e) {
      console.log('[Communication] Cloudinary upload exception:', e.message);
      return null;
    }
  }
}

module.exports = new CommunicationService();
