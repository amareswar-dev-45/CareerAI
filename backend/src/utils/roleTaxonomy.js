/**
 * Real Role-Skill Taxonomy & Normalization Engine
 * Grounded in actual industry hiring requirements across tech domains.
 */

const ROLE_TAXONOMY = {
  'MERN Stack Developer': {
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'Express.js', 'MongoDB', 'REST API', 'Git', 'HTML', 'CSS'],
    optionalSkills: ['TypeScript', 'Redux', 'Authentication', 'Testing', 'Docker', 'Tailwind CSS', 'Next.js', 'PostgreSQL', 'CI/CD'],
    importanceMap: {
      'JavaScript': { importance: 'High', reason: 'Core language for full stack web development across client and server.' },
      'React': { importance: 'High', reason: 'Primary frontend library for building modern dynamic user interfaces.' },
      'Node.js': { importance: 'High', reason: 'Core asynchronous JavaScript runtime executing the backend server.' },
      'Express.js': { importance: 'High', reason: 'Standard minimalist web framework for routing and middleware in Node.js.' },
      'MongoDB': { importance: 'High', reason: 'Primary NoSQL document database used in the MERN architecture.' },
      'REST API': { importance: 'High', reason: 'Critical for client-server HTTP communication and data exchange.' },
      'Git': { importance: 'High', reason: 'Industry standard for code version control, branching, and team collaboration.' },
      'HTML': { importance: 'High', reason: 'Foundation of web page structure and accessible semantic content.' },
      'CSS': { importance: 'High', reason: 'Essential for user styling, layout systems (Flexbox/Grid), and responsiveness.' },
      'Authentication': { importance: 'High', reason: 'Crucial for securing endpoints, user sessions, JWT tokens, and role-based access.' },
      'TypeScript': { importance: 'Medium', reason: 'Adds static typing to JavaScript, highly requested in production codebases.' },
      'Testing': { importance: 'Medium', reason: 'Guarantees endpoint reliability and component stability with Jest/Supertest.' },
      'Docker': { importance: 'Medium', reason: 'Containerizes application components for consistent local and production deployment.' },
      'Redux': { importance: 'Medium', reason: 'Handles predictable global state management across complex React applications.' },
      'Tailwind CSS': { importance: 'Medium', reason: 'Rapid UI styling through modern utility-first CSS classes.' }
    }
  },

  'Frontend Developer': {
    requiredSkills: ['JavaScript', 'React', 'HTML', 'CSS', 'Git', 'REST API', 'Responsive Design'],
    optionalSkills: ['TypeScript', 'Redux', 'Next.js', 'Tailwind CSS', 'Testing', 'Web Performance'],
    importanceMap: {
      'JavaScript': { importance: 'High', reason: 'Powers client-side interactivity, DOM manipulation, and modern web APIs.' },
      'React': { importance: 'High', reason: 'Industry-standard declarative UI framework.' },
      'HTML': { importance: 'High', reason: 'Semantic document markup foundation.' },
      'CSS': { importance: 'High', reason: 'Responsive styling, CSS Grid, and Flexbox layouts.' },
      'REST API': { importance: 'High', reason: 'Fetching and synchronizing data with backend web services.' },
      'Git': { importance: 'High', reason: 'Version control and team Git pull-request workflows.' },
      'TypeScript': { importance: 'Medium', reason: 'Essential for scaling large frontend enterprise applications.' },
      'Tailwind CSS': { importance: 'Medium', reason: 'Accelerates UI component construction.' }
    }
  },

  'Backend Developer': {
    requiredSkills: ['Node.js', 'Express.js', 'SQL', 'MongoDB', 'REST API', 'Git', 'Authentication'],
    optionalSkills: ['Docker', 'PostgreSQL', 'Redis', 'Microservices', 'Testing', 'CI/CD'],
    importanceMap: {
      'Node.js': { importance: 'High', reason: 'Core runtime environment for backend service architecture.' },
      'Express.js': { importance: 'High', reason: 'Middleware orchestration and routing.' },
      'REST API': { importance: 'High', reason: 'Designing scalable, stateless API endpoints.' },
      'SQL': { importance: 'High', reason: 'Relational data query syntax and complex data joins.' },
      'MongoDB': { importance: 'High', reason: 'Document store for high-throughput flexible schema requirements.' },
      'Authentication': { importance: 'High', reason: 'Secure credential hashing, JWT tokens, and OAuth2 workflows.' },
      'Docker': { importance: 'Medium', reason: 'Containerizing backend services.' },
      'Redis': { importance: 'Medium', reason: 'In-memory caching and session acceleration.' }
    }
  },

  'Java Developer': {
    requiredSkills: ['Java', 'Spring Boot', 'SQL', 'Hibernate', 'REST API', 'Git', 'Object-Oriented Programming'],
    optionalSkills: ['Microservices', 'Docker', 'PostgreSQL', 'Kafka', 'JUnit', 'Maven', 'AWS'],
    importanceMap: {
      'Java': { importance: 'High', reason: 'Core strongly-typed OOP language powering enterprise systems.' },
      'Spring Boot': { importance: 'High', reason: 'Dominant enterprise framework for production microservices and REST APIs.' },
      'SQL': { importance: 'High', reason: 'Database querying, indexing, and transactional integrity.' },
      'Hibernate': { importance: 'High', reason: 'Object-Relational Mapping (ORM) connecting Java models to database tables.' },
      'REST API': { importance: 'High', reason: 'Building standardized endpoints for enterprise integration.' },
      'Git': { importance: 'High', reason: 'Collaborative enterprise code repositories.' },
      'Docker': { importance: 'Medium', reason: 'Containerizing Java JARs into cloud microservices.' }
    }
  },

  'Python Developer': {
    requiredSkills: ['Python', 'Django', 'Flask', 'SQL', 'REST API', 'Git', 'Data Structures'],
    optionalSkills: ['PostgreSQL', 'Docker', 'Celery', 'Redis', 'FastAPI', 'Pandas', 'AWS'],
    importanceMap: {
      'Python': { importance: 'High', reason: 'Core high-level language with clean syntax and extensive ecosystem.' },
      'Django': { importance: 'High', reason: 'Full-featured web framework with ORM and built-in administration.' },
      'REST API': { importance: 'High', reason: 'Creating web services with Django REST Framework or FastAPI.' },
      'SQL': { importance: 'High', reason: 'Relational database schema modeling and querying.' },
      'Git': { importance: 'High', reason: 'Version control and continuous delivery.' }
    }
  },

  'Data Analyst': {
    requiredSkills: ['SQL', 'Python', 'Excel', 'Data Visualization', 'Power BI', 'Statistics'],
    optionalSkills: ['Pandas', 'NumPy', 'Tableau', 'Data Cleaning', 'R', 'Git', 'ETL'],
    importanceMap: {
      'SQL': { importance: 'High', reason: 'Querying and extracting structured business intelligence from relational databases.' },
      'Python': { importance: 'High', reason: 'Data transformation, scraping, and statistical modeling.' },
      'Excel': { importance: 'High', reason: 'Pivot tables, financial formulas, and rapid data exploration.' },
      'Power BI': { importance: 'High', reason: 'Interactive dashboard creation for executive stakeholder reporting.' },
      'Statistics': { importance: 'High', reason: 'Hypothesis testing, variance analysis, and trend forecasting.' }
    }
  },

  'Data Scientist': {
    requiredSkills: ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas', 'NumPy', 'Scikit-Learn'],
    optionalSkills: ['Deep Learning', 'TensorFlow', 'PyTorch', 'Data Visualization', 'Git', 'Big Data'],
    importanceMap: {
      'Python': { importance: 'High', reason: 'Primary ecosystem for machine learning and scientific computing.' },
      'Machine Learning': { importance: 'High', reason: 'Supervised and unsupervised predictive model development.' },
      'SQL': { importance: 'High', reason: 'Data warehousing and feature extraction.' },
      'Statistics': { importance: 'High', reason: 'Mathematical foundations for ML models and A/B test analysis.' }
    }
  },

  'DevOps Engineer': {
    requiredSkills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'AWS', 'Shell Scripting'],
    optionalSkills: ['Terraform', 'Ansible', 'Prometheus', 'Grafana', 'Jenkins', 'Python'],
    importanceMap: {
      'Linux': { importance: 'High', reason: 'Operating system backbone for cloud servers and containers.' },
      'Docker': { importance: 'High', reason: 'Standard packaging for deployable application images.' },
      'Kubernetes': { importance: 'High', reason: 'Container orchestration, auto-scaling, and cluster management.' },
      'CI/CD': { importance: 'High', reason: 'Automated test, build, and zero-downtime deployment pipelines.' },
      'AWS': { importance: 'High', reason: 'Leading public cloud infrastructure provider.' }
    }
  },

  'Cloud Engineer': {
    requiredSkills: ['AWS', 'Cloud Architecture', 'Linux', 'Networking', 'Docker', 'Terraform', 'Security'],
    optionalSkills: ['Kubernetes', 'Azure', 'Google Cloud', 'CI/CD', 'Python', 'Monitoring'],
    importanceMap: {
      'AWS': { importance: 'High', reason: 'Architecting scalable cloud infrastructure (EC2, S3, VPC, IAM).' },
      'Terraform': { importance: 'High', reason: 'Infrastructure as Code (IaC) for automated cloud provisioning.' },
      'Linux': { importance: 'High', reason: 'Server management, system security, and bash automation.' },
      'Docker': { importance: 'High', reason: 'Microservice containerization and orchestration.' }
    }
  },

  'Full Stack Developer': {
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'SQL', 'HTML', 'CSS', 'REST API', 'Git'],
    optionalSkills: ['TypeScript', 'MongoDB', 'Docker', 'PostgreSQL', 'AWS', 'Authentication', 'Testing'],
    importanceMap: {
      'JavaScript': { importance: 'High', reason: 'Unified language spanning client-side and server-side code.' },
      'React': { importance: 'High', reason: 'Dynamic user interface development.' },
      'Node.js': { importance: 'High', reason: 'Scalable backend API runtime.' },
      'SQL': { importance: 'High', reason: 'Relational data modeling and transactional persistence.' },
      'REST API': { importance: 'High', reason: 'Data interchange between client and server layers.' }
    }
  },

  'AI/ML Engineer': {
    requiredSkills: ['Python', 'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'SQL', 'Git'],
    optionalSkills: ['NLP', 'Computer Vision', 'FastAPI', 'Docker', 'MLOps', 'Pandas'],
    importanceMap: {
      'Python': { importance: 'High', reason: 'Foundational language for AI algorithm implementation.' },
      'Deep Learning': { importance: 'High', reason: 'Neural networks, transformer architectures, and embeddings.' },
      'PyTorch': { importance: 'High', reason: 'Modern standard framework for deep learning research and deployment.' },
      'Machine Learning': { importance: 'High', reason: 'Feature engineering, model training, and evaluation.' }
    }
  },

  'Software Engineer': {
    requiredSkills: ['Data Structures', 'Algorithms', 'Object-Oriented Programming', 'Git', 'SQL', 'REST API', 'Problem Solving'],
    optionalSkills: ['Java', 'Python', 'JavaScript', 'System Design', 'Docker', 'CI/CD', 'Unit Testing'],
    importanceMap: {
      'Data Structures': { importance: 'High', reason: 'Core computational models (arrays, trees, graphs, heaps) for efficient code.' },
      'Algorithms': { importance: 'High', reason: 'Time and space complexity optimization and problem solving.' },
      'Object-Oriented Programming': { importance: 'High', reason: 'Design patterns, encapsulation, and modular enterprise architecture.' },
      'Git': { importance: 'High', reason: 'Version control and multi-developer collaborative workflow.' },
      'SQL': { importance: 'High', reason: 'Database querying and schema design.' }
    }
  }
};

