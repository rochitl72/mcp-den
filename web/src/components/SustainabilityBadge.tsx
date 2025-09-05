import React from "react";

export default function SustainabilityBadge({ grams }: { grams: number }) {
  const kg = grams / 1000;
  let cls = "bg-emerald-950 text-emerald-300 ring-1 ring-emerald-800";
  if (kg > 0.5) cls = "bg-yellow-950 text-yellow-300 ring-1 ring-yellow-800";
  if (kg > 1.0) cls = "bg-red-950 text-red-300 ring-1 ring-red-800";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden className="opacity-80">
        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5 20l2-7L2 9h7z" fill="currentColor"/>
      </svg>
      {kg.toFixed(3)} kg CO₂e
    </span>
  );
}
