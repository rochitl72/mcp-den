import { NextRequest, NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

export const runtime = "nodejs";

function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}
function fail(message: unknown, status = 500) {
  return NextResponse.json({ ok: false, error: String(message) }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { action, ...rest } = payload || {};
    if (!action) return fail("Missing 'action'", 400);

    // Resolve the compiled MCP server at repo-root/dist/server.js
    const serverPath = path.resolve(process.cwd(), "..", "dist", "server.js");

    const transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    const client = new Client(
      { name: "web-bridge", version: "0.0.1" },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    await client.connect(transport);

    const res = await client.callTool({
      name: "commerce",
      arguments: { action, ...rest },
    });

    const c0 = Array.isArray(res.content) ? res.content[0] : undefined;
    const text = c0 && "text" in c0 ? (c0 as any).text : null;

    try { await client.close(); } catch {}

    return ok(text ? JSON.parse(text) : res);
  } catch (err: any) {
    return fail(err?.message || err);
  }
}
