/**
 * db.js
 * Cloud-native database layer using @libsql/client (Turso/libSQL).
 * Supports both local SQLite files and remote Turso cloud databases.
 * 
 * Install: npm install @libsql/client
 */

const { createClient } = require("@libsql/client");
const path = require("path");

// libSQL requires 'file:' prefix for local databases
const localPath = path.join(__dirname, "startups2.db");
const url = process.env.TURSO_DATABASE_URL || `file:${localPath}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url,
  authToken,
});

// Initialize Schema
async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS startups (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      description TEXT,
      website     TEXT,
      source      TEXT,
      industry    TEXT,
      funding     TEXT,
      brand_summary TEXT,
      potential_features TEXT,
      market_insight TEXT,
      location    TEXT,
      logo_url    TEXT,
      latitude    REAL,
      longitude   REAL,
      batch       TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tech_stack (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
      technology TEXT,
      category   TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
      title      TEXT,
      location   TEXT,
      seniority  TEXT,
      salary     TEXT,
      apply_link TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS employees (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
      name       TEXT,
      role       TEXT,
      linkedin   TEXT
    );
  `);

  // Handle migrations (ALTER TABLE is idempotent if we use try/catch or check columns, 
  // but libsql doesn't support PRAGMA table_info easily without async. We'll use try/catch for simplicity).
  const columns = ["brand_summary", "potential_features", "market_insight", "location", "logo_url", "latitude", "longitude", "batch"];
  for (const col of columns) {
    try {
      const type = (col === "latitude" || col === "longitude") ? "REAL" : "TEXT";
      await db.execute(`ALTER TABLE startups ADD COLUMN ${col} ${type}`);
    } catch (e) {
      // Ignored: Column likely exists
    }
  }
}

// Kick off initialization
initSchema().catch(err => console.error("Database Init Failed:", err));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Upsert a startup. Returns the startup row id.
 */
async function upsertStartup(input) {
  const params = {
    name: String(input.name || ""),
    description: input.description ? String(input.description) : null,
    website: input.website ? String(input.website) : null,
    source: input.source ? String(input.source) : null,
    industry: input.industry ? String(input.industry) : null,
    funding: input.funding ? String(input.funding) : null,
    brand_summary: input.brand_summary ? String(input.brand_summary) : null,
    potential_features: input.potential_features ? String(input.potential_features) : null,
    market_insight: input.market_insight ? String(input.market_insight) : null,
    location: input.location ? String(input.location) : null,
    logo_url: input.logo_url ? String(input.logo_url) : null,
    latitude: typeof input.latitude === 'number' ? input.latitude : null,
    longitude: typeof input.longitude === 'number' ? input.longitude : null,
    batch: input.batch ? String(input.batch) : null,
  };

  const existingRes = await db.execute({
    sql: "SELECT id FROM startups WHERE name = ?",
    args: [params.name]
  });
  
  const existing = existingRes.rows[0];

  if (existing) {
    await db.execute({
      sql: `
        UPDATE startups SET 
          description = ?, 
          website = ?, 
          source = ?, 
          industry = ?, 
          funding = ?, 
          brand_summary = ?, 
          potential_features = ?, 
          market_insight = ?, 
          location = ?, 
          logo_url = ?, 
          latitude = ?, 
          longitude = ?, 
          batch = ?
        WHERE id = ?
      `,
      args: [
        params.description, params.website, params.source, params.industry, 
        params.funding, params.brand_summary, params.potential_features, 
        params.market_insight, params.location, params.logo_url, 
        params.latitude, params.longitude, params.batch, existing.id
      ]
    });
    return Number(existing.id);
  }
  
  const insertRes = await db.execute({
    sql: `
      INSERT INTO startups (
        name, description, website, source, industry, funding, 
        brand_summary, potential_features, market_insight, 
        location, logo_url, latitude, longitude, batch
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      params.name, params.description, params.website, params.source, 
      params.industry, params.funding, params.brand_summary, 
      params.potential_features, params.market_insight, params.location, 
      params.logo_url, params.latitude, params.longitude, params.batch
    ]
  });
  
  return Number(insertRes.lastInsertRowid);
}

/** Replace all tech stack entries for a startup. */
async function setTechStack(startupId, technologies = []) {
  await db.execute({
    sql: "DELETE FROM tech_stack WHERE startup_id = ?",
    args: [startupId]
  });
  
  for (const t of technologies) {
    await db.execute({
      sql: "INSERT INTO tech_stack (startup_id, technology, category) VALUES (?, ?, ?)",
      args: [startupId, t.technology ?? t, t.category ?? "general"]
    });
  }
}

/** Replace all job entries for a startup. */
async function setJobs(startupId, jobs = []) {
  await db.execute({
    sql: "DELETE FROM jobs WHERE startup_id = ?",
    args: [startupId]
  });
  
  for (const j of jobs) {
    await db.execute({
      sql: `
        INSERT INTO jobs (startup_id, title, location, seniority, salary, apply_link)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [startupId, j.title, j.location, j.seniority, j.salary, j.apply_link ?? j.applyLink]
    });
  }
}

/** Replace all employee entries for a startup. */
async function setEmployees(startupId, employees = []) {
  await db.execute({
    sql: "DELETE FROM employees WHERE startup_id = ?",
    args: [startupId]
  });
  
  for (const e of employees) {
    await db.execute({
      sql: "INSERT INTO employees (startup_id, name, role, linkedin) VALUES (?, ?, ?, ?)",
      args: [startupId, e.name, e.role, e.linkedin]
    });
  }
}

/** Get all startups with their stack, jobs, and employees joined. */
async function getAllStartups() {
  const startupsRes = await db.execute("SELECT * FROM startups ORDER BY created_at DESC");
  const startups = startupsRes.rows;

  return await Promise.all(startups.map(async s => {
    const techStack = await db.execute({
      sql: "SELECT technology, category FROM tech_stack WHERE startup_id = ?",
      args: [s.id]
    });
    const jobs = await db.execute({
      sql: "SELECT * FROM jobs WHERE startup_id = ?",
      args: [s.id]
    });
    const employees = await db.execute({
      sql: "SELECT * FROM employees WHERE startup_id = ?",
      args: [s.id]
    });

    return {
      ...s,
      techStack: techStack.rows,
      jobs: jobs.rows,
      employees: employees.rows,
    };
  }));
}

/** Filter startups that use a given technology. */
async function filterByTech(technology) {
  const idsRes = await db.execute({
    sql: `
      SELECT DISTINCT startup_id FROM tech_stack
      WHERE lower(technology) LIKE lower(?)
    `,
    args: [`%${technology}%`]
  });
  
  const ids = idsRes.rows.map(r => r.startup_id);

  return await Promise.all(ids.map(async id => {
    const sRes = await db.execute({
      sql: "SELECT * FROM startups WHERE id = ?",
      args: [id]
    });
    const s = sRes.rows[0];

    const techStack = await db.execute({
      sql: "SELECT technology, category FROM tech_stack WHERE startup_id = ?",
      args: [id]
    });
    const jobs = await db.execute({
      sql: "SELECT * FROM jobs WHERE startup_id = ?",
      args: [id]
    });
    const employees = await db.execute({
      sql: "SELECT * FROM employees WHERE startup_id = ?",
      args: [id]
    });

    return {
      ...s,
      techStack: techStack.rows,
      jobs: jobs.rows,
      employees: employees.rows,
    };
  }));
}

module.exports = { upsertStartup, setTechStack, setJobs, setEmployees, getAllStartups, filterByTech, db };
