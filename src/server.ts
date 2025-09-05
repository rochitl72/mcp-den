import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  estimatePackagingCO2e, estimateShippingCO2e, toKgCO2e
} from "./lib/sustainability.js";
import {
  AmazonProvider, FeaturePreference, Filters, scoreProductForBudget
} from "./providers/amazon.js";

const server = new McpServer({
  name: "agentic-shopping-mcp",
  version: "0.1.0",
});

server.resource("status", "status://health", async (uri) => ({
  contents: [{ uri: uri.href, text: "OK: server alive" }],
}));

const provider = new AmazonProvider();

server.tool(
  "commerce",
  {
    action: z.enum([
      "ping",
      "echo",
      "search",
      "details",
      "reviews",
      "budget_top",
      "sustainability",
    ]),
    message: z.string().optional(),

    // search-related
    query: z.string().optional(),
    filters: z
      .object({
        category: z.string().optional(),
        brand: z.string().optional(),
        budgetMaxINR: z.number().optional(),
        minRating: z.number().optional(),
      })
      .partial()
      .optional(),

    // details/reviews
    productId: z.string().optional(),
    limit: z.number().optional(),

    // budget_top
    budgetMaxINR: z.number().optional(),
    featurePref: z.enum(["camera", "battery", "display", "performance"]).optional(),
    topK: z.number().optional(),

    // sustainability
    weightKg: z.number().optional().describe("Package weight in kg"),
    distanceKm: z.number().optional().describe("Shipping distance in km"),
    transport: z.enum(["air", "road", "rail", "sea"]).optional(),
    packaging: z.enum(["plastic", "paper", "cardboard", "mixed"]).optional(),
    packagingWeightKg: z.number().optional().describe("Packaging weight in kg (default 0.2)"),
  },
  async (args) => {
    const action = args.action;

    // util
    if (action === "ping") return { content: [{ type: "text", text: "pong" }] };
    if (action === "echo") return { content: [{ type: "text", text: `echo: ${args.message ?? ""}` }] };

    // search
    if (action === "search") {
      const query = args.query ?? "";
      const filters: Filters = (args.filters as any) ?? {};
      const res = provider.search(query, filters);
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    }

    // details
    if (action === "details") {
      if (!args.productId) throw new Error("productId is required for details");
      const det = provider.details(args.productId);
      return { content: [{ type: "text", text: JSON.stringify(det, null, 2) }] };
    }

    // reviews
    if (action === "reviews") {
      if (!args.productId) throw new Error("productId is required for reviews");
      const limit = typeof args.limit === "number" ? args.limit : 10;
      const revs = provider.getReviews(args.productId, limit);
      return { content: [{ type: "text", text: JSON.stringify(revs, null, 2) }] };
    }

    // budget_top
    if (action === "budget_top") {
      const budgetMaxINR: number | undefined =
        typeof args.budgetMaxINR === "number" ? args.budgetMaxINR : (args.filters as any)?.budgetMaxINR;
      const featurePref = args.featurePref as FeaturePreference | undefined;
      const topK = typeof args.topK === "number" && args.topK > 0 ? Math.min(args.topK, 10) : 3;

      const preFilters: Filters = { ...(args.filters as any), budgetMaxINR };
      const searchRes = provider.search(args.query ?? "", preFilters);
      const candidates = searchRes.products;

      const ranked = candidates
        .map((p) => {
          const s = scoreProductForBudget(p as any, featurePref, budgetMaxINR);
          const reason = [
            `rating=${s.rating}`,
            `price=${p.priceINR}`,
            ...(s.featureBonus > 0 ? [`featureMatch=+${s.featureBonus.toFixed(2)}`] : []),
            ...(s.pricePenalty > 0 ? [`pricePenalty=-${s.pricePenalty.toFixed(2)}`] : []),
          ].join(", ");
          return { product: p, score: s.score, reason };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      const payload = {
        request: {
          budgetMaxINR,
          featurePref,
          topK,
          query: args.query ?? "",
          minRating: (args.filters as any)?.minRating,
        },
        results: ranked.map((r) => ({
          id: r.product.id,
          title: r.product.title,
          brand: (r.product as any).brand,
          priceINR: (r.product as any).priceINR,
          rating: (r.product as any).rating,
          url: (r.product as any).url,
          score: Number(r.score.toFixed(3)),
          reason: r.reason,
        })),
      };

      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    }

    // sustainability
    if (action === "sustainability") {
      const weightKg = typeof args.weightKg === "number" ? args.weightKg : 0.5; // default 0.5 kg
      const distanceKm = typeof args.distanceKm === "number" ? args.distanceKm : 800; // default 800 km
      const transport = (args.transport as any) ?? "road";
      const packaging = (args.packaging as any) ?? "cardboard";
      const packagingWeightKg =
        typeof args.packagingWeightKg === "number" ? args.packagingWeightKg : 0.2;

      const ship = estimateShippingCO2e(weightKg, distanceKm, transport);
      const pack = estimatePackagingCO2e(packaging, packagingWeightKg);
      const totalG = ship.gramsCO2e + pack.gramsCO2e;

      const meta: Record<string, any> = {};
      if (process.env.CEQUENCE_CONN_ID) meta.cequenceConnId = process.env.CEQUENCE_CONN_ID;

      const result = {
        meta,
        inputs: { weightKg, distanceKm, transport, packaging, packagingWeightKg },
        breakdown: {
          shipping_gCO2e: Math.round(ship.gramsCO2e),
          packaging_gCO2e: Math.round(pack.gramsCO2e),
        },
        totals: {
          total_gCO2e: Math.round(totalG),
          total_kgCO2e: toKgCO2e(totalG),
        },
        notes:
          "Approximate footprint only. Use calibrated factors per carrier/lane/materials for production accuracy.",
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    return { content: [{ type: "text", text: "unknown action" }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MCP server running on stdio. Waiting for a client…");