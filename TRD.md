# TRD — AI-Driven Career Intelligence & Employment Management Platform

## 1. Technical Overview

### Architecture

```text
React Client
   |
   | HTTPS / JWT
   v
Node.js + Express API
   |
   +--> Firebase Authentication
   |
   +--> MongoDB Atlas
   |
   +--> Resume Parser
   |
   +--> AI Orchestrator
   |       +--> LLM provider
   |       +--> Search provider
   |       +--> Job provider adapters
   |       +--> Voice/STT/TTS providers
   |
   +--> File Storage
   |
   +--> Background Jobs / Cache
```

Recommended separation:

```text
frontend/
backend/
  controllers/
  routes/
  services/
  models/
  middleware/
  adapters/
  ai/
  jobs/
  utils/
```

---

# 2. Technology Stack

## Frontend
- React
- React Router
- Tailwind CSS
- Axios/fetch
- Chart library
- Web Audio APIs where appropriate

## Backend
- Node.js
- Express.js
- JWT/session validation
- Zod/Joi validation
- Axios
- Multer or equivalent upload middleware

## Database
- MongoDB Atlas

## Authentication
- Firebase Authentication
- Email/password
- Google OAuth

Firebase ID token is sent to backend and verified server-side.

## AI
- Groq/LLM service for structured text analysis
- Gemini where required for conversational or multimodal workflows
- Embeddings/vector search can be added later

## Search
- SERP/search provider for public company information and sources.

## Jobs
Backend adapters for the supplied job APIs:
- Indian jobs provider
- Findwork
- The Muse
- Indeed/Apify workflow

Do not expose any provider credentials to the frontend.

## Voice
Use the supplied:
- speech-to-text provider
- text-to-speech provider
- voice-agent provider

The exact provider SDK/API contract must be configured from its official documentation rather than hard-coded assumptions.

---

# 3. Secrets Management

The API credentials pasted during development are secrets.

### Required action
Rotate/revoke any credentials that have been exposed in chat, GitHub, screenshots, frontend code or public repositories.

### `.env`

```env
MONGODB_URI=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

GROQ_API_KEY=
GEMINI_API_KEY=
SERP_API_KEY=

INDIAN_JOBS_API_KEY=
FINDWORK_API_KEY=
THE_MUSE_API_KEY=
APIFY_API_KEY=

STT_API_KEY=
TTS_API_KEY=
VOICE_AGENT_API_KEY=

JWT_SECRET=
```

Never:
- commit `.env`
- put secret keys in React
- put keys in `VITE_*` variables
- send provider keys to browser clients
- store keys in MongoDB user records

---

# 4. Authentication Architecture

## Signup

```text
React
 → Firebase createUser
 → Backend /users/sync
 → MongoDB User + CandidateProfile
```

## Login

```text
React
 → Firebase login
 → Firebase ID token
 → Backend
 → verifyIdToken()
 → create/return application session
```

Google login follows the same backend synchronization flow.

### Middleware

```text
authenticateFirebase()
   ↓
verify token
   ↓
find user
   ↓
attach req.user
```

---

# 5. Database Design

## User

```js
{
  _id,
  firebaseUid,
  name,
  email,
  role: "student" | "college_admin",
  institutionId,
  createdAt,
  updatedAt
}
```

## CandidateProfile

```js
{
  userId,
  collegeName,
  degree,
  currentYear,
  targetRole,
  location,
  preferences,
  profileCompletion,
  createdAt,
  updatedAt
}
```

## Resume

```js
{
  userId,
  fileUrl,
  fileName,
  mimeType,
  version,
  extractedText,
  parsedData: {
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: []
  },
  atsAnalysisId,
  createdAt
}
```

## Job

```js
{
  source,
  sourceJobId,
  title,
  company,
  location,
  salary,
  description,
  skills: [],
  employmentType,
  applyUrl,
  postedAt,
  expiresAt,
  fingerprint,
  rawSourceReference
}
```

## JobMatch

```js
{
  userId,
  jobId,
  fitScore,
  classification,
  matchedSkills: [],
  partialSkills: [],
  missingSkills: [],
  explanation,
  modelVersion,
  createdAt
}
```

## CompanyIntel

```js
{
  companyName,
  normalizedCompanyName,
  website,
  facts: [],
  interviewPatterns: [],
  hiringProcess: [],
  sources: [],
  generatedSummary,
  provenance,
  generatedAt
}
```

## ATSAnalysis

```js
{
  userId,
  resumeId,
  targetJobId,
  score,
  parsingWarnings: [],
  keywordCoverage: [],
  missingKeywords: [],
  suggestions: [],
  modelVersion,
  createdAt
}
```

## SkillGap

```js
{
  userId,
  targetRole,
  sourceJobId,
  requiredSkills: [],
  existingSkills: [],
  partialSkills: [],
  missingSkills: [],
  readinessScore,
  scoreBreakdown: {},
  evidence: [],
  createdAt
}
```

## Roadmap