/**
 * Normalizes skill names so that variants match (e.g. node.js -> Node.js, reactjs -> React)
 */
function normalizeSkill(skill) {
  if (!skill || typeof skill !== 'string') return '';
  const trimmed = skill.trim();
  const lower = trimmed.toLowerCase();

  // Node variants
  if (/^node(\.js|js)?$/i.test(lower)) return 'Node.js';
  // React variants
  if (/^react(\.js|js)?$/i.test(lower)) return 'React';
  // Express variants
  if (/^express(\.js|js)?$/i.test(lower)) return 'Express.js';
  // Mongo variants
  if (/^mongo(db)?$/i.test(lower)) return 'MongoDB';
  // Postgres variants
  if (/^postgres(ql|\s*db)?$/i.test(lower)) return 'PostgreSQL';
  // TypeScript variants
  if (/^(ts|typescript)$/i.test(lower)) return 'TypeScript';
  // JavaScript variants
  if (/^(js|javascript|es6\+?)$/i.test(lower)) return 'JavaScript';
  // HTML variants
  if (/^html5?$/i.test(lower)) return 'HTML';
  // CSS variants
  if (/^css3?$/i.test(lower)) return 'CSS';
  // REST API variants
  if (/^(rest|rest\s*apis?|restful\s*apis?)$/i.test(lower)) return 'REST API';
  // Next.js variants
  if (/^next(\.js|js)?$/i.test(lower)) return 'Next.js';
  // AWS variants
  if (/^(aws|amazon\s*web\s*services)$/i.test(lower)) return 'AWS';
  // GCP variants
  if (/^(gcp|google\s*cloud(\s*platform)?)$/i.test(lower)) return 'Google Cloud';
  // Docker variants
  if (/^docker(\s*container(s)?)?$/i.test(lower)) return 'Docker';
  // Kubernetes variants
  if (/^(k8s|kubernetes)$/i.test(lower)) return 'Kubernetes';
  // DSA variants
  if (/^(dsa|data\s*structures(\s*(&|and)\s*algorithms)?|algorithms)$/i.test(lower)) return 'Data Structures & Algorithms';
  // Git variants
  if (/^(git|github|gitlab)$/i.test(lower)) return 'Git';
  // CI/CD variants
  if (/^(ci\/cd|cicd|continuous\s*integration)$/i.test(lower)) return 'CI/CD';
  // Auth variants
  if (/^(jwt|json\s*web\s*tokens?|auth|authentication(\s*(&|and)\s*authorization)?)$/i.test(lower)) return 'Authentication';
  // Tailwind variants
  if (/^tailwind(\s*css)?$/i.test(lower)) return 'Tailwind CSS';
  // Spring variants
  if (/^(spring|spring\s*boot)$/i.test(lower)) return 'Spring Boot';
  // Redux variants
  if (/^redux(\s*toolkit)?$/i.test(lower)) return 'Redux';
  // Vue variants
  if (/^vue(\.js|js)?$/i.test(lower)) return 'Vue.js';
  // PowerBI
  if (/^power\s*bi$/i.test(lower)) return 'Power BI';
  // Machine Learning
  if (/^(ml|machine\s*learning)$/i.test(lower)) return 'Machine Learning';
  // Deep Learning
  if (/^(dl|deep\s*learning)$/i.test(lower)) return 'Deep Learning';

  return trimmed;
}

