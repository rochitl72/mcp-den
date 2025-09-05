import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AmazonProvider } from "./providers/amazon.js";

const server = new Server(
  { name: "commerce-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const provider = new AmazonProvider();

// Commerce tool with multiple actions
server.tool(
  "commerce",
  "Unified commerce tool with actions: ping, echo, search, details, reviews, budget_top, sustainability",
  async (args: any) => {
    try {
      const action = args?.action;

      if (action === "ping") {
        return { content: [{ type: "text", text: "pong" }] };
      }

      if (action === "echo") {
        return {
          content: [{ type: "text", text: `echo: ${args?.message ?? ""}` }],
        };
      }

      if (action === "search") {
        const res = provider.search(args.query, args.filters);
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }

      if (action === "details") {
        const res = provider.details(args.productId);
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }

      if (action === "reviews") {
        const res = provider.reviews(args.productId, args.limit ?? 5);
        return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
      }

      if (action === "budget_top") {
        const res = provider.budgetTop(
          args.query,
          args.budgetMaxINR,
          args.featurePref,
          args.topK ?? 3,
          args.filters ?? {}
        );

        const results = res.map((c) => ({
          id: c.id,
          title: c.title,
          brand: c.brand,
          priceINR: c.priceINR,
          rating: c.rating,
          url: c.url,
          score: c.score,
          reason: c.reason,
          images: c.images, // ✅ added so frontend can render images
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  request: {
                    budgetMaxINR: args.budgetMaxINR,
                    featurePref: args.featurePref,
                    topK: args.topK ?? 3,
                    query: args.query,
                    minRating: args.filters?.minRating,
                  },
                  results,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (action === "sustainability") {
        const weight = Number(args.weightKg ?? 0);
        const distKm = Number(args.distanceKm ?? 0);
        const packaging = args.packaging ?? "cardboard";
        const pkgWeight = Number(args.packagingWeightKg ?? 0);

        const shipping_gCO2e = Math.round(distKm * weight * 0.12);
        const packaging_gCO2e = Math.round(pkgWeight * 700);

        const totals = {
          total_gCO2e: shipping_gCO2e + packaging_gCO2e,
          total_kgCO2e: (shipping_gCO2e + packaging_gCO2e) / 1000,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  meta: {},
                  inputs: {
                    weightKg: weight,
                    distanceKm: distKm,
                    transport: args.transport ?? "road",
                    packaging,
                    packagingWeightKg: pkgWeight,
                  },
                  breakdown: { shipping_gCO2e, packaging_gCO2e },
                  totals,
                  notes:
                    "Approximate footprint only. Use calibrated factors per carrier/lane/materials for production accuracy.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return { content: [{ type: "text", text: "unknown action" }] };
    } catch (err: any) {
      console.error("[commerce ERROR]", err);
      return {
        content: [{ type: "text", text: `error: ${err.message ?? String(err)}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
