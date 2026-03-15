// vectorDb.js
// Handles embedding generation and simulated Pinecone/Weaviate/Chroma integration
// If API keys are missing, falls back to a 100% cloud-native Turso-based vector table.
const { pipeline } = require('@xenova/transformers');
const { db } = require('./db');

// Initialize local SQLite fallback vector DB table
async function initVectorSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vector_store (
      startup_id INTEGER PRIMARY KEY REFERENCES startups(id) ON DELETE CASCADE,
      text_content TEXT,
      embedding TEXT
    );
  `);
}

// Fire and forget schema init
initVectorSchema().catch(err => console.error("Vector Schema Init Failed:", err));

let extractor;
async function getExtractor() {
  if (!extractor) {
    console.log("Loading local ML embedding model (Xenova/all-MiniLM-L6-v2)...");
    try {
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    } catch (err) {
      console.error("Critical: Failed to load local ML embedding model.", err.message);
      throw new Error("Machine learning model failed to initialize.");
    }
  }
  return extractor;
}

async function computeEmbedding(text) {
  try {
    const getSim = await getExtractor();
    const output = await getSim(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.warn("Could not compute embedding. Ensure model cache is accessible.", error.message);
    return [];
  }
}

// Compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Store startup in Vector DB
async function upsertVector(startup) {
  const { id, name, description, brand_summary, potential_features, industry } = startup;
  
  // Also stringify tech and roles for semantic search
  const techRes = await db.execute({
    sql: "SELECT technology FROM tech_stack WHERE startup_id = ?",
    args: [id]
  });
  const techStack = techRes.rows.map(t => t.technology).join(", ");

  const jobRes = await db.execute({
    sql: "SELECT title FROM jobs WHERE startup_id = ?",
    args: [id]
  });
  const roles = jobRes.rows.map(j => j.title).join(", ");
  
  const textContent = `${name}. ${description || ''} ${brand_summary || ''}. Features: ${potential_features || ''}. Industry: ${industry || ''}. Tech: ${techStack}. Roles: ${roles}.`;
  
  const embedding = await computeEmbedding(textContent);
  if (!embedding || embedding.length === 0) return;
  
  await db.execute({
    sql: `
      INSERT INTO vector_store (startup_id, text_content, embedding)
      VALUES (?, ?, ?)
      ON CONFLICT(startup_id) DO UPDATE SET text_content=excluded.text_content, embedding=excluded.embedding
    `,
    args: [id, textContent, JSON.stringify(embedding)]
  });
  
  console.log(`🧠 Synced vector for ${name}`);
}

async function vectorSearch(queryText, topK = 5) {
  const queryEmbedding = await computeEmbedding(queryText);
  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to compute query embedding. The local ML model may be offline, failing to download, or missing.");
  }
  
  const res = await db.execute("SELECT startup_id, embedding FROM vector_store");
  const vectors = res.rows;
  
  const scored = vectors.map(v => {
    let dbVec;
    try {
      dbVec = JSON.parse(v.embedding);
    } catch(e) { return { startup_id: v.startup_id, score: 0 }; }
    
    return {
      startup_id: v.startup_id,
      score: cosineSimilarity(queryEmbedding, dbVec)
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

module.exports = { upsertVector, vectorSearch };
