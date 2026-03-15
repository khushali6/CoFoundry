const express = require('express');
const cors = require('cors');
const { getAllStartups, filterByTech, db } = require('./db');
const { vectorSearch } = require('./vectorDb');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Global Exception Handlers to keep server alive
process.on('uncaughtException', (err) => {
  console.error("Critical Uncaught Exception:", err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled Promise Rejection:", reason);
});

// Main API endpoint to get startups
app.get('/api/startups', async (req, res) => {
  try {
    const { tech } = req.query;
    if (tech) {
      const filtered = await filterByTech(tech);
      return res.json(filtered);
    }
    const allStartups = await getAllStartups();
    res.json(allStartups);
  } catch (error) {
    console.error("Error fetching startups:", error);
    res.status(500).json({ error: "Failed to fetch startups" });
  }
});

// NL Vector Search Endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    console.log(`🧠 Semantic Search Query: "${q}"`);
    
    // Perform vector search
    const matches = await vectorSearch(q, 10);
    
    // Map IDs to startup objects
    const allStartups = await getAllStartups();
    const results = matches.map(m => {
      const s = allStartups.find(s => s.id === m.startup_id);
      return { ...s, similarity_score: m.score };
    }).filter(s => s.id); // Filter out missing ones
    
    res.json(results);
  } catch (err) {
    console.error("Vector search failed:", err);
    res.status(500).json({ error: "Failed vector search" });
  }
});

// Analytics Dashboard Endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    // Top Technologies
    const techRes = await db.execute("SELECT technology as name, COUNT(*) as count FROM tech_stack GROUP BY LOWER(technology) ORDER BY count DESC LIMIT 25");
    const techCounts = techRes.rows;
    
    // Source breakdown
    const sourceRes = await db.execute("SELECT source as name, COUNT(*) as count FROM startups GROUP BY source ORDER BY count DESC");
    const sourceCounts = sourceRes.rows;
    
    // Startup Locations
    const locationRes = await db.execute("SELECT location as name, COUNT(*) as count FROM startups WHERE location IS NOT NULL AND location != '' GROUP BY location ORDER BY count DESC LIMIT 15");
    const startupLocationCounts = locationRes.rows;
    
    res.json({
      technologies: techCounts,
      sources: sourceCounts,
      startupLocations: startupLocationCounts
    });
  } catch (err) {
    console.error("Analytics query failed:", err);
    res.status(500).json({ error: "Analytics query failed" });
  }
});

// Start the backend server
app.listen(PORT, () => {
  console.log(`🚀 TinyFish backend is running on http://localhost:${PORT}`);
});