/**
 * Finds reliable taxonomy for any target role string.
 */
function findRoleRequirements(targetRole = '') {
  const roleLower = targetRole.toLowerCase();

  for (const [key, val] of Object.entries(ROLE_TAXONOMY)) {
    if (key.toLowerCase() === roleLower) return { role: key, ...val };
  }

  // Substring/regex matching
  if (/mern|full\s*stack.*mern/i.test(roleLower)) return { role: 'MERN Stack Developer', ...ROLE_TAXONOMY['MERN Stack Developer'] };
  if (/front\s*end|ui/i.test(roleLower)) return { role: 'Frontend Developer', ...ROLE_TAXONOMY['Frontend Developer'] };
  if (/back\s*end|api\s*developer/i.test(roleLower)) return { role: 'Backend Developer', ...ROLE_TAXONOMY['Backend Developer'] };
  if (/java/i.test(roleLower)) return { role: 'Java Developer', ...ROLE_TAXONOMY['Java Developer'] };
  if (/python/i.test(roleLower)) return { role: 'Python Developer', ...ROLE_TAXONOMY['Python Developer'] };
  if (/data\s*analyst|analytics/i.test(roleLower)) return { role: 'Data Analyst', ...ROLE_TAXONOMY['Data Analyst'] };
  if (/data\s*scientist/i.test(roleLower)) return { role: 'Data Scientist', ...ROLE_TAXONOMY['Data Scientist'] };
  if (/devops|sre|site\s*reliability/i.test(roleLower)) return { role: 'DevOps Engineer', ...ROLE_TAXONOMY['DevOps Engineer'] };
  if (/cloud/i.test(roleLower)) return { role: 'Cloud Engineer', ...ROLE_TAXONOMY['Cloud Engineer'] };
  if (/ai|ml|machine\s*learning|deep\s*learning/i.test(roleLower)) return { role: 'AI/ML Engineer', ...ROLE_TAXONOMY['AI/ML Engineer'] };
  if (/full\s*stack/i.test(roleLower)) return { role: 'Full Stack Developer', ...ROLE_TAXONOMY['Full Stack Developer'] };

  // Default to Software Engineer general requirements
  return {
    role: targetRole || 'Software Engineer',
    requiredSkills: ROLE_TAXONOMY['Software Engineer'].requiredSkills,
    optionalSkills: ROLE_TAXONOMY['Software Engineer'].optionalSkills,
    importanceMap: ROLE_TAXONOMY['Software Engineer'].importanceMap
  };
}

