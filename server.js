const express = require("express");
const cors = require("cors");
const Parser = require("rss-parser");

const app = express();
const parser = new Parser();
app.use(cors());

const SOURCES = [
  { name: "Vanguard",      url: "https://www.vanguardngr.com/feed/" },
  { name: "Premium Times", url: "https://www.premiumtimesng.com/feed/" },
  { name: "Daily Trust",   url: "https://dailytrust.com/feed/" },
  { name: "Channels TV",   url: "https://www.channelstv.com/feed/" },
  { name: "BusinessDay",   url: "https://businessday.ng/feed/" },
  { name: "ThisDay",       url: "https://www.thisdaylive.com/index.php/feed/" },
  { name: "Arise TV",      url: "https://www.arise.tv/feed/" },
  { name: "Sun News",      url: "https://www.sunnewsonline.com/feed/" },
];

const KEYWORDS = [
  "election", "INEC", "APC", "PDP", "Labour Party", "NNPP",
  "governorship", "primary", "nomination", "polling", "Tinubu",
  "Atiku", "Peter Obi", "senator", "campaign", "ballot", "vote",
  "politics", "minister", "presidency", "governor", "assembly"
];

let cache = { data: [], timestamp: null };
const CACHE_TTL = 30 * 60 * 1000;

async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return feed.items
      .filter(item =>
        KEYWORDS.some(kw =>
          (item.title + " " + (item.contentSnippet || ""))
            .toLowerCase().includes(kw.toLowerCase())
        )
      )
      .slice(0, 15)
      .map(item => ({
        title: item.title,
        link: item.link,
        summary: item.contentSnippet?.slice(0, 200) || "",
        published: item.pubDate,
        source: source.name,
      }));
  } catch (e) {
    console.error(`Failed: ${source.name}`, e.message);
    return [];
  }
}

async function fetchAll() {
  const results = await Promise.allSettled(SOURCES.map(fetchFeed));
  return results
    .flatMap(r => r.status === "fulfilled" ? r.value : [])
    .sort((a, b) => new Date(b.published) - new Date(a.published));
}

app.get("/api/news", async (req, res) => {
  const stale = !cache.timestamp || Date.now() - cache.timestamp > CACHE_TTL;
  if (stale) {
    console.log("Fetching feeds...");
    cache.data = await fetchAll();
    cache.timestamp = Date.now();
    console.log(`Got ${cache.data.length} articles`);
  }
  res.json({ articles: cache.data, cachedAt: cache.timestamp });
});

app.get("/api/news/refresh", async (req, res) => {
  console.log("Force refresh...");
  cache.data = await fetchAll();
  cache.timestamp = Date.now();
  res.json({ articles: cache.data, cachedAt: cache.timestamp });
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
