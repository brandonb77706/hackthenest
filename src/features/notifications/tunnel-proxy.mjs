import { createServer, request } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Expose only the test page, its worker and build assets. No app APIs or writes.
export function allowedTunnelRequest(method, rawPath) {
  if (method !== "GET" && method !== "HEAD") return false;
  let path;
  try { path = decodeURIComponent(new URL(rawPath, "http://localhost").pathname); } catch { return false; }
  if (path.includes("..") || path.includes("\\")) return false;
  return path === "/notifications/test" || path === "/notifications/sw.js" ||
    path === "/favicon.ico" || path.startsWith("/_next/static/");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createServer((incoming, outgoing) => {
    if (!allowedTunnelRequest(incoming.method, incoming.url)) {
      outgoing.writeHead(404); outgoing.end("Not available through this test tunnel."); return;
    }
    const upstream = request({ hostname: "localhost", port: 3002, path: incoming.url, method: incoming.method,
      headers: { host: "localhost:3002", accept: incoming.headers.accept ?? "*/*" } }, (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    upstream.on("error", () => { outgoing.writeHead(502); outgoing.end("Test server unavailable."); });
    upstream.end();
  }).listen(3003, "127.0.0.1", () => console.log("Restricted test proxy listening on 127.0.0.1:3003"));
}
