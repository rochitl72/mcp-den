// src/providers/amazon.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** ---------- Types ---------- */

export type Filters = {
  category?: string;
  brand?: string;
  budgetMaxINR?: number;
  minRating?: number;
};

export type FeaturePreference = "camera" | "battery" | "display" | "performance";

export type Product = {
  id: string;
  title: string;
  brand?: string;
  category?: string;
  priceINR: number;
  rating: number;
  ratingCount?: number;
  specs?: Record<string, string>;
  images?: string[];
  url?: string;
};

export type Review = {
  productId: string;
  stars: number;
  title?: string;
  text?: string;
  aspect?: "camera" | "battery" | "display" | "performance" | string;
};

/** ---------- Resolve data paths relative to this file (works in dist/ & src/) ---------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ../../data from dist/providers/* or src/providers/* both converge on repo-root/data
const DATA_DIR = path.resolve(__dirname, "../../data");
const CATALOG_PATH = path.join(DATA_DIR, "catalog.sample.json");
const REVIEWS_PATH = path.join(DATA_DIR, "reviews.sample.json");

/** ---------- Load helpers with safe fallback ---------- */

function safeReadJSON<T>(p: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** ---------- Fallback datasets (keeps dev flowing if files missing) ---------- */

const FALLBACK_CATALOG: Product[] = [
  {
    id: "B00PHONE001",
    title: "CamX Pro 5G Smartphone",
    brand: "CamX",
    category: "mobiles",
    priceINR: 13999,
    rating: 4.3,
    ratingCount: 12453,
    specs: {
      camera: "50MP OIS main + 8MP ultra-wide",
      battery: "5000 mAh",
      display: '6.5" AMOLED 120Hz',
      storage: "128GB",
      ram: "6GB",
    },
    images: [
      "https://example.com/img/camxpro-front.jpg",
      "https://example.com/img/camxpro-back.jpg",
    ],
    url: "https://www.amazon.in/dp/B00PHONE001",
  },
];

const FALLBACK_REVIEWS: Record<string, Review[]> = {
  B00PHONE001: [
    {
      productId: "B00PHONE001",
      stars: 5,
      title: "Great camera!",
      text: "OIS helps a lot in night photos.",
      aspect: "camera",
    },
    {
      productId: "B00PHONE001",
      stars: 4,
      title: "Good display",
      text: "120Hz feels smooth.",
      aspect: "display",
    },
  ],
};

/** ---------- Load data ---------- */

const CATALOG: Product[] = safeReadJSON<Product[]>(CATALOG_PATH, FALLBACK_CATALOG);
const REVIEWS_INDEX: Record<string, Review[]> = safeReadJSON<Record<string, Review[]>>(
  REVIEWS_PATH,
  FALLBACK_REVIEWS
);

/** ---------- Scoring for BudgetTop ---------- */

export function scoreProductForBudget(
  p: Product,
  featurePref?: FeaturePreference,
  budgetMaxINR?: number
) {
  // Base score from rating (0..5 -> 0..5)
  const rating = typeof p.rating === "number" ? p.rating : 0;

  // Feature bonus (light heuristic)
  let featureBonus = 0;
  if (featurePref) {
    const specText =
      (p.specs?.camera || p.specs?.battery || p.specs?.display || "") + " " + (p.title || "");
    const lower = specText.toLowerCase();
    const pref = featurePref.toLowerCase();

    // very light-weight match bonus
    if (lower.includes(pref)) featureBonus += 0.6;
    // special hints
    if (featurePref === "camera" && /ois|mp|ultra\-wide|telephoto/.test(lower)) featureBonus += 0.2;
    if (featurePref === "battery" && /5000|6000|mah|fast\s*charge/.test(lower)) featureBonus += 0.2;
    if (featurePref === "display" && /amoled|oled|120hz|90hz|hdr/.test(lower)) featureBonus += 0.2;
    if (featurePref === "performance" && /snapdragon|dimensity|8gb|12gb/.test(lower))
      featureBonus += 0.2;
  }

  // Price penalty if over budget
  let pricePenalty = 0;
  if (typeof budgetMaxINR === "number" && p.priceINR > budgetMaxINR) {
    // penalize proportionally to how far over budget
    const over = p.priceINR - budgetMaxINR;
    pricePenalty = Math.min(1.5, over / Math.max(1, budgetMaxINR) * 2); // cap
  }

  // Final score
  const score = rating + featureBonus - pricePenalty;
  return { rating, featureBonus, pricePenalty, score };
}

/** ---------- Provider ---------- */

export class AmazonProvider {
  private catalog: Product[];
  private reviewsIndex: Record<string, Review[]>;

  constructor() {
    this.catalog = CATALOG;
    this.reviewsIndex = REVIEWS_INDEX;
  }

  /** Simple search with optional filters */
  search(query: string, filters: Filters = {}) {
    const q = (query || "").trim().toLowerCase();

    let results = this.catalog.filter((p) => {
      const hay =
        (p.title || "") +
        " " +
        (p.brand || "") +
        " " +
        Object.values(p.specs || {}).join(" ");
      const matchQ = q ? hay.toLowerCase().includes(q) : true;

      const matchCategory = filters.category
        ? (p.category || "").toLowerCase() === filters.category.toLowerCase()
        : true;

      const matchBrand = filters.brand
        ? (p.brand || "").toLowerCase() === filters.brand.toLowerCase()
        : true;

      const matchBudget =
        typeof filters.budgetMaxINR === "number"
          ? p.priceINR <= filters.budgetMaxINR
          : true;

      const matchRating =
        typeof filters.minRating === "number" ? p.rating >= filters.minRating : true;

      return matchQ && matchCategory && matchBrand && matchBudget && matchRating;
    });

    // naive sort: better rating first, then lower price
    results = results.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.priceINR - b.priceINR;
    });

    return {
      total: results.length,
      products: results,
    };
  }

  /** Get a single product’s details */
  details(productId: string) {
    const p = this.catalog.find((x) => x.id === productId);
    if (!p) throw new Error(`Product not found: ${productId}`);

    const revs = this.reviewsIndex[productId] || [];
    const avg =
      revs.length > 0 ? revs.reduce((s, r) => s + (r.stars || 0), 0) / revs.length : null;

    return {
      ...p,
      reviewCount: revs.length,
      avgReviewRating: avg,
    };
  }

  /** Get reviews for a product */
  getReviews(productId: string, limit = 10): Review[] {
    const revs = this.reviewsIndex[productId] || [];
    return revs.slice(0, Math.max(0, limit));
  }
}