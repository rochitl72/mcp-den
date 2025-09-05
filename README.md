# Agentic Shopping MCP

Production-ready **MCP (Model Context Protocol) server** that exposes commerce tools, plus a **secure HTTP bridge** that Cequence can place in front of for **OAuth, scoping, and observability**. Includes a simple **Next.js demo UI**.

> Hackathon focus: “Build the Infrastructure for Autonomous Software”.  
> Transform apps into **AI-ready, agent-accessible services** using a **Cequence AI Gateway** with **OAuth (Descope)** and **MCP**.

---

## 🧱 What’s in here

- **MCP Server** (`src/server.ts` → `dist/server.js`)  
  Tools:
  - `commerce:ping`, `commerce:echo`
  - `commerce:search` (local mock catalog)
  - `commerce:details`, `commerce:reviews`
  - `commerce:budget_top` (Budget Constraint AI)
  - `commerce:sustainability` (approx CO₂ calc)

- **HTTP Bridge** (`src/http_bridge.ts`)  
  Exposes `POST /mcp/tools/call` → spawns MCP server over stdio → calls tool.  
  - Auth: Dev Bearer token **or** JWT (HS256/RS256).  
  - Emits JSON logs w/ `requestId` → gateway-friendly.

- **Web Demo** (`/web`, Next.js 15 + Tailwind)  
  - Budget Constraint AI form  
  - Sustainability badge

---

## 🗂️ Repo Structure (key paths)

.
├─ data/
│  ├─ catalog.sample.json
│  └─ reviews.sample.json
├─ dist/                 # built server files (gitignored)
├─ scripts/
│  └─ test_client.ts     # MCP stdio test
├─ src/
│  ├─ app/api/commerce/route.ts   # Web API -> MCP server
│  ├─ http_bridge.ts              # HTTP Bridge -> MCP server
│  ├─ providers/amazon.ts         # sample provider (file-based)
│  └─ server.ts                   # MCP server (tools)
└─ web/
├─ src/app/page.tsx            # UI
└─ (Next.js project)

---

## ⚙️ Prerequisites

- Node.js 20+
- npm
- (Optional) curl + jq for testing

---

## 🚀 Quick Start (Local)

```bash
# clone & install
git clone https://github.com/rochitl72/mcp-den.git
cd mcp-den
npm install

1) Build MCP Server

npm run build

2) Test MCP via stdio client

npm run test:client
# Expect:
# TOOLS: [ 'commerce' ]
# PING: pong
# ECHO: echo: hello mcp
# SEARCH/DETAILS/REVIEWS/BUDGET_TOP outputs...

3) Run the HTTP Bridge (Cequence-facing)

# DEV token mode
DEV_TOKEN=dev123 npm run bridge
# -> MCP HTTP bridge listening on http://localhost:8787

Call bridge with curl:

curl -s http://localhost:8787/mcp/tools/call \
  -H "authorization: Bearer dev123" \
  -H "content-type: application/json" \
  -d '{"name":"commerce","arguments":{"action":"budget_top","query":"phone","budgetMaxINR":15000,"featurePref":"camera","topK":3,"filters":{"minRating":3.5}}}' | jq .

4) Run the Web Demo

cd web
npm install
npm run dev
# http://localhost:3000


⸻

🔐 Auth Options (Bridge)

Set one of the following:
	•	Dev token (easy)

export DEV_TOKEN=dev123
npm run bridge


	•	JWT HS256

export JWT_MODE=hs256
export JWT_SECRET='<your-hs256-shared-secret>'
npm run bridge


	•	JWT RS256 (OIDC/Descope public key)

export JWT_MODE=rs256
export JWT_PUBLIC_KEY_B64="$(base64 -i public.pem)"
npm run bridge



Scopes checked (simple demo):
mcp:commerce:<action> or mcp:commerce:* when calling /mcp/tools/call.

⸻

🧪 HTTP Bridge API
	•	POST /mcp/tools/call
Headers:
	•	Authorization: Bearer <token>
	•	Content-Type: application/json
Body:

{ "name": "commerce", "arguments": { "action": "ping" } }

Response:

{ "ok": true, "requestId": "uuid", "tool": "commerce", "action": "ping", "data": "..." }


	•	GET /healthz → { "ok": true }

⸻

🌐 Hooking up Cequence AI Gateway
	•	Point Cequence upstream to the HTTP bridge (http://your-host:8787).
	•	Enforce:
	•	OAuth/JWT validation (issuer = Descope)
	•	Scopes → mcp:commerce:budget_top, etc.
	•	Rate limit / mTLS / logging
	•	Propagate headers: Authorization and x-request-id (or set at gateway)
	•	Observe logs: bridge prints JSON lines with requestId, user, action, duration.

⸻

🧩 Using from Agent Clients
	•	Claude Desktop / Crew / LangChain can use:
	•	stdio: point to dist/server.js
	•	HTTP: call the bridge endpoint from your agent runtime (Gateway in front for auth)

(You can also run the bridge in the same container as the MCP server.)

⸻

🛠️ Scripts

# package.json (root)
{
  "scripts": {
    "build": "tsc -p tsconfig.server.json",
    "dev": "tsx src/server.ts",
    "test:client": "tsx scripts/test_client.ts",
    "bridge": "tsx src/http_bridge.ts"
  }
}

Web project scripts (in /web):

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}


⸻

🔧 Environment

Create .env in repo root if needed:

# Bridge
DEV_TOKEN=dev123
# or JWT_MODE=hs256
# JWT_SECRET=your-secret
# or JWT_MODE=rs256
# JWT_PUBLIC_KEY_B64=base64-of-public-pem

# (Optional) values MCP server may read
X_USER=
X_REQUEST_ID=


⸻

🧰 Troubleshooting
	•	Timeouts from test client
Ensure only one MCP server registers tools; restart terminal if stray processes existed.
	•	ENOENT on catalog JSON
We resolve the data/ path relative to providers/amazon.ts—run npm run build again after editing.
	•	Next.js/Tailwind errors
Ensure web installed dev deps and Tailwind config is correct (postcss.config.js, tailwind.config.ts).
	•	401 from bridge
Provide Authorization: Bearer <DEV_TOKEN or JWT>.

⸻

📦 Deploy
	•	Bridge + MCP: Docker or Render/Fly. Expose port 8787.
	•	Web: Deploy /web to Vercel/Netlify.
	•	Configure Cequence to sit in front of the bridge with your OIDC (Descope).

(A Dockerfile + Fly/Render configs can be added on request.)

⸻

📜 License

MIT (or your choice)
MD

If you also want a quick **`.env.example`** for the repo:

```bash
cat > .env.example <<'ENV'
# One of the following auth modes for the HTTP bridge:

# Dev token mode (easy for local)
DEV_TOKEN=dev123

# JWT HS256 mode
# JWT_MODE=hs256
# JWT_SECRET=replace-with-shared-secret

# JWT RS256 mode
# JWT_MODE=rs256
# JWT_PUBLIC_KEY_B64=base64-of-your-public-pem
ENV

Commit & push:

git add README.md .env.example
git commit -m "Add README and env example"
git push

