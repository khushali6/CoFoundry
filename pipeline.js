/**
 * pipeline.js
 * Full startup intelligence pipeline:
 *   1. Discover startups from configured sources
 *   2. Detect tech stacks
 *   3. Find open roles
 *   4. Find team members
 *   5. Store everything in SQLite
 *   6. Print a rich summary with outreach messages ready
 *
 * Usage:
 *   TINYFISH_API_KEY=sk-tinyfish-... node pipeline.js
 *
 * Options (edit CONFIG below or use env vars):
 *   SOURCES     - comma-separated: producthunt,yc,crunchbase
 *   TECH_FILTER - comma-separated tech to filter by e.g. "React,Node.js"
 */

require("dotenv").config();                    // optional: npm install dotenv
const { scrapeProductHunt, scrapeYCombinator, scrunchbase,
        detectTechStack, scrapeJobs, scrapeTeam, generateMarketInsight, geocodeLocation } = require("./agents");
const { upsertStartup, setTechStack, setJobs,
        setEmployees, getAllStartups, filterByTech, db } = require("./db");
const { generateOutreachForStartup } = require("./outreach");
const { upsertVector } = require("./vectorDb");
const { syncToGraph } = require("./graphDb");

// ── Configuration ─────────────────────────────────────────────────────────────

const CONFIG = {
  sources: (process.env.SOURCES ?? "yc").split(",").map(s => s.trim()),
  ycBatch: process.env.YC_BATCH ?? "W25",
  techFilter: process.env.TECH_FILTER ? process.env.TECH_FILTER.split(",").map(s => s.trim()) : [],

  // Your own profile for outreach generation
  sender: {
    name:   process.env.SENDER_NAME  ?? "[Your Name]",
    role:   process.env.SENDER_ROLE  ?? "Software Engineer",
    skills: (process.env.SENDER_SKILLS ?? "React,Node.js,Python").split(",").map(s => s.trim()),
  },

  // Set to false to skip slow per-startup enrichment during dev
  enrichTechStack: process.env.ENRICH_TECH  !== "false",
  enrichJobs:      process.env.ENRICH_JOBS  !== "false",
  enrichTeam:      process.env.ENRICH_TEAM  !== "false",
};

// ── Source Scrapers ───────────────────────────────────────────────────────────

async function discoverStartups() {
  const all = [];
  for (const source of CONFIG.sources) {
    try {
      let startups = [];
      if (source === "producthunt") startups = await scrapeProductHunt({ onProgress: p => process.stdout.write(`.`) });
      if (source === "yc")          startups = await scrapeYCombinator({ batch: CONFIG.ycBatch, onProgress: p => process.stdout.write(`.`) });
      if (source === "crunchbase")  startups = await scrunchbase({ onProgress: p => process.stdout.write(`.`) });
      console.log(`\n✅ ${source}: found ${startups.length} startups`);
      all.push(...startups);
    } catch (err) {
      console.error(`\n❌ Failed to scrape ${source}: ${err.message}`);
    }
  }
  return all;
}

// ── Enrichment ────────────────────────────────────────────────────────────────

async function enrichStartup(startup) {
  const opts = { onProgress: () => process.stdout.write(".") };
  const [techStack, jobs, employees] = await Promise.all([
    CONFIG.enrichTechStack ? detectTechStack(startup.website, opts) : Promise.resolve([]),
    CONFIG.enrichJobs      ? scrapeJobs(startup.website, startup.name, opts) : Promise.resolve([]),
    CONFIG.enrichTeam      ? scrapeTeam(startup.website, startup.name, opts) : Promise.resolve([]),
  ]);
  return { techStack, jobs, employees };
}

// ── Display ───────────────────────────────────────────────────────────────────

