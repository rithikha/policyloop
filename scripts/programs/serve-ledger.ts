import http from "http";
import { promises as fs } from "fs";
import path from "path";

const PORT = Number(process.env.PORT || 4173);
const baseDir = path.resolve(__dirname, "../../frontend/policy-ledger");

const server = http.createServer(async (req, res) => {
  try {
    const reqPath = req.url === "/" ? "/index.html" : (req.url || "/");
    const filePath = path.join(baseDir, path.normalize(reqPath));
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`[phase2] ledger server running on http://localhost:${PORT}`);
});

function contentType(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "text/javascript";
  return "text/plain";
}
