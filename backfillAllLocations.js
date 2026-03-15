require('dotenv').config();
const { db } = require('./db');
const { findLocationForStartup, geocodeLocation } = require('./agents');

async function backfillAll() {
  console.log('🌍 Starting Deep Spatial Backfill...');
  
  const res = await db.execute('SELECT * FROM startups WHERE location IS NULL OR latitude IS NULL');
  const startups = res.rows;
  console.log(`📍 Processing ${startups.length} startups...`);

  for (const s of startups) {
    let location = s.location;
    
    // 1. If location is missing, infer it using AI
    if (!location) {
      console.log(`🔎 Inferring location for ${s.name}...`);
      location = await findLocationForStartup(s.name, s.description || '');
      if (location) {
        await db.execute({
          sql: 'UPDATE startups SET location = ? WHERE id = ?',
          args: [location, s.id]
        });
        console.log(`   ✨ Inferred: ${location}`);
      }
    }

    // 2. Geocode the location to coordinates
    if (location && (!s.latitude || !s.longitude)) {
      console.log(`🌍 Geocoding ${location} for ${s.name}...`);
      const coords = await geocodeLocation(location);
      if (coords && coords.lat && coords.lng) {
        await db.execute({
          sql: 'UPDATE startups SET latitude = ?, longitude = ? WHERE id = ?',
          args: [coords.lat, coords.lng, s.id]
        });
        console.log(`   ✅ Plotted at: ${coords.lat}, ${coords.lng}`);
      }
    }
    
    // Smooth progress output
    process.stdout.write('.');
  }

  console.log('\n✨ All startups have been spatially activated on the globe.');
  process.exit(0);
}

backfillAll().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
