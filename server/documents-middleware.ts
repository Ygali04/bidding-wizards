/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from "node:http";
import { POST } from "../api/documents";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > 100_000) {
        reject(new Error("too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Dev-server adapter so `/api/documents` hits the same POST handler Cursor hosting will run. */
export async function handleDocumentsMiddleware(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url ?? "";
  if (req.method !== "POST" || !url.split("?")[0]?.endsWith("/api/documents")) return false;

  try {
    const body = await readBody(req);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const request = new Request("http://127.0.0.1/api/documents", {
      method: "POST",
      headers,
      body,
    });
    const response = await POST(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode = 413;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ ok: false, message: "Request too large." }));
  }
  return true;
}