```js
{
  userId,
  skillGapId,
  targetRole,
  weeks: [
    {
      title,
      goals: [],
      skills: [],
      resources: [],
      project,
      estimatedHours,
      completed
    }
  ],
  generatedAt,
  modelVersion
}
```

## InterviewSession

```js
{
  userId,
  targetRole,
  round: "aptitude" | "technical" | "hr",
  questions: [],
  answers: [],
  score,
  topicScores: {},
  feedback: [],
  duration,
  startedAt,
  completedAt
}
```

## Application

```js
{
  userId,
  jobId,
  company,
  role,
  applyUrl,
  appliedAt,
  status,
  statusHistory: [],
  interviewDate,
  notes,
  source
}
```

## Institution

```js
{
  name,
  adminUserIds: [],
  departments: [],
  createdAt
}
```

---

# 6. API Design

Base URL:

```text
/api/v1
```

## Auth/User

```text
POST /users/sync
GET  /users/me
PATCH /users/me
```

## Profile

```text
GET   /profile
PATCH /profile
POST  /profile/complete
```

## Resume

```text
POST /resume/upload
GET  /resume/current
POST /resume/analyze
GET  /resume/:id
```

## Jobs

```text
GET /jobs
GET /jobs/:id
POST /jobs/:id/match
GET /jobs/:id/company-intelligence
```

Query examples:

```text
/jobs?role=MERN%20Developer&location=Bhubaneswar
/jobs?targetRole=true
```

## ATS

```text
POST /ats/analyze
GET  /ats/latest
```

## Skill Gap

```text
POST /skills/analyze
GET  /skills/latest
```

## Roadmap

```text
POST /roadmap/generate
GET  /roadmap/current
PATCH /roadmap/items/:id
```

## Interview

```text
POST /interview/aptitude/start
POST /interview/aptitude/:sessionId/answer
POST /interview/aptitude/:sessionId/complete

POST /interview/technical/start
POST /interview/technical/:sessionId/answer
POST /interview/technical/:sessionId/complete

POST /interview/hr/start
POST /interview/hr/:sessionId/answer
POST /interview/hr/:sessionId/complete
```

## Applications

```text
GET    /applications
POST   /applications
PATCH  /applications/:id
DELETE /applications/:id
```

## College

```text
GET /college/dashboard
GET /college/students
GET /college/students/:id
GET /college/skills
GET /college/interviews
GET /college/applications
```

All college routes require `role=college_admin` and institution authorization.

---

# 7. Job Aggregation Architecture

Use adapter pattern:

```js
interface JobProvider {
  search(params): Promise<Job[]>
}
```

Adapters:

```text
IndianJobsAdapter
FindworkAdapter
MuseAdapter
ApifyIndeedAdapter
```

Normalization pipeline:

```text
Provider response
 ↓
Validate
 ↓
Normalize
 ↓
Clean description
 ↓
Extract skills
 ↓
Create fingerprint
 ↓
Deduplicate
 ↓
Cache
 ↓
MongoDB
 ↓
Match against candidate
```

Do not assume that an API's search result includes application status.

---

# 8. Job Matching

MVP scoring can combine:

```text
Role relevance
+ required skill coverage
+ experience alignment
+ education alignment
+ location alignment
+ preference alignment
```

Example conceptual formula:

```text
FitScore =
0.40 * skillCoverage
+ 0.20 * roleSimilarity
+ 0.15 * experienceAlignment
+ 0.10 * educationAlignment
+ 0.10 * locationAlignment
+ 0.05 * preferenceAlignment
```

Weights must be configurable and tested rather than treated as scientifically validated hiring weights.

### Explainability object

```js
{
  score: 82,
  matched: ["React", "Node.js"],
  partial: ["AWS"],
  missing: ["Docker"],
  reasons: [
    "Strong overlap in core stack",
    "Docker is requested but not demonstrated"
  ]
}
```

---

# 9. Resume Parsing Pipeline

```text
PDF upload
 ↓
Validate MIME + size
 ↓
Virus/security scan if available
 ↓
Extract text
 ↓
LLM structured extraction
 ↓
Schema validation
 ↓
Store parsed data
 ↓
Run ATS analysis
```

Structured output:

```json
{
  "name": "",
  "skills": [],
  "education": [],
  "experience": [],
  "projects": [],
  "certifications": []
}
```

Do not trust free-form LLM JSON without schema validation.

---

# 10. Company Intelligence Pipeline

```text
Company + Role
 ↓
Search public sources
 ↓
Collect URLs
 ↓
Extract relevant text
 ↓
Deduplicate
 ↓
LLM synthesis
 ↓
Attach citations
 ↓
Return facts + attributed patterns + AI inference separately
```

Avoid:
- fabricated interview rounds
- invented salary information
- claiming a review is official
- presenting a forum anecdote as company policy

---

# 11. ATS Engine

Inputs:
- parsed resume
- target job description

Processing:
1. Parse resume.
2. Extract job requirements.
3. Map synonyms.
4. Compare skill coverage.
5. Check section presence.
6. Identify formatting risks.
7. Generate suggestions.

Output:

