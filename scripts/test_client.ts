import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  // run the compiled server for stability
  command: "node",
  args: ["dist/server.js"],
});

const client = new Client(
  { name: "local-test", version: "0.0.1" },
  { capabilities: { tools: {}, resources: {}, prompts: {} } }
);

function firstText(res: any) {
  const c = res?.content;
  return Array.isArray(c) && c[0]?.text ? c[0].text : JSON.stringify(res);
}

await client.connect(transport);

// list tools
const tools = await client.listTools();
console.log("TOOLS:", tools.tools.map((t) => t.name));

// --- util ---
let r = await client.callTool({ name: "commerce", arguments: { action: "ping" } });
console.log("PING:", firstText(r));

r = await client.callTool({ name: "commerce", arguments: { action: "echo", message: "hello mcp" } });
console.log("ECHO:", firstText(r));

// --- search ---
r = await client.callTool({
  name: "commerce",
  arguments: {
    action: "search",
    query: "phone",
    filters: { budgetMaxINR: 20000, minRating: 3.5 },
  },
});
console.log("SEARCH:", firstText(r));

// pick first productId (fallback to known id)
let productId = "B00PHONE001";
try {
  const parsedSearch = JSON.parse(firstText(r));
  productId = parsedSearch?.products?.[0]?.id ?? productId;
} catch { /* keep fallback */ }

// --- details ---
r = await client.callTool({
  name: "commerce",
  arguments: { action: "details", productId },
});
console.log("DETAILS:", firstText(r));

// --- reviews ---
r = await client.callTool({
  name: "commerce",
  arguments: { action: "reviews", productId, limit: 3 },
});
console.log("REVIEWS:", firstText(r));

// --- budget_top ---
const r2 = await client.callTool({
  name: "commerce",
  arguments: {
    action: "budget_top",
    query: "phone",
    budgetMaxINR: 15000,
    featurePref: "camera",
    topK: 3,
    filters: { minRating: 3.5 },
  },
});
console.log("BUDGET_TOP:", firstText(r2));

// --- sustainability ---
const r3 = await client.callTool({
  name: "commerce",
  arguments: {
    action: "sustainability",
    weightKg: 0.6,
    distanceKm: 1200,
    transport: "road",
    packaging: "cardboard",
    packagingWeightKg: 0.25,
  },
});
console.log("SUSTAINABILITY:", firstText(r3));

process.exit(0);