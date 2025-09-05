"use client";
import { useState } from "react";

export default function HomePage() {
  const [query, setQuery] = useState("phone");
  const [budget, setBudget] = useState<number>(15000);
  const [feature, setFeature] = useState("camera");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function runBudgetTop() {
    setLoading(true);
    try {
      const res = await fetch("/api/commerce", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "budget_top",
          query,
          budgetMaxINR: budget,
          featurePref: feature,
          topK: 3,
          filters: { minRating: 3.5 },
        }),
      });
      const json = await res.json();
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Agentic Shopping MCP — Demo</h1>

        <section className="card p-6 space-y-4">
          <h2 className="text-lg font-medium">Budget Constraint AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              className="rounded-lg bg-slate-800 text-white border border-slate-700 p-2"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search query"
            />
            <input
              type="number"
              className="rounded-lg bg-slate-800 text-white border border-slate-700 p-2"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <select
              className="rounded-lg bg-slate-800 text-white border border-slate-700 p-2"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
            >
              <option value="camera">camera</option>
              <option value="battery">battery</option>
              <option value="display">display</option>
              <option value="performance">performance</option>
            </select>
            <button
              onClick={runBudgetTop}
              disabled={loading}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2"
            >
              {loading ? "Running…" : "Find Top 3"}
            </button>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium mb-3">Results</h2>
          {data?.results?.length ? (
            <ul className="space-y-3">
              {data.results.map((r: any) => (
                <li key={r.id} className="p-4 rounded-lg bg-slate-800">
                  <div className="font-semibold">{r.title}</div>
                  <div className="text-sm text-slate-400">
                    ₹{r.priceINR} • ★ {r.rating} • Score {r.score?.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">{r.reason}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-sm">No results yet. Run a query above.</p>
          )}
        </section>
      </div>
    </main>
  );
}