```json
{
  "score": 78,
  "keywordCoverage": 82,
  "formatting": 90,
  "experienceEvidence": 68,
  "missingKeywords": [],
  "suggestions": []
}
```

The score is a product heuristic, not an actual employer ATS score.

---

# 12. Skill Gap Engine

```text
Target role/job
 ↓
Requirement extraction
 ↓
Skill taxonomy mapping
 ↓
Resume evidence extraction
 ↓
Required vs demonstrated comparison
 ↓
Present / Partial / Missing
 ↓
Readiness score
 ↓
Roadmap input
```

Important:
A skill should count as demonstrated only when there is resume/profile evidence.

---

# 13. Roadmap Engine

Priority:

```text
Must-have + high impact + prerequisite dependency
```

Output should be structured:

```json
{
  "weeks": [
    {
      "week": 1,
      "skills": ["JavaScript async", "REST basics"],
      "resources": [],
      "project": "Build REST API",
      "hours": 8
    }
  ]
}
```

Use resources only when the system can verify the source URL/title.

---

# 14. Interview Engine

## Aptitude

Question schema:

```js
{
  type: "math",
  question: "",
  options: [],
  correctAnswer: "",
  explanation: "",
  difficulty: 1
}
```

Session:
- 20 questions
- 20-minute timer
- server-side session start/end timestamps
- client timer is only a display
- server validates answer submission

Do not allow the client to send the correct answer.

## Technical

Generate questions from:
- target role
- extracted resume skills
- target job
- selected topic

Validate generated questions against a schema.

Example scoring:

```text
Correctness: 50%
Completeness: 25%
Reasoning: 15%
Clarity: 10%
```

Weights are configurable.

## HR

Pipeline:

```text
Question
 ↓
STT
 ↓
Transcript
 ↓
LLM evaluator
 ↓
Follow-up generation
 ↓
TTS/voice agent
 ↓
Next turn
```

Keep transcripts private and allow deletion.

---

# 15. Application Tracker

MVP source of truth:
- user action
- verified integration event

Statuses:

```text
Saved
Applied
In Review
Shortlisted
Interview
Offer
Rejected
Withdrawn
```

The system must not automatically change `Pending` to `Accepted` simply because a user clicked Apply.

---

# 16. Admin Analytics

Aggregation examples:

```text
Student count
Role distribution
Skill-gap frequency
Average readiness score
Interview participation
Application volume
Status distribution
Roadmap completion
```

Use MongoDB aggregation pipelines and indexes.

Never expose another institution's data.

---

# 17. Security

Required:
- Firebase token verification
- role-based access control
- institution-level authorization
- request validation
- rate limiting
- CORS restrictions
- secure HTTP headers
- file-size/type limits
- sanitized filenames
- secure file storage
- audit logs for admin access
- encrypted transport
- secrets in environment variables

For resume files:
- private storage
- signed temporary URLs
- no public bucket by default

---

# 18. Performance

### Indexes
```text
Job(source, sourceJobId)
Job(company, title)
Job(fingerprint)
Application(userId, status)
InterviewSession(userId, startedAt)
SkillGap(userId, targetRole)
```

### Caching
Cache:
- company intelligence
- job search results
- normalized job records
- role skill taxonomy

Do not cache private candidate data in a shared cache without user isolation.

---

# 19. Background Jobs

Use a queue later for:
- job synchronization
- resume parsing
- company intelligence
- roadmap generation
- notifications
- analytics aggregation

For MVP, synchronous processing is acceptable for short operations; long jobs should return a job ID and show progress.

---

# 20. Error Handling

Standard response:

```json
{
  "success": false,
  "error": {
    "code": "RESUME_PARSE_FAILED",
    "message": "We could not parse this resume."
  }
}
```

Never expose provider API keys, stack traces or internal prompts.

---

# 21. Observability

Track:
- API latency
- provider failures
- AI generation failures
- token usage/cost
- job ingestion count
- duplicate rate
- resume parse success
- interview completion rate

Do not log raw passwords, tokens or unnecessary resume/voice content.

---

# 22. Testing

### Unit
- score calculation
- normalization
- deduplication
- skill comparison
- status transitions

### Integration
- Firebase auth
- MongoDB
- job providers
- AI services
- resume upload

### E2E
1. Signup
2. Onboarding
3. Resume upload
4. Job search
5. Company intelligence
6. ATS
7. Skill gap
8. Roadmap
9. Interview
10. Application tracking
11. Admin dashboard

---

# 23. Deployment

Frontend:
- Vercel

Backend:
- Render or equivalent Node hosting

Database:
- MongoDB Atlas

Secrets:
- deployment provider environment variables

Do not put API keys in frontend build variables.

---

# 24. Suggested Build Order

### Phase 1
Auth + onboarding + resume upload

### Phase 2
Job aggregation + matching + apply links

### Phase 3
ATS + skill gap

### Phase 4
Roadmap

### Phase 5
Aptitude + technical interview

### Phase 6
HR voice interview

### Phase 7
Application tracker

### Phase 8
College dashboard

### Phase 9
Polish, security, testing, demo data

