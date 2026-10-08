const axios = require('axios');
const env = require('../config/env');
const Job = require('../models/Job');

const SKILLS_DICTIONARY = [
  'React', 'Node.js', 'Express', 'MongoDB', 'JavaScript', 'TypeScript', 'Java', 'Python',
  'C++', 'SQL', 'PostgreSQL', 'MySQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'REST API',
  'GraphQL', 'HTML', 'CSS', 'Tailwind', 'Redux', 'Next.js', 'DSA', 'Spring Boot', 'Django',
  'Flask', 'Angular', 'Vue.js', 'Linux', 'Data Analysis', 'Machine Learning', 'Excel',
  'Communication', 'Problem Solving', 'Leadership', 'Agile', 'Scrum'
];

function extractSkillsFromText(text) {
  if (!text) return [];
  const found = [];
  for (const s of SKILLS_DICTIONARY) {
    const regex = new RegExp(`\\b${s.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(text)) {
      found.push(s);
    }
  }
  return found;
}

function determineWorkMode(title, location, description, isWfh) {
  const combined = `${title || ''} ${location || ''} ${description || ''}`.toLowerCase();
  if (isWfh || combined.includes('remote') || combined.includes('work from home')) {
    return 'Remote';
  }
  if (combined.includes('hybrid')) {
    return 'Hybrid';
  }
  return 'Onsite';
}

// Location and query normalizer
function parseSearchAndLocation(q, location, role, company) {
  let targetLocation = (location || '').trim();
  let queryTerms = (q || '').trim();

  // If location is not explicitly provided, check if queryTerms contains an Indian city/region
  if (!targetLocation && queryTerms) {
    const knownCities = [
      'bhubaneswar', 'bhubaneshwar', 'bengaluru', 'bangalore', 'hyderabad', 'pune',
      'mumbai', 'delhi', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'chennai', 'remote'
    ];
    for (const city of knownCities) {
      const regex = new RegExp(`\\b${city}\\b`, 'i');
      if (regex.test(queryTerms)) {
        targetLocation = city;
        queryTerms = queryTerms.replace(new RegExp(`(\\bin\\b|\\bat\\b)?\\s*\\b${city}\\b`, 'gi'), '').trim();
        break;
      }
    }
  }

  // Location display / API target mapping
  let normalizedCity = targetLocation;
  let normalizedFullLocation = targetLocation;
  const locLower = targetLocation.toLowerCase();

  if (locLower === 'bhubaneswar' || locLower === 'bhubaneshwar') {
    normalizedCity = 'Bhubaneswar';
    normalizedFullLocation = 'Bhubaneswar, Odisha, India';
  } else if (locLower === 'bengaluru' || locLower === 'bangalore') {
    normalizedCity = 'Bengaluru';
    normalizedFullLocation = 'Bengaluru, Karnataka, India';
  } else if (locLower === 'hyderabad') {
    normalizedCity = 'Hyderabad';
    normalizedFullLocation = 'Hyderabad, Telangana, India';
  } else if (locLower === 'pune') {
    normalizedCity = 'Pune';
    normalizedFullLocation = 'Pune, Maharashtra, India';
  } else if (locLower === 'mumbai') {
    normalizedCity = 'Mumbai';
    normalizedFullLocation = 'Mumbai, Maharashtra, India';
  } else if (locLower === 'delhi' || locLower === 'noida' || locLower === 'gurgaon' || locLower === 'gurugram') {
    normalizedCity = targetLocation;
    normalizedFullLocation = `${targetLocation}, Delhi NCR, India`;
  } else if (locLower === 'kolkata') {
    normalizedCity = 'Kolkata';
    normalizedFullLocation = 'Kolkata, West Bengal, India';
  } else if (locLower === 'chennai') {
    normalizedCity = 'Chennai';
    normalizedFullLocation = 'Chennai, Tamil Nadu, India';
  } else if (locLower === 'remote') {
    normalizedCity = 'Remote';
    normalizedFullLocation = 'Remote';
  }

  const effectiveRole = [company, queryTerms || role || 'Software Developer'].filter(Boolean).join(' ').trim();

  return {
    queryTerms,
    effectiveRole,
    normalizedCity,
    normalizedFullLocation
  };
}

// Location matching helper that accommodates spelling variations (e.g. Bhubaneswar vs Bhubaneshwar, Odisha)
function doesJobMatchLocation(jobLocation, jobTitle, targetCity) {
  if (!targetCity) return true;
  const targetLower = targetCity.toLowerCase();
  const locLower = (jobLocation || '').toLowerCase();
  const titleLower = (jobTitle || '').toLowerCase();

  if (targetLower === 'remote') {
    return locLower.includes('remote') || titleLower.includes('remote') || /work from home|wfh/i.test(locLower);
  }

  if (targetLower === 'bhubaneswar' || targetLower === 'bhubaneshwar') {
    return locLower.includes('bhubaneswar') || locLower.includes('bhubaneshwar') || locLower.includes('odisha') || locLower.includes('khordha');
  }

  if (targetLower === 'bengaluru' || targetLower === 'bangalore') {
    return locLower.includes('bengaluru') || locLower.includes('bangalore') || locLower.includes('karnataka');
  }

  return locLower.includes(targetLower) || titleLower.includes(targetLower);
}

class JobAggregator {
  // 1. Indian Jobs API / Google Jobs via SerpApi
  async fetchGoogleJobs({ effectiveRole, normalizedCity, normalizedFullLocation, workMode }) {
    if (!env.SERP_API_KEY) {
      console.log('[Jobs] Indian API: failed (SERP_API_KEY missing)');
      return [];
    }

    try {
      let searchQuery = effectiveRole || 'Software Engineer';
      if (normalizedCity) {
        if (normalizedCity.toLowerCase() === 'remote') {
          searchQuery = `${searchQuery} Remote`;
        } else {
          searchQuery = `${searchQuery} in ${normalizedCity}`;
        }
      }

      const params = {
        engine: 'google_jobs',
        q: searchQuery,
        api_key: env.SERP_API_KEY,
        gl: 'in',
        hl: 'en'
      };

      if (normalizedCity && normalizedCity.toLowerCase() !== 'remote') {
        params.location = normalizedFullLocation;
      } else {
        params.location = 'India';
      }

      const res = await axios.get('https://serpapi.com/search.json', {
        params,
        timeout: 15000
      });

      const jobsResults = res.data?.jobs_results || [];
      console.log(`[Jobs] Indian API: success (${jobsResults.length} jobs retrieved)`);

      return jobsResults.map((j, idx) => {
        const title = j.title || 'Not available';
        const companyName = j.company_name || 'Not available';
        const jobLocation = j.location || normalizedFullLocation || 'India';
        const description = j.description || (j.job_highlights ? j.job_highlights.map(h => h.items.join(' ')).join(' ') : 'Job description available at application link.');
        const isWfh = Boolean(j.detected_extensions?.work_from_home);
        const mode = determineWorkMode(title, jobLocation, description, isWfh);

        let detectedSkills = extractSkillsFromText(`${title} ${description}`);
        if (detectedSkills.length === 0) {
          detectedSkills = ['Communication', 'Problem Solving'];
        }

        const applyUrl = j.apply_options?.[0]?.link || j.related_links?.[0]?.link || j.share_link || 'Not available';
        const sourceName = j.via ? `Google Jobs via ${j.via.replace(/^via\s+/i, '')}` : 'Google Jobs India';
        const salary = j.detected_extensions?.salary || 'Not disclosed';
        const postedAt = j.detected_extensions?.posted_at || 'Recently';

        return {
          id: j.job_id || `gj_${Date.now()}_${idx}`,
          sourceJobId: j.job_id || `gj_${Date.now()}_${idx}`,
          title,
          company: companyName,
          location: jobLocation,
          employmentType: j.detected_extensions?.schedule_type || 'Full-time',
          workMode: mode,
          description,
          skills: detectedSkills,
          salary,
          applyUrl,
          source: sourceName,
          postedAt
        };
      });
    } catch (err) {
      console.log('[Jobs] Indian API: failed', err.message);
      return [];
    }
  }

  // 2. Apify Indeed Jobs Provider
  async fetchApifyJobs({ effectiveRole, normalizedCity }) {
    if (!env.APIFY_API_KEY) {
      console.log('[Jobs] Apify: failed (APIFY_API_KEY missing)');
      return [];
    }

    try {
      const position = effectiveRole || 'Software Engineer';
      const loc = normalizedCity || 'India';

      const res = await axios.post(
        `https://api.apify.com/v2/acts/misceres~indeed-scraper/run-sync-get-dataset-items?token=${env.APIFY_API_KEY}&timeout=25`,
        {
          position,
          location: loc,
          country: 'IN',
          maxItems: 8
        },
        { timeout: 28000 }
      );

      const items = Array.isArray(res.data) ? res.data : [];
      console.log(`[Jobs] Apify: success (${items.length} jobs retrieved)`);

      return items.map((j, idx) => {
        const title = j.positionName || j.title || 'Software Developer';
        const companyName = j.company || 'Tech Company';
        const jobLocation = j.location || normalizedCity || 'India';
        const description = j.description || 'Full job details available at source link.';
        const mode = determineWorkMode(title, jobLocation, description, j.jobSetting === 'remote');

        let detectedSkills = extractSkillsFromText(`${title} ${description}`);
        if (detectedSkills.length === 0) {
          detectedSkills = ['Engineering', 'Problem Solving'];
        }

        const applyUrl = j.externalApplyLink || j.url || 'Not available';
        const salary = j.salary || 'Not disclosed';
        const postedAt = j.postedAt || 'Recently';

        return {
          id: `apify_${j.id || Date.now()}_${idx}`,
          sourceJobId: `apify_${j.id || idx}`,
          title,
          company: companyName,
          location: jobLocation,
          employmentType: j.jobType ? (Array.isArray(j.jobType) ? j.jobType.join(', ') : j.jobType) : 'Full-time',
          workMode: mode,
          description,
          skills: detectedSkills,
          salary,
          applyUrl,
          source: 'Indeed via Apify',
          postedAt
        };
      });
    } catch (err) {
      console.log('[Jobs] Apify: failed', err.message);
      return [];
    }
  }

  // 3. The Muse Jobs Provider
  async fetchMuseJobs({ effectiveRole }) {
    if (!env.THE_MUSE_API_KEY) {
      console.log('[Jobs] TheMuse: failed (THE_MUSE_API_KEY missing)');
      return [];
    }

    try {
      const res = await axios.get('https://www.themuse.com/api/public/jobs', {
        params: {
          page: 1,
          category: 'Software Engineering',
          api_key: env.THE_MUSE_API_KEY
        },
        timeout: 10000
      });

      const results = res.data?.results || [];
      console.log(`[Jobs] TheMuse: success (${results.length} jobs retrieved)`);

      return results.map(j => {
        const title = j.name || 'Software Engineer';
        const companyName = j.company?.name || 'Technology Firm';
        const jobLocation = Array.isArray(j.locations) && j.locations.length > 0 ? j.locations.map(l => l.name).join(', ') : 'Remote / Hybrid';
        const description = (j.contents || '').replace(/<[^>]+>/g, ' ').slice(0, 500) || 'Job details available at link.';
        const isRemote = jobLocation.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');
        const mode = isRemote ? 'Remote' : determineWorkMode(title, jobLocation, description, false);

        let detectedSkills = extractSkillsFromText(`${title} ${description}`);
        if (detectedSkills.length === 0) {
          detectedSkills = ['Engineering', 'Problem Solving'];
        }

        const postedAt = j.publication_date ? new Date(j.publication_date).toLocaleDateString() : 'Recently';

        return {
          id: `muse_${j.id}`,
          sourceJobId: `muse_${j.id}`,
          title,
          company: companyName,
          location: jobLocation,
          employmentType: 'Full-time',
          workMode: mode,
          description,
          skills: detectedSkills,
          salary: 'Not disclosed',
          applyUrl: j.refs?.landing_page || 'Not available',
          source: 'The Muse',
          postedAt
        };
      });
    } catch (err) {
      console.log('[Jobs] TheMuse: failed', err.message);
      return [];
    }
  }

  // 4. Findwork Jobs Provider
  async fetchFindworkJobs({ effectiveRole, normalizedCity, workMode }) {
    if (!env.FINDWORK_API_KEY) return [];

    try {
      const params = {};
      if (effectiveRole) params.search = effectiveRole;
      if (normalizedCity && normalizedCity.toLowerCase() !== 'india' && normalizedCity.toLowerCase() !== 'remote') {
        params.location = normalizedCity;
      }
      if (workMode === 'Remote' || normalizedCity?.toLowerCase() === 'remote') {
        params.remote = 'true';
      }

      const res = await axios.get('https://findwork.dev/api/jobs/', {
        headers: { Authorization: `Token ${env.FINDWORK_API_KEY}` },
        params,
        timeout: 8000
      });

      const results = res.data?.results || [];
      return results.map(j => {
        const title = j.role || 'Developer';
        const companyName = j.company_name || 'Software Firm';
        const jobLocation = j.location || (j.remote ? 'Remote' : 'India');
        const description = j.text || 'Engineering job opportunity.';
        const mode = j.remote ? 'Remote' : determineWorkMode(title, jobLocation, description, false);

        let detectedSkills = Array.isArray(j.keywords) && j.keywords.length > 0 ? j.keywords : extractSkillsFromText(`${title} ${description}`);
        if (detectedSkills.length === 0) {
          detectedSkills = ['Problem Solving'];
        }

        const postedAt = j.date_posted ? new Date(j.date_posted).toLocaleDateString() : 'Recently';

        return {
          id: `fw_${j.id}`,
          sourceJobId: `fw_${j.id}`,
          title,
          company: companyName,
          location: jobLocation,
          employmentType: 'Full-time',
          workMode: mode,
          description,
          skills: detectedSkills,
          salary: 'Not disclosed',
          applyUrl: j.url || 'Not available',
          source: 'Findwork',
          postedAt
        };
      });
    } catch (err) {
      return [];
    }
  }

  // Main aggregator method
  async aggregateAll({ q, role, location, workMode, company } = {}) {
    const { queryTerms, effectiveRole, normalizedCity, normalizedFullLocation } = parseSearchAndLocation(q, location, role, company);

    console.log(`[Jobs] Searching: ${normalizedFullLocation || normalizedCity || effectiveRole || 'Software Engineer'}`);

    // Call providers with fallback support
    const [googleJobs, apifyJobs, museJobs, findworkJobs] = await Promise.all([
      this.fetchGoogleJobs({ effectiveRole, normalizedCity, normalizedFullLocation, workMode }),
      this.fetchApifyJobs({ effectiveRole, normalizedCity }),
      this.fetchMuseJobs({ effectiveRole }),
      this.fetchFindworkJobs({ effectiveRole, normalizedCity, workMode })
    ]);

    let combined = [];

    // Prioritize location-matched jobs first if a location was specified
    if (normalizedCity) {
      const locationMatched = [...googleJobs, ...apifyJobs, ...findworkJobs, ...museJobs].filter(j =>
        doesJobMatchLocation(j.location, j.title, normalizedCity)
      );

      if (locationMatched.length > 0) {
        combined = locationMatched;
      } else {
        // Fallback to all retrieved if location filter was very strict
        combined = [...googleJobs, ...apifyJobs, ...findworkJobs, ...museJobs];
      }
    } else {
      combined = [...googleJobs, ...apifyJobs, ...findworkJobs, ...museJobs];
    }

    console.log(`[Jobs] Total jobs before deduplication: ${combined.length}`);

    // Filter by workMode if specified
    if (workMode && workMode !== 'All') {
      const modeLower = workMode.toLowerCase();
      combined = combined.filter(j => j.workMode.toLowerCase() === modeLower);
    }

    // Deduplicate jobs by composite key: company + title + location
    const seen = new Set();
    const deduped = [];

    for (const j of combined) {
      const compKey = `${(j.company || '').trim().toLowerCase()}-${(j.title || '').trim().toLowerCase()}-${(j.location || '').trim().toLowerCase()}`;
      if (!seen.has(compKey)) {
        seen.add(compKey);
        deduped.push(j);
      }
    }

    console.log(`[Jobs] Total jobs after deduplication: ${deduped.length}`);

    // Persist real jobs asynchronously to MongoDB for caching
    for (const j of deduped) {
      Job.updateOne(
        { source: j.source, sourceJobId: j.sourceJobId },
        {
          $set: {
            title: j.title,
            company: j.company,
            location: j.location,
            workMode: j.workMode,
            description: j.description,
            skills: j.skills,
            salary: j.salary,
            applyUrl: j.applyUrl,
            postedAt: j.postedAt,
            fingerprint: `${j.company}-${j.title}-${j.location}`.toLowerCase().replace(/[^a-z0-9]/g, '-')
          }
        },
        { upsert: true }
      ).catch(() => {});
    }

    return deduped;
  }
}

module.exports = new JobAggregator();
