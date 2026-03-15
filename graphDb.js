// graphDb.js
// Handles multi-node Graph relations using Turso (libSQL).
// Permanent, free, and cloud-native persistence.
const { db } = require('./db');

/**
 * Initialize Graph Tables in Turso.
 */
async function initGraphSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS graph_nodes (
      id TEXT PRIMARY KEY,
      type TEXT,
      name TEXT,
      metadata TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS graph_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "from" TEXT REFERENCES graph_nodes(id) ON DELETE CASCADE,
      "to" TEXT REFERENCES graph_nodes(id) ON DELETE CASCADE,
      type TEXT,
      UNIQUE("from", "to", type)
    );
  `);
}

// Initialize on load
initGraphSchema().catch(err => console.error("Graph Schema Init Failed:", err));

async function upsertNode(id, type, name, metadata = {}) {
  await db.execute({
    sql: `
      INSERT INTO graph_nodes (id, type, name, metadata)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, metadata=excluded.metadata
    `,
    args: [id, type, name, JSON.stringify(metadata)]
  });
}

async function upsertEdge(from, to, type) {
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO graph_edges ("from", "to", type) VALUES (?, ?, ?)`,
      args: [from, to, type]
    });
  } catch (e) {
    // Ignore unique constraint errors
  }
}

async function syncToGraph(startup) {
  const { name, source, industry, brand_summary, techStack, employees } = startup;
  const sNodeId = `s_${startup.id}`;

  // 1. Upsert Startup Node
  await upsertNode(sNodeId, 'Startup', name, {
    industry: industry || "",
    source: source || "",
    summary: brand_summary || ""
  });

  // 2. Upsert Tech Nodes & USES_TECH edges
  if (techStack && techStack.length > 0) {
    for (const t of techStack) {
      const techName = t.technology || t;
      const tNodeId = `t_${techName.toLowerCase().replace(/\s+/g, '_')}`;
      
      await upsertNode(tNodeId, 'Technology', techName);
      await upsertEdge(sNodeId, tNodeId, 'USES_TECH');
    }
  }

  // 3. Upsert Person Nodes & WORKS_AT edges
  if (employees && employees.length > 0) {
    for (const e of employees) {
      if (!e.name) continue;
      const pNodeId = `p_${e.name.toLowerCase().replace(/\s+/g, '_')}`;
      
      await upsertNode(pNodeId, 'Person', e.name, {
        role: e.role || "",
        linkedin: e.linkedin || ""
      });
      await upsertEdge(pNodeId, sNodeId, 'WORKS_AT');
    }
  }

  console.log(`📂 Cloud Graph: Synced relations for ${name}`);
}

module.exports = { syncToGraph };
