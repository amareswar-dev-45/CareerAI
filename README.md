# CareerAI — AI-Powered Career Readiness & Placement Platform

A production-grade MERN-stack application tailored for student career enablement, automated resume ATS analysis, company-specific AI interview simulation, and adaptive skills roadmap planning.

---

## 🚀 Key Features

1. **Dashboard & Placement Analytics**: Real-time readiness scoring, mock interview tracking, and skill gap summaries.
2. **Company Intel**: Real-time culture, work pressure, hiring process, and verified role insights powered by live search (Tavily/SerpAPI).
3. **AI Interview Simulator**: Full voice- and text-enabled company- and role-specific mock interviews with multi-round evaluations and targeted feedback.
4. **Skills Roadmap**: 5-phase dependency-sequenced learning path, weekly schedules, and enterprise portfolio projects tailored to target companies (e.g. TCS, Infosys, Amazon, Google).
5. **Resume Builder & ATS Scanner**: ATS scoring, missing keyword detection, and real-time PDF resume generation.
6. **College Placement Admin**: Department metrics, student placement tracking, and role readiness dashboards.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons, Axios, React Router v6.
- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Firebase Admin Authentication.
- **AI & Data Research**: Google Gemini API, Groq, Tavily Search API, SerpAPI, Puppeteer.

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd GCEK
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure your environment variables in .env (see .env.example)
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Environment Configuration

Never commit `.env` or sensitive secret keys to version control.
Refer to `backend/.env.example` to configure the required API keys and database strings.