function printStartupCard(startup, messages = []) {
  const line = "─".repeat(60);
  console.log(`\n${line}`);
  console.log(`🚀  ${startup.name}  [${startup.source}]`);
  if (startup.description) console.log(`    ${startup.description}`);
  if (startup.brand_summary) console.log(`    📝 Summary: ${startup.brand_summary}`);
  if (startup.potential_features) console.log(`    ✨ Ideas: ${startup.potential_features}`);
  if (startup.market_insight) console.log(`    🧠 Intelligence: ${startup.market_insight}`);
  if (startup.website)     console.log(`    🌐 ${startup.website}`);
  if (startup.industry)    console.log(`    🏷  ${startup.industry}`);
  if (startup.funding)     console.log(`    💰 ${startup.funding}`);

  if (startup.techStack?.length) {
    console.log(`\n    🔧 Tech Stack:`);
    startup.techStack.forEach(t => console.log(`       • ${t.technology} (${t.category})`));
  }

  if (startup.jobs?.length) {
    console.log(`\n    💼 Open Roles:`);
    startup.jobs.forEach(j => console.log(`       • ${j.title} — ${j.location ?? "?"}${j.apply_link ? ` → ${j.apply_link}` : ""}`));
  }

  if (startup.employees?.length) {
    console.log(`\n    👥 Team:`);
    startup.employees.forEach(e => console.log(`       • ${e.name} (${e.role})${e.linkedin ? ` → ${e.linkedin}` : ""}`));
  }

  if (messages.length) {
    console.log(`\n    ✉️  Outreach Messages:`);
    messages.forEach(({ person, message }) => {
      console.log(`\n    --- To: ${person.name} (${person.role}) ---`);
      console.log(message.split("\n").map(l => "    " + l).join("\n"));
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═".repeat(60));
  console.log("  🐟 Startup Intelligence Pipeline  ");
  console.log("═".repeat(60));
  console.log(`Sources:    ${CONFIG.sources.join(", ")}`);
  console.log(`Tech filter: ${CONFIG.techFilter.length ? CONFIG.techFilter.join(", ") : "none (show all)"}`);
  console.log(`Sender:     ${CONFIG.sender.name} | ${CONFIG.sender.role}`);
  console.log("");

  // 1. Discover
  let raw = await discoverStartups();
  raw.reverse(); // Latest first (if scraper returns oldest first)
  console.log(`\n📦 Total discovered: ${raw.length} startups\n`);

  // 2. Store + enrich each startup
  for (const startup of raw) {
    if (CONFIG.enrichTechStack || CONFIG.enrichJobs || CONFIG.enrichTeam) {
      process.stdout.write(`Enriching ${startup.name} `);
      const { techStack, jobs, employees } = await enrichStartup(startup);
      
      // Market Intelligence pass
      const market_insight = await generateMarketInsight({ ...startup, techStack });
      
      // Geocoding pass (Safe now with db.js sanitization)
      let coords = { lat: null, lng: null };
      if (startup.location) {
        coords = await geocodeLocation(startup.location) || coords;
      }
      
      const completeStartup = { 
        ...startup, 
        techStack, 
        jobs, 
        employees, 
        market_insight,
        latitude: coords.lat,
        longitude: coords.lng,
        batch: startup.batch // Syncing batch from discovery
      };
      
      const id = await upsertStartup(completeStartup);

      await setTechStack(id, techStack);
      await setJobs(id, jobs);
      await setEmployees(id, employees);
      
      await upsertVector({ ...completeStartup, id });
      await syncToGraph({ ...completeStartup, id });
      console.log(" ✓");
    } else {
      const id = await upsertStartup(startup);
      await upsertVector({ ...startup, id, techStack: [], jobs: [], employees: [] });
      await syncToGraph({ ...startup, id, techStack: [], jobs: [], employees: [] });
    }
  }

  // 3. Query & display
  let results;
  if (CONFIG.techFilter.length) {
    results = [];
    for (const tech of CONFIG.techFilter) {
      const matches = await filterByTech(tech);
      results.push(...matches.filter(s => !results.find(r => r.id === s.id)));
    }
    console.log(`\n🔍 Filtered to ${results.length} startups using: ${CONFIG.techFilter.join(", ")}`);
  } else {
    results = await getAllStartups();
  }

  // 4. Print cards + outreach
  for (const startup of results) {
    const messages = generateOutreachForStartup(startup, CONFIG.sender);
    printStartupCard(startup, messages);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Done. ${results.length} startups ready. Database: startups.db`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
