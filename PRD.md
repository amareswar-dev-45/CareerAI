# PRD — AI-Driven Career Intelligence & Employment Management Platform

## 1. Product Overview

**Product type:** AI-powered Career Intelligence + Employment Management Platform  
**Primary users:** Students, fresh graduates, job seekers  
**Institution user:** College placement/career-center administrator  
**Core stack:** MERN (React, Node.js, Express, MongoDB)  
**AI role:** Analyze, personalize, explain, generate recommendations and simulations; AI output must be labeled as AI-generated/advisory.

### Product vision
Create one career operating system where a student can move from:

`Profile → Resume → Jobs → Company Intelligence → ATS → Skill Gap → Roadmap → Interview → Applications → Progress`

The college receives a separate employability dashboard built from the same candidate-intelligence layer.

---

## 2. Problem

Students currently use separate portals for job discovery, company research, resume checking, interview preparation, learning and application tracking. This creates fragmented preparation and little visibility for institutions.

The platform solves this by maintaining one shared candidate profile containing:
- education
- target role
- resume
- extracted skills
- job matches
- skill gaps
- roadmap progress
- interview performance
- applications
- preferences

---

## 3. Goals

### Student goals
1. Create a career profile quickly.
2. Upload one resume and reuse it across all modules.
3. Discover relevant jobs from multiple sources.
4. Understand why a job matches.
5. Research companies and hiring/interview information.
6. Analyze ATS compatibility.
7. Identify required, existing and missing skills.
8. Generate an ordered learning roadmap.
9. Practice aptitude, technical and HR interviews.
10. Track applications in one place.

### Institution goals
1. View student readiness at cohort level.
2. Identify common skill gaps.
3. Monitor preparation and application activity.
4. Drill into individual student readiness.
5. Plan interventions such as workshops.

---

## 4. Non-Goals for MVP

- Automatically applying to jobs without user approval.
- Guaranteeing employment or selection.
- Claiming a true probability of hiring.
- Automatically changing a user's resume without approval.
- Scraping sites that prohibit automated access.
- Treating AI-generated company/interview information as verified employer data.
- Replacing a human placement officer or interviewer.

---

## 5. User Roles

### Student
Can manage own profile, resume, jobs, analysis, roadmap, interviews and applications.

### College Admin
Can view institution-level student analytics and individual profiles according to institution permissions.

### System/AI Service
Runs parsing, matching, extraction, recommendations and interview generation.

---

# 6. Student Journey

## Step 1 — Authentication

### Login
Fields:
- Email
- Password
- Login
- Continue with Google

### Signup
Fields:
- Full name
- Email
- Password
- Confirm password

Firebase Authentication handles identity.

## Step 2 — Career Profile Setup

After login:

`Welcome, {firstName}. Let's build your career profile.`

Questions:
1. College name
2. Degree
3. Current year
4. Target role

Button:
`Continue`

The answers are stored in the candidate profile.

## Step 3 — Resume Upload

Upload:
- PDF preferred
- DOC/DOCX optionally supported

After upload:
- store resume securely
- extract text
- parse structured skills/education/experience
- create candidate-intelligence record
- run initial resume analysis

---

# 7. Student Modules

## 7.1 Dashboard

Show:
- profile completion
- target role
- resume status
- ATS score
- job-fit summary
- top missing skills
- roadmap progress
- interview readiness
- active applications
- recent recommended jobs
- recent interview performance

Dashboard should contain actionable cards such as:
- `Improve Resume`
- `View Skill Gaps`
- `Generate Roadmap`
- `Start Interview`
- `View Jobs`

---

## 7.2 Apply / Job Discovery

### Objective
Aggregate available jobs from supported sources and show relevant opportunities.

### Job card
- Company
- Role
- Location
- Salary if available
- Employment type if available
- Source
- Posted/updated date if available
- Required skills
- Match score
- Fit classification
- Apply button
- Company Intelligence button

### Matching
Candidate resume/profile is compared with job description.

Example:
`82% role fit`

Explain:
- Strong: React, Node.js, MongoDB
- Partial: AWS
- Missing: Docker

### Fit classification
- Safe Fit
- Stretch
- Reach

These are descriptive gap categories, not hiring predictions.

