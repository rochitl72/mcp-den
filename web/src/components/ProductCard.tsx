import React from "react";
import SustainabilityBadge from "./SustainabilityBadge";

type Item = {
  id: string;
  title: string;
  brand?: string;
  priceINR?: number;
  rating?: number;
  url?: string;
  images?: string[];
  sustainability_gCO2e?: number;
  reason?: string;
  score?: number;
};

export default function ProductCard({ item }: { item: Item }) {
  return (
    <div className="card p-4">
      <div className="flex gap-4">
        <div className="w-28 h-28 bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center ring-1 ring-slate-700">
          {item.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.images[0]} alt={item.title} className="object-cover w-full h-full" />
          ) : (
            <span className="text-slate-400 text-xs">No image</span>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold hover:underline text-slate-100"
              >
                {item.title}
              </a>
              <div className="text-xs text-slate-400">{item.brand}</div>
            </div>
            {typeof item.sustainability_gCO2e === "number" && (
              <SustainabilityBadge grams={item.sustainability_gCO2e} />
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            {typeof item.priceINR === "number" && (
              <span className="text-slate-200">₹{item.priceINR.toLocaleString("en-IN")}</span>
            )}
            {typeof item.rating === "number" && (
              <span className="text-amber-400">★ {item.rating.toFixed(1)}</span>
            )}
            {typeof item.score === "number" && (
              <span className="text-emerald-300/90">Score: {item.score.toFixed(2)}</span>
            )}
          </div>

          {item.reason && (
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 rounded p-2 ring-1 ring-slate-800">
              {item.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
