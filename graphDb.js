// graphDb.js
// Handles multi-node Graph relations locally using a JSON file.
// Permanent, free, and zero-cloud dependency.
const fs = require('fs');
const path = require('path');

const GRAPH_FILE = path.join(__dirname, 'graph.json');

/**
 * Load the existing graph or initialize a new one.
 */
function loadGraph() {
  if (fs.existsSync(GRAPH_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    } catch (e) {
      console.warn("Graph file corrupted, resetting.");
    }
  }
  return { nodes: [], edges: [] };
}

/**
 * Save the graph to disk.
 */
function saveGraph(graph) {
  fs.writeFileSync(GRAPH_FILE, JSON.stringify(graph, null, 2));
}

async function syncToGraph(startup) {
  const graph = loadGraph();
  const { name, source, industry, brand_summary, techStack, employees } = startup;

  // 1. Upsert Startup Node
  let sNode = graph.nodes.find(n => n.type === 'Startup' && n.name === name);
  if (!sNode) {
    sNode = { type: 'Startup', name, id: `s_${startup.id}` };
    graph.nodes.push(sNode);
  } else {
    sNode.id = `s_${startup.id}`; // Ensure sync with current DB ID
  }
  sNode.industry = industry || "";
  sNode.source = source || "";
  sNode.summary = brand_summary || "";

  // 2. Upsert Tech Nodes & USES_TECH edges
  if (techStack && techStack.length > 0) {
    for (const t of techStack) {
      const techName = t.technology || t;
      let tNode = graph.nodes.find(n => n.type === 'Technology' && n.name === techName);
      if (!tNode) {
        tNode = { type: 'Technology', name: techName, id: `t_${techName.toLowerCase().replace(/\s+/g, '_')}` };
        graph.nodes.push(tNode);
      }
      // Create edge if it doesn't exist
      const exists = graph.edges.find(e => e.from === sNode.id && e.to === tNode.id && e.type === 'USES_TECH');
      if (!exists) {
        graph.edges.push({ from: sNode.id, to: tNode.id, type: 'USES_TECH' });
      }
    }
  }

  // 3. Upsert Person Nodes & WORKS_AT edges
  if (employees && employees.length > 0) {
    for (const e of employees) {
      if (!e.name) continue;
      let pNode = graph.nodes.find(n => n.type === 'Person' && n.name === e.name);
      if (!pNode) {
        pNode = { type: 'Person', name: e.name, id: `p_${e.name.toLowerCase().replace(/\s+/g, '_')}` };
        graph.nodes.push(pNode);
      }
      pNode.role = e.role || "";
      pNode.linkedin = e.linkedin || "";

      const exists = graph.edges.find(edge => edge.from === pNode.id && edge.to === sNode.id && edge.type === 'WORKS_AT');
      if (!exists) {
        graph.edges.push({ from: pNode.id, to: sNode.id, type: 'WORKS_AT' });
      }
    }
  }

  saveGraph(graph);
  console.log(`📂 Local Graph: Synced relations for ${name}`);
}

module.exports = { syncToGraph };