### Job sources
The implementation can connect to the supplied job APIs through backend adapters. Each adapter must normalize its response into a common `Job` schema.

Important:
- Never expose provider API keys in React.
- Backend calls providers.
- Store only fields permitted by provider terms.
- Respect rate limits and robots/API restrictions.
- De-duplicate by source job ID, canonical URL, company + title + location and similarity checks.

### Apply behavior
Clicking Apply opens the official/provider application URL.

After returning, user can click:
`Add to Application Tracker`

---

## 7.3 Company Intelligence

Accessible from each job card.

### Company page
- Company name
- Website
- Location
- Industry
- Role being researched
- Hiring process information
- Interview round patterns
- Commonly reported question themes
- Public review themes
- Source citations
- Data provenance

### Provenance labels
Every information item must show one of:
- `Employer-provided`
- `Public source`
- `AI-synthesized`
- `User-reported`

AI must not present inferred information as confirmed company policy.

### Research flow
1. Identify company.
2. Search public web sources.
3. Collect relevant pages.
4. Extract evidence.
5. Summarize with citations.
6. Separate fact from inference.

---

## 7.4 ATS Score

The user's uploaded resume is analyzed against:
- general ATS parsing quality
- target role
- selected job description when available

Show:
- ATS compatibility score
- keyword coverage
- missing important terms
- formatting/parsing warnings
- experience bullet quality
- skills section coverage
- measurable achievement suggestions

### Resume improvement
AI suggests changes.

For every suggestion:
- Existing text
- Suggested text
- Reason
- Target skill/requirement
- `Accept`
- `Reject`

The original resume remains unchanged until the user approves edits.

---

## 7.5 Skill Gap

Inputs:
- target role
- candidate resume
- selected job description if available
- standard skill taxonomy
- public role information

Output:

### Required skills
- Must-have
- Important
- Nice-to-have

### Candidate skills
Skills demonstrated by resume/profile.

### Missing skills
Skills required but not sufficiently demonstrated.

### Evidence
For each skill:
- Required because of: job/role source
- Candidate evidence: resume/profile section
- Gap status: Present / Partial / Missing

### Fit score
Use a descriptive **Role Readiness / Job Fit Score**, not a claim that the resume has an actual probability of being accepted.

Example:
`Role readiness: 76/100`

Breakdown:
- Core technical skills: 85
- Supporting skills: 70
- Experience alignment: 65
- Education alignment: 90
- Resume evidence quality: 72

Show:
`Why this score?`

Never say:
`You have a 76% chance of getting hired.`

---

## 7.6 AI Roadmap

If entered from Skill Gap:
- automatically use the latest skill-gap analysis
- button: `Generate Roadmap`

If opened directly:
- show: `Run Skill Gap Analysis first to generate a personalized roadmap.`
- button: `Go to Skill Gap`

### Roadmap structure
For every missing skill:
- priority
- reason
- prerequisite
- learning objective
- suggested resource
- mini-project
- estimated effort
- completion status

Example:
`Week 1 → JavaScript async/await → Node.js APIs → Express → MongoDB → REST project`

Roadmap is regenerated when:
- target role changes
- important job changes
- skills are marked complete
- interview performance exposes a weakness

---

# 7.7 Interview Center

Three rounds:
1. Aptitude
2. Technical
3. HR

Each session stores:
- questions
- answers
- score
- feedback
- timestamp
- target role
- round
- topic performance

## Aptitude

20 questions:
- Math: 5
- Reasoning: 5
- Logical: 5
- English: 5

Timer:
`20 minutes`

Question behavior:
- one question at a time
- `Next`
- `Skip`
- no previous-question navigation
- unanswered questions are recorded

Questions should be generated from controlled templates/question banks and validated before display.

### Result
Show:
- score
- correct/wrong
- topic-wise performance
- explanations
- weak topics

If pass threshold is met:
`Congratulations — Technical Round unlocked.`

If not:
`Try Again`

The next-round option can still be visible but should clearly indicate whether it is unlocked or optional practice.

---

## 7.8 Technical Round

Questions depend on target role.

For MERN example topics:
- Why MERN?
- MongoDB data extraction/querying
- React rendering/performance
- Node.js/Express
- REST APIs
- authentication
- database design
- debugging
- deployment
- basic system design

5 questions per session.

