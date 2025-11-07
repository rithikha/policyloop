import express from "express";
import { getConfig } from "./config";
import { FeedCache } from "./feed";

async function main() {
  const config = getConfig();
  const cache = new FeedCache(config);
  await cache.init();

  setInterval(() => {
    cache
      .refresh()
      .catch((err) => console.error("[firehose-view] refresh failed", err));
  }, config.POLL_INTERVAL_MS);

  const app = express();
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ ok: true }));
  app.get("/feed", (_req, res) => res.json(cache.list()));

  app.listen(config.PORT, () => {
    console.log(`[firehose-view] listening on http://localhost:${config.PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
