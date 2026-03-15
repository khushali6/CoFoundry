# 🐟 Startup Intelligence — TinyFish Web Agent Integration

Startup discovery + hiring radar powered by the [TinyFish Web Agent API](https://docs.tinyfish.ai).

## What it does

| Step | What happens |
|------|-------------|
| **Discover** | Scrapes Product Hunt, Y Combinator, and/or Crunchbase for new startups |
| **Enrich** | Visits each startup's website to detect their tech stack |
| **Jobs** | Navigates to the startup's careers page and extracts open roles |
| **Team** | Finds founders and key employees (+ LinkedIn URLs) |
| **Store** | Saves everything to a local SQLite database (`startups.db`) |
| **Outreach** | Auto-generates personalized LinkedIn/email messages per person |

---

## Project structure

```
tinyfishClient.js   ← Reusable TinyFish SSE streaming client
agents.js           ← Per-source scrapers + enrichment agents
db.js               ← SQLite storage (better-sqlite3)
outreach.js         ← Personalized message generator
pipeline.js         ← Main orchestrator — run this
.env.example        ← Copy to .env and fill in your keys
package.json
```

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure your environment
cp .env.example .env
# Edit .env — paste in your TINYFISH_API_KEY and sender profile

# 3. Run the full pipeline
node pipeline.js
```

---

## Usage examples

```bash
# Scrape only Product Hunt today
SOURCES=producthunt node pipeline.js

# Scrape YC W25 batch
SOURCES=yc YC_BATCH=W25 node pipeline.js

# Scrape all sources and filter to AI/Python startups only
SOURCES=producthunt,yc,crunchbase TECH_FILTER=AI,Python node pipeline.js

# Quick dev run (skip slow per-site enrichment)
ENRICH_TECH=false ENRICH_JOBS=false ENRICH_TEAM=false node pipeline.js
```

Or use the npm scripts:

```bash
npm run scrape:ph        # Product Hunt only
npm run scrape:yc        # Y Combinator only
npm run scrape:all       # All three sources
npm run filter:react     # Only React startups
npm run filter:ai        # Only AI/Python startups
```

---

## Sample output

```
────────────────────────────────────────────────────────────
🚀  AIHealth  [Product Hunt]
    AI diagnostics platform for clinics
    🌐 aihealth.com
    🏷  Health, AI/ML
    💰 Seed

    🔧 Tech Stack:
       • React (frontend)
       • Node.js (backend)
       • PostgreSQL (database)
       • AWS (cloud)

    💼 Open Roles:
       • Backend Engineer — Remote → https://aihealth.com/careers/backend
       • ML Engineer — Remote → https://aihealth.com/careers/ml

    👥 Team:
       • Sarah Chen (CTO) → linkedin.com/in/sarahchen
       • James Park (CEO) → linkedin.com/in/jamespark

    ✉️  Outreach Messages:

    --- To: Sarah Chen (CTO) ---
    Hi Sarah,

    I came across AIHealth on Product Hunt and was immediately drawn to
    what you're building — ai diagnostics platform for clinics.

    As a Full-Stack Engineer with experience in React, Node.js, Python,
    I'd love to contribute to your team. I noticed you're building with
    React, Node.js, PostgreSQL — areas I work in extensively.

    Would you be open to a quick 15-minute conversation?

    Best,
    Jane Doe
```

---

## Using the modules independently

```js
const { runAgent }          = require("./tinyfishClient");
const { detectTechStack }   = require("./agents");
const { getAllStartups }     = require("./db");
const { generateOutreachMessage } = require("./outreach");

// Custom one-off scrape
const result = await runAgent({
  url: "https://somesite.com",
  goal: "Extract the founding team names and roles. Respond in JSON.",
  browserProfile: "stealth",
  onProgress: msg => console.log("  →", msg),
});

// Generate a single outreach message
const msg = generateOutreachMessage({
  startup:   { name: "AIHealth", description: "AI diagnostics", source: "Product Hunt" },
  person:    { name: "Sarah Chen", role: "CTO" },
  techStack: [{ technology: "React" }, { technology: "Node.js" }],
  sender:    { name: "Jane", role: "Engineer", skills: ["React", "Node.js"] },
});
console.log(msg);
```

---

## ⚠️ Notes on LinkedIn

Automating actions on LinkedIn (scraping, auto-messaging) violates their ToS.
This tool **shows** LinkedIn profile URLs and **generates** outreach text — you send the message manually. That's intentional.

---

## Requirements

- Node.js ≥ 18 (uses native `fetch`)
- TinyFish API key → [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)