Questions should include:
- role-specific question
- follow-up question
- expected concepts
- scoring rubric

Feedback:
- correctness
- completeness
- technical depth
- missing concepts
- concise improvement suggestion

---

## 7.9 HR / Voice Interview

The HR interview is conversational.

Flow:
1. AI interviewer asks question.
2. User speaks.
3. Speech-to-text converts answer.
4. LLM evaluates answer.
5. AI generates a natural follow-up.
6. Text-to-speech/voice agent speaks it.
7. Continue until session ends.

Typical areas:
- Tell me about yourself.
- Why this role?
- Why should we hire you?
- Strengths/weaknesses.
- Project discussion.
- Team conflict.
- Failure/learning.
- Career goals.
- Company/role motivation.

### Feedback
- answer relevance
- structure
- clarity
- confidence indicators where technically measurable
- filler words if audio analysis supports it
- STAR structure for behavioral questions
- suggested improved answer

All such feedback must be labeled `AI-generated feedback`.

---

# 7.10 Application Tracker

Table:

| Company | Role | Applied Date | Status | Source |
|---|---|---|---|---|
| Example Corp | MERN Developer | 28 Sep | Applied | Company Site |

Statuses:
- Saved
- Applied
- In Review
- Shortlisted
- Interview
- Offer
- Rejected
- Withdrawn

### Important MVP behavior
The platform should NOT claim it knows a company's application status unless:
- the provider explicitly supplies status, or
- the user manually updates it, or
- a connected email/calendar workflow extracts a status message.

User can:
`Update Status`

Optional:
- interview date
- notes
- job URL
- follow-up date

---

# 8. College Admin

Route:
`/college`

Authentication must be implemented securely. A hard-coded shared password should not be used in production.

### Admin dashboard
Show:
- total students
- active students
- profile completion
- average role-readiness score
- common missing skills
- interview participation
- interview performance trends
- applications
- shortlist/offer data only where verified/entered
- role-wise readiness
- department/year filters

### Student table
- Student
- Degree/year
- Target role
- Resume status
- Top skill gaps
- Roadmap progress
- Interview readiness
- Application count

### Student detail
- profile
- extracted skills
- missing skills
- ATS analysis
- roadmap
- interview history
- applications

### Cohort insight
Example:
`32% of the selected cohort show a gap in SQL.`

Then:
`Suggested intervention: SQL workshop + database project practice.`

This is an AI-generated recommendation and must be labeled as such.

---

# 9. AI Principles

1. AI output must be labeled.
2. Source citations must be retained.
3. Verified employer information must remain separate from AI inference.
4. Resume changes require user approval.
5. Hiring/selection is never guaranteed.
6. Sensitive candidate data should be minimized.
7. Users can delete their profile/resume.
8. Admins only see institution-authorized data.
9. Logs must record AI analysis version and source context where practical.

---

# 10. MVP Acceptance Criteria

### Authentication
- Email/password signup/login works.
- Google login works.
- Unauthorized users cannot access student routes.

### Profile
- Onboarding saves all fields.
- Returning users skip completed onboarding.

### Resume
- PDF upload works.
- Resume text is extracted.
- Skills are stored.

### Jobs
- At least one real source is integrated reliably.
- Jobs are normalized.
- Apply links work.
- Job match explanation is displayed.

### Company Intelligence
- Search produces source-backed information.
- Sources are visible.

### ATS
- Resume analysis completes.
- Score and improvement suggestions display.

### Skill Gap
- Required/existing/missing skills display.
- Score has an explanation.

### Roadmap
- Roadmap is generated from actual skill gaps.
- Direct entry redirects to Skill Gap if analysis is missing.

### Interviews
- Aptitude timer and 20-question flow work.
- Technical questions are target-role aware.
- HR voice/text flow works.
- Results persist.

### Tracker
- User can create/update applications.
- Status history is retained.

### Admin
- College admin can see authorized cohort data.
- Filters and student detail pages work.

---

# 11. Future Enhancements

- Gmail/Outlook application-status extraction with user permission.
- Calendar integration.
- Browser extension for saving jobs.
- Cover-letter generation.
- Job alert notifications.
- Mentor/counsellor messaging.
- Institution workshop recommendations.
- Advanced semantic search/vector database.
- Employer portal.
- Multi-language interview support.