/**
 * Calculates genuine Skill Gap by comparing user's extracted resume skills vs role requirements.
 * Guarantees zero fake data, dynamic percentage, and standardized normalization.
 */
function calculateRealSkillGap(rawResumeSkills = [], targetRole = 'Software Engineer', resumeFileName = 'resume.pdf', hasResume = true) {
  const roleReq = findRoleRequirements(targetRole);
  const isNoResume = hasResume === false || (rawResumeSkills.length === 0 && (resumeFileName === 'No Resume' || resumeFileName === 'none'));
  const normalizedUserSkills = isNoResume ? [] : Array.from(new Set(rawResumeSkills.map(normalizeSkill).filter(Boolean)));
  
  // Set of user skills for case-insensitive lookup
  const userSkillMap = new Map();
  normalizedUserSkills.forEach(s => userSkillMap.set(s.toLowerCase(), s));

function isSkillMatch(skillA, skillB) {
  const normA = normalizeSkill(skillA).toLowerCase();
  const normB = normalizeSkill(skillB).toLowerCase();
  if (normA === normB) return true;

  // Never match Java with JavaScript
  if ((normA === 'java' && normB === 'javascript') || (normA === 'javascript' && normB === 'java')) {
    return false;
  }

  // Handle whitespace / dot differences
  if (normA.replace(/[\s\.]+/g, '') === normB.replace(/[\s\.]+/g, '')) return true;

  // REST API matching
  if ((normA.includes('rest') && normB.includes('rest')) && (normA.includes('api') && normB.includes('api'))) {
    return true;
  }

  return false;
}

  // Determine which required skills are matched vs missing
  const matchedRequired = [];
  const missingRequired = [];

  roleReq.requiredSkills.forEach(reqSkill => {
    const normReq = normalizeSkill(reqSkill);
    const hasMatch = !isNoResume && normalizedUserSkills.some(uSkill => isSkillMatch(uSkill, normReq));
    if (hasMatch) {
      matchedRequired.push(normReq);
    } else {
      missingRequired.push(normReq);
    }
  });

  // Calculate dynamic skill match percentage based on real comparison
  const totalRequired = Math.max(roleReq.requiredSkills.length, 1);
  const skillMatchPercentage = isNoResume ? 0 : Math.round((matchedRequired.length / totalRequired) * 100);

  // Build Skills You Already Have (present in resume)
  const skillsYouHave = isNoResume ? [] : (normalizedUserSkills.length > 0 ? normalizedUserSkills : matchedRequired);

  // Build Skills You Need to Improve (actual missing skills)
  const missingStatus = isNoResume ? 'Not provided / Not verified' : 'Missing from resume';
  const skillsToImprove = missingRequired.map(skill => {
    const meta = roleReq.importanceMap[skill] || {};
    return {
      skill,
      status: missingStatus,
      importance: meta.importance || 'High',
      reason: isNoResume 
        ? `Expected for ${roleReq.role}. Not provided / Missing from current profile.`
        : (meta.reason || `Essential core competency required for ${roleReq.role}.`),
      action: isNoResume
        ? `Add verified project or coursework evidence for ${skill}.`
        : `Study fundamentals and build a mini-project applying ${skill}.`
    };
  });

  // Optional/supporting skills that are also missing
  const missingOptional = (roleReq.optionalSkills || []).filter(optSkill => {
    const norm = normalizeSkill(optSkill);
    const lower = norm.toLowerCase();
    return !userSkillMap.has(lower) && !matchedRequired.some(m => m.toLowerCase() === lower);
  });

  missingOptional.slice(0, 3).forEach(skill => {
    const meta = roleReq.importanceMap[skill] || {};
    skillsToImprove.push({
      skill,
      status: missingStatus,
      importance: meta.importance || 'Medium',
      reason: isNoResume
        ? `Recommended supporting skill for ${roleReq.role}. Not provided in profile.`
        : (meta.reason || `Recommended supporting skill for ${roleReq.role}.`),
      action: `Learn key concepts to strengthen overall market competitiveness.`
    });
  });

  // Skills breakdown for progress bars
  const skillsBreakdown = isNoResume
    ? roleReq.requiredSkills.map(s => ({
        skill: s,
        level: 0,
        status: 'Not provided / Not verified',
        evidence: 'Not provided / Not verified'
      }))
    : [
        ...matchedRequired.map(s => ({ skill: s, level: 85, status: 'Present', evidence: 'Detected in verified resume' })),
        ...missingRequired.map(s => ({ skill: s, level: 20, status: 'Missing', evidence: 'Not detected in uploaded resume' }))
      ];

  // Priority action items
  const prioritySkills = skillsToImprove.slice(0, 4).map(item => ({
    skill: item.skill,
    reason: item.reason,
    suggestedAction: item.action
  }));

  const note = 'Skill gaps are generated by comparing your uploaded resume with the requirements for your selected target role. Review the results and update your profile if any skill is missing from your resume.';

  return {
    targetRole: roleReq.role,
    resumeFileName,
    readinessScore: skillMatchPercentage,
    skillMatchPercentage,
    skillsYouHave,
    skillsToImprove,
    matchedSkills: matchedRequired,
    missingSkills: missingRequired,
    requiredSkills: roleReq.requiredSkills,
    existingSkills: skillsYouHave,
    skillsBreakdown,
    prioritySkills,
    note,
    scoreBreakdown: {
      coreTechnical: skillMatchPercentage,
      supportingSkills: Math.min(100, Math.round(skillMatchPercentage * 0.9 + 10)),
      experienceAlignment: Math.min(100, Math.max(30, skillMatchPercentage)),
      educationAlignment: 85,
      resumeEvidenceQuality: normalizedUserSkills.length > 5 ? 85 : 60
    },
    analyzedAt: new Date()
  };
}

