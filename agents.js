/**
 * agents.js
 * TinyFish-powered scraping agents for startup intelligence.
 * Each agent targets a specific source and returns normalized data.
 */

const { runAgent } = require("./tinyfishClient");
const { localGeocode } = require("./geocoder");

// ── Product Hunt ─────────────────────────────────────────────────────────────

/**
 * Scrape today's top launches from Product Hunt.
 * @returns {Promise<Array>} Array of startup objects
 */
async function scrapeProductHunt({ onProgress } = {}) {
  console.log("🔍 Scraping Product Hunt...");

  const result = await runAgent({
    url: "https://www.producthunt.com",
    goal: `Extract today's featured product launches. For each product return a JSON array with:
      name, tagline (as description), website, upvotes (as funding proxy), topics (as industry array).
      Respond ONLY with a JSON object: { "startups": [...] }`,
    browserProfile: "stealth",
    onProgress,
  });

  return (result.startups ?? []).map(s => ({
    ...s,
    source: "Product Hunt",
    industry: Array.isArray(s.topics) ? s.topics.join(", ") : (s.industry ?? ""),
  }));
}

// ── Y Combinator ─────────────────────────────────────────────────────────────

/**
 * Scrape companies from the YC company directory.
 * @returns {Promise<Array>} Array of startup objects
 */
async function scrapeYCombinator({ batch = "", onProgress } = {}) {
  console.log(`🔍 Scraping Y Combinator...`);

  const result = await runAgent({
    url: `https://www.ycombinator.com/companies`,
    goal: `Extract as many companies as possible from the current batch.
      For each return a JSON array with:
      name, description (one-line tagline), website, industry (YC vertical/tag), 
      logo_url (find the <img> src in the company logo header or card), 
      location (look for text like "San Francisco, CA" or "Remote"),
      batch (look for the YC batch badge like "W25", "S24", or "S19"),
      brand_summary, potential_features.
      Ensure the logo_url is the full path if possible.
      Respond ONLY with: { "startups": [...] }`,
    browserProfile: "stealth",
    onProgress,
  });

  return (result.startups ?? []).map(s => ({
    ...s,
    source: "Y Combinator",
    funding: "YC",
  }));
}

// ── Crunchbase ────────────────────────────────────────────────────────────────

/**
 * Scrape recently funded startups from Crunchbase's trending page.
 * @returns {Promise<Array>} Array of startup objects
 */
async function scrunchbase({ onProgress } = {}) {
  console.log("🔍 Scraping Crunchbase trending...");

  const result = await runAgent({
    url: "https://www.crunchbase.com/discover/organization.companies",
    goal: `Extract the first 15 companies shown. For each return:
      name, description, website, funding_stage, industry.
      Respond ONLY with: { "startups": [...] }`,
    browserProfile: "stealth",
    onProgress,
  });

  return (result.startups ?? []).map(s => ({
    ...s,
    source: "Crunchbase",
    funding: s.funding_stage ?? s.funding,
  }));
}

// ── Tech Stack Detection ──────────────────────────────────────────────────────

/**
 * Detect the tech stack used by a startup's website.
 * @param {string} website - URL of the startup's website
 * @returns {Promise<Array>} Array of { technology, category } objects
 */
