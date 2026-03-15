const { getAllStartups } = require("./db");
const fs = require("fs");
const path = require("path");

async function exportJson() {
  console.log("📑 Exporting database to static JSON...");
  try {
    const startups = await getAllStartups();
    console.log(`✅ Loaded ${startups.length} startups.`);

    const targetDir = path.join(__dirname, "frontend", "public");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, "data.json");
    fs.writeFileSync(targetPath, JSON.stringify(startups, null, 2));

    console.log(`🎉 Successfully exported data to: ${targetPath}`);
    console.log("\n👉 Next steps:");
    console.log("1. Set VITE_STATIC_MODE=true in your frontend environment.");
    console.log("2. Deploy your 'frontend' folder to Vercel/Netlify.");
  } catch (err) {
    console.error("❌ Export failed:", err);
    process.exit(1);
  }
}

exportJson();