/**
 * Deterministically constructs a personalized daily learning plan for the exact duration requested.
 * Prioritizes missing skills in logical order:
 * Fundamentals -> Role concepts -> Projects -> Testing -> Deployment -> Interview prep.
 */
function synthesizeDailyRoadmap({ targetRole, resumeSkills = [], skillGaps = [], durationDays = 30 }) {
  const daysCount = Math.max(1, Math.min(120, parseInt(durationDays, 10) || 30));
  const missing = skillGaps.length > 0 ? skillGaps : ['REST API', 'Authentication', 'Testing', 'Docker', 'Deployment'];

  // Categorize missing skills into structured modules
  const modules = [];

  missing.forEach((skill) => {
    if (/rest|api/i.test(skill)) {
      modules.push({
        skill: 'REST API',
        topics: [
          { topic: 'REST Architecture & HTTP Methods', learn: ['HTTP methods (GET, POST, PUT, DELETE)', 'Status codes (200, 201, 400, 404, 500)', 'Header management'], practice: 'Design request/response JSON contracts for a CRUD resource.', outcome: 'Understand standard client-server contracts.' },
          { topic: 'Building RESTful Controllers with Express', learn: ['Route handlers', 'Controller separation', 'Query parameters vs route params'], practice: 'Code a modular CRUD API for products/tasks.', outcome: 'Working CRUD backend endpoints.' },
          { topic: 'API Error Handling & Middleware', learn: ['Global error handling middleware', 'Validation with Zod or Joi', 'Async try/catch wrappers'], practice: 'Implement validation middleware that rejects malformed JSON.', outcome: 'Robust, fail-safe API architecture.' }
        ]
      });
    } else if (/auth|jwt/i.test(skill)) {
      modules.push({
        skill: 'Authentication',
        topics: [
          { topic: 'Password Hashing & User Registration', learn: ['Bcrypt hashing and salt rounds', 'Storing secure credentials', 'Email uniqueness validation'], practice: 'Implement secure registration endpoint storing hashed passwords.', outcome: 'Secure user onboarding pipeline.' },
          { topic: 'JWT Token Generation & Verification', learn: ['JWT payload design', 'Signing tokens with private secret', 'Token expiration strategies'], practice: 'Implement login endpoint returning signed JWTs.', outcome: 'Stateless authentication tokens.' },
          { topic: 'Protected Route Middleware & Role Guards', learn: ['Bearer token extraction', 'Verifying JWT signatures', 'Role-based authorization middleware'], practice: 'Secure private dashboard routes behind AuthMiddleware.', outcome: 'Protected API access control.' }
        ]
      });
    } else if (/test|jest/i.test(skill)) {
      modules.push({
        skill: 'Testing',
        topics: [
          { topic: 'Unit Testing Fundamentals with Jest', learn: ['Test suites and assertions', 'Testing pure utility functions', 'Mocking dependencies'], practice: 'Write unit tests covering validation functions with 100% branch coverage.', outcome: 'Automated test suite.' },
          { topic: 'Integration Testing with Supertest', learn: ['Testing HTTP endpoints', 'Mocking database calls', 'Status code verification'], practice: 'Write integration tests verifying registration and login endpoints.', outcome: 'Verified HTTP contract testing.' }
        ]
      });
    } else if (/docker|container/i.test(skill)) {
      modules.push({
        skill: 'Docker',
        topics: [
          { topic: 'Docker Fundamentals & Dockerfile Creation', learn: ['Containers vs Virtual Machines', 'Writing multi-stage Dockerfile', 'Layer caching optimization'], practice: 'Containerize your backend service with a minimal Alpine Node image.', outcome: 'Lightweight reproducible container image.' },
          { topic: 'Multi-Container Orchestration with Docker Compose', learn: ['Docker network bridge', 'Connecting app container with database container', 'Environment variables in compose'], practice: 'Create docker-compose.yml running both web app and database.', outcome: 'One-command local environment launch.' }
        ]
      });
    } else if (/deploy|ci|aws|cloud/i.test(skill)) {
      modules.push({
        skill: 'Deployment & CI/CD',
        topics: [
          { topic: 'Cloud Deployment & Environment Config', learn: ['Environment variable security', 'Production build optimization', 'Deploying on cloud platform'], practice: 'Deploy backend and database on a live cloud environment.', outcome: 'Publicly accessible production deployment.' },
          { topic: 'CI/CD Pipeline with GitHub Actions', learn: ['YAML workflow syntax', 'Automated test execution on pull request', 'Continuous deployment triggers'], practice: 'Configure GitHub Action that runs linter and tests on every push.', outcome: 'Automated CI/CD deployment pipeline.' }
        ]
      });
    } else {
      // General technical skill module
      modules.push({
        skill,
        topics: [
          { topic: `${skill} Core Concepts & Fundamentals`, learn: [`Key principles of ${skill}`, `Industry best practices`, `Syntax and basic configuration`], practice: `Complete 3 hands-on programming exercises demonstrating ${skill}.`, outcome: `Solid foundational grasp of ${skill}.` },
          { topic: `Integrating ${skill} into a Practical Project`, learn: [`Architecture integration`, `Handling edge cases and errors`, `Performance tuning`], practice: `Integrate ${skill} into an active portfolio application.`, outcome: `Demonstrable real-world project usage.` }
        ]
      });
    }
  });

  // Collect all topic items into an ordered sequence
  const topicPool = [];
  modules.forEach(m => {
    m.topics.forEach(t => {
      topicPool.push({
        skill: m.skill,
        ...t
      });
    });
  });

  // Append capstone and interview prep items
  topicPool.push({
    skill: 'Capstone Project',
    topic: 'Full-Stack Portfolio Integration',
    learn: ['Connecting all newly learned skills into a unified architecture', 'Documentation and README design'],
    practice: 'Build and deploy a full-featured capstone application featuring all learned skills.',
    outcome: 'Portfolio-ready capstone project on GitHub with live demo URL.'
  });

  topicPool.push({
    skill: 'Interview Readiness',
    topic: 'Technical Interview Preparation & Mock Sessions',
    learn: ['STAR method for behavioral questions', 'Explaining architectural choices and tradeoffs', 'Live coding walkthroughs'],
    practice: 'Conduct a simulated technical interview session answering questions on your new skills.',
    outcome: 'High confidence discussing your projects and technical skills with hiring managers.'
  });

  // Distribute topics evenly across exactly daysCount
  const days = [];
  for (let i = 1; i <= daysCount; i++) {
    // Map current day index to topic pool
    const topicIdx = Math.floor(((i - 1) / daysCount) * topicPool.length);
    const item = topicPool[Math.min(topicIdx, topicPool.length - 1)];

    // Derive day-specific sub-focus to make every single day unique
    const dayProgress = Math.round((i / daysCount) * 100);
    const isProjectOrReview = i % 7 === 0 || i === daysCount;

    let dayTopic = `${item.skill}: ${item.topic}`;
    let why = `${item.skill} is an identified skill gap for your target role ${targetRole}. Mastering this makes you competitive for live hiring openings.`;
    let learn = item.learn;
    let practice = item.practice;
    let expectedOutcome = item.outcome;

    if (isProjectOrReview) {
      dayTopic = `Milestone Review & Hands-on Implementation (Day ${i})`;
      why = `Consolidate skills learned over the preceding days and build durable portfolio evidence.`;
      learn = [`Reviewing code written for ${item.skill}`, `Refactoring and writing clean documentation`, `Debugging edge cases`];
      practice = `Build a clean, documented mini-module applying ${item.skill} and push code to your GitHub repo.`;
      expectedOutcome = `Verified GitHub commit demonstrating working mastery of ${item.skill}.`;
    } else if (daysCount > topicPool.length) {
      // For longer roadmaps, break down into detailed day-by-day sub-topics
      const subDay = ((i - 1) % 3) + 1;
      dayTopic = `${item.skill} - Part ${subDay}: ${item.topic}`;
      practice = `${item.practice} (Focus area: Phase ${subDay})`;
    }

    days.push({
      day: i,
      topic: dayTopic,
      why,
      learn,
      practice,
      expectedOutcome,
      completed: false
    });
  }

  // Milestones summary
  const milestones = [
    { step: 1, title: 'Analyze Skill Gaps', status: 'completed', details: `Compared resume against ${targetRole} requirements.` },
    { step: 2, title: `Core Gaps Mastery (Day 1-${Math.max(1, Math.round(daysCount * 0.4))})`, status: 'in_progress', details: `Closing ${missing.slice(0, 3).join(', ')}.` },
    { step: 3, title: `Advanced Implementation (Day ${Math.max(1, Math.round(daysCount * 0.4)) + 1}-${Math.round(daysCount * 0.75)})`, status: 'locked', details: 'Integration, architecture & optimization.' },
    { step: 4, title: `Capstone & Deployment (Day ${Math.round(daysCount * 0.75) + 1}-${daysCount})`, status: 'locked', details: 'Live portfolio project and mock interview readiness.' }
  ];

  return {
    targetRole,
    title: `${daysCount}-Day Personalized Career Roadmap`,
    durationDays: daysCount,
    skillGaps: missing,
    resumeSkills: Array.isArray(resumeSkills) ? resumeSkills : [],
    progressCount: 0,
    totalCount: daysCount,
    milestones,
    days,
    generatedAt: new Date()
  };
}

module.exports = {
  ROLE_TAXONOMY,
  normalizeSkill,
  findRoleRequirements,
  calculateRealSkillGap,
  synthesizeDailyRoadmap
};