async function detectTechStack(website, { onProgress } = {}) {
  if (!website) return [];
  console.log(`🔧 Detecting tech stack for ${website}...`);

  try {
    const result = await runAgent({
      url: website,
      goal: `Analyze this website and detect the technologies used.
        Look for frontend frameworks, backend hints, analytics, hosting, databases, and APIs.
        Respond ONLY with: { "technologies": [{ "technology": "...", "category": "frontend|backend|database|cloud|analytics|other" }] }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result.technologies ?? [];
  } catch (err) {
    console.warn(`  ⚠️  Could not detect stack for ${website}: ${err.message}`);
    return [];
  }
}

// ── Job Listings ──────────────────────────────────────────────────────────────

/**
 * Find open job listings at a startup via YCombinator.
 * @param {string} website - URL of the startup's website
 * @param {string} startupName - Name used to focus the search
 * @returns {Promise<Array>} Array of job objects
 */
async function scrapeJobs(website, startupName, { onProgress } = {}) {
  if (!startupName) return [];
  const slug = startupName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const url = `https://www.ycombinator.com/companies/${slug}/jobs`;
  console.log(`💼 Looking for jobs for ${startupName} at ${url}...`);

  try {
    const result = await runAgent({
      url,
      goal: `Navigate the YC jobs page for this company.
        Extract all open positions. For each return:
        title, location (or "Remote"), seniority (if visible), salary (if visible), apply_link.
        Respond ONLY with: { "jobs": [...] }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result.jobs ?? [];
  } catch (err) {
    console.warn(`  ⚠️  Could not scrape jobs for ${startupName}: ${err.message}`);
    return [];
  }
}

// ── Employee / Founder Discovery ──────────────────────────────────────────────

/**
 * Find key team members listed on the startup's website or YC profile.
 * @param {string} website - URL of the startup's website
 * @param {string} startupName - For logging
 * @returns {Promise<Array>} Array of { name, role, linkedin } objects
 */
async function scrapeTeam(website, startupName, { onProgress } = {}) {
  if (!startupName) return [];
  const slug = startupName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const url = `https://www.ycombinator.com/companies/${slug}`;
  console.log(`👥 Finding team for ${startupName} at ${url}...`);

  try {
    const result = await runAgent({
      url,
      goal: `Look at this YC company profile. Extract the founders and key employees.
        FOUNDER DETECTION: Explicitly identify if someone is a "Founder" or "Co-Founder" and ensure that exact term is in their role.
        For each person return: name, role/title, and especially linkedin (find the LinkedIn URL for the founders, usually in a bio or social icon link).
        Respond ONLY with: { "employees": [...] }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result.employees ?? [];
  } catch (err) {
    console.warn(`  ⚠️  Could not scrape team for ${startupName}: ${err.message}`);
    return [];
  }
}

/**
 * Market Intelligence Agent: Analyze startup data to generate strategic insights.
 */
async function generateMarketInsight(startup, { onProgress } = {}) {
  const { name, description, industry, techStack } = startup;
  console.log(`🧠 Generating Market Intelligence for ${name}...`);

  const techText = techStack?.map(t => t.technology).join(", ") || "No tech detected";
  
  try {
    const result = await runAgent({
      url: startup.website || "https://www.google.com/search?q=" + encodeURIComponent(name),
      goal: `You are a Tier-1 Venture Capital Analyst. Analyze this startup:
        Name: ${name}
        Description: ${description}
        Industry: ${industry}
        Tech: ${techText}

        Task: Provide a high-density strategic "Market Intelligence" summary.
        Include:
        1. Strategic Unique Value Proposition (UVP).
        2. Potential Market Pitfalls or Technical Risks.
        3. Potential Competitors (Direct or Indirect).

        Format: Provide a concise, professional 3-4 sentence paragraph.
        Respond ONLY with: { "insight": "..." }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result.insight ?? "No strategic insight generated.";
  } catch (err) {
    console.warn(`  ⚠️ Insight generation failed for ${startup.name}: ${err.message}`);
    return null;
  }
}

/**
 * Location Discovery Agent: Find HQ location from name and description.
 */
async function findLocationForStartup(name, description, { onProgress } = {}) {
  console.log(`🔎 Finding location for: ${name}...`);
  try {
    const result = await runAgent({
      url: `https://www.google.com/search?q=${encodeURIComponent(name + " startup headquarters location")}`,
      goal: `Research where this startup is headquartered.
        Name: ${name}
        Description: ${description}
        
        Task: Identify the City and State/Country.
        Respond ONLY with: { "location": "City, State/Country" }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result.location;
  } catch (err) {
    console.warn(`  ⚠️ Location discovery failed for ${name}: ${err.message}`);
    return null;
  }
}

/**
 * Geocoding Agent: Approximate lat/lng from a location string.
 */
async function geocodeLocation(locationStr, { onProgress } = {}) {
  if (!locationStr) return null;
  
  // 1. Try local cache/common hubs first (faster, saves credits)
  const local = localGeocode(locationStr);
  if (local) {
    console.log(`🌍 Local geocode found for: ${locationStr}`);
    return local;
  }

  console.log(`🌍 Geocoding: ${locationStr}...`);

  try {
    const result = await runAgent({
      url: `https://www.google.com/maps/search/${encodeURIComponent(locationStr)}`,
      goal: `Geocode this location precisely.
        Location: ${locationStr}
        
        Task: Provide the latitude and longitude.
        Respond ONLY with: { "lat": number, "lng": number }`,
      browserProfile: "stealth",
      onProgress,
    });
    return result;
  } catch (err) {
    console.warn(`  ⚠️ Geocoding failed for ${locationStr}: ${err.message}`);
    return null;
  }
}

module.exports = {
  scrapeProductHunt,
  scrapeYCombinator,
  scrunchbase,
  detectTechStack,
  scrapeJobs,
  scrapeTeam,
  generateMarketInsight,
  geocodeLocation,
  findLocationForStartup,
};
