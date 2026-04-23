import puppeteer from "puppeteer";
import fs from "fs/promises";
import crypto from "crypto";

const BASE = "https://web-static.hg-cdn.com";
const OUTPUT_PATH = "./output/characters.json";

// ======================
// 🔐 HASH FUNCTION
// ======================
function hash(obj: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex");
}

// ======================
// 🚀 MAIN
// ======================
async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const images = new Set<string>();

  // ======================
  // 📡 capture network images
  // ======================
  page.on("response", (res) => {
    const url = res.url();
    if (
      url.includes("/_next/static/media/") &&
      (url.endsWith(".png") || url.endsWith(".webp"))
    ) {
      images.add(url);
    }
  });

  await page.goto("https://endfield.gryphline.com/th-th#operator", {
    waitUntil: "networkidle2",
  });

  // 🔥 lazy load trigger
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("🎯 raw images:", images.size);

  // ======================
  // 🧹 filter valid images
  // ======================
  const filtered = [...images].filter((url) => {
    const name = url.split("/").pop()?.toLowerCase() || "";

    if (name.includes("_")) return false;

    return /^[a-z0-9]+\.[a-f0-9]+\.(png|webp)$/.test(name);
  });

  console.log("🎭 filtered:", filtered.length);

  // ======================
  // 🧱 build object
  // ======================
  const result: Record<string, string> = {};

  for (const url of filtered) {
    const file = url.split("/").pop()!;
    const name = file.split(".")[0];

    if (!result[name]) {
      result[name] = url;
    }
  }

  // ======================
  // 📊 sort
  // ======================
  const sorted = Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
  );

  const newData = {
    updatedAt: new Date().toISOString(),
    rsp: sorted,
  };

  // ======================
  // 📂 LOAD OLD FILE
  // ======================
  let oldData = null;

  try {
    const raw = await fs.readFile(OUTPUT_PATH, "utf-8");
    oldData = JSON.parse(raw)[0];
  } catch {
    console.log("📁 No old file found (first run)");
  }

  // ======================
  // 🔍 COMPARE HASH
  // ======================
  const newHash = hash(newData.rsp);
  const oldHash = oldData ? hash(oldData.rsp) : null;

  if (oldHash === newHash) {
    console.log("⏭ No changes detected → skip write");
    await browser.close();
    return;
  }

  // ======================
  // 💾 SAVE ONLY IF CHANGED
  // ======================
  const wrapped = [newData];

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(wrapped, null, 2));

  console.log("✅ saved characters.json (updated)");

  // ======================
  // 🧾 OPTIONAL LOG DIFF INFO
  // ======================
  if (oldData) {
    const oldKeys = new Set(Object.keys(oldData.rsp));
    const newKeys = new Set(Object.keys(newData.rsp));

    const added = [...newKeys].filter((x) => !oldKeys.has(x));
    const removed = [...oldKeys].filter((x) => !newKeys.has(x));

    console.log("➕ Added:", added.length);
    console.log("➖ Removed:", removed.length);
  }

  await browser.close();
}

run().catch(console.error);
