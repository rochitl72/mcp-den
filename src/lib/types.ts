import { z } from "zod";

export const SpecsSchema = z.object({
  camera: z.string().optional(),
  battery: z.string().optional(),
  display: z.string().optional(),
  storage: z.string().optional(),
  ram: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  skinType: z.string().optional()
});

export const ProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().optional(),
  category: z.enum(["mobiles", "skincare", "other"]).default("other"),
  priceINR: z.number().nonnegative(),
  rating: z.number().min(0).max(5).default(0),
  ratingCount: z.number().nonnegative().default(0),
  specs: SpecsSchema.optional(),
  images: z.array(z.string()).default([]),
  url: z.string().url()
});
export type Product = z.infer<typeof ProductSchema>;

export const ReviewSchema = z.object({
  stars: z.number().min(1).max(5),
  title: z.string(),
  text: z.string(),
  aspect: z.string().optional()
});
export type Review = z.infer<typeof ReviewSchema>;

export const SearchFiltersSchema = z.object({
  category: z.string().optional(),
  brand: z.string().optional(),
  budgetMaxINR: z.number().optional(),
  minRating: z.number().min(0).max(5).optional()
});
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const SearchResultSchema = z.object({
  products: z.array(ProductSchema)
});
export type SearchResult = z.infer<typeof SearchResultSchema>;
