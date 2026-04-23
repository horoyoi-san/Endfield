import puppeteer from "puppeteer";
import fs from "fs/promises";

const BASE = "https://web-static.hg-cdn.com";

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const images = new Set();

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
    waitUntil: "networkidle2"
  });

  // 🔥 trigger lazy load
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("🎯 เจอทั้งหมด:", images.size);

  // ✅ filter ตัวละคร
  const filtered = [...images].filter((url) => {
    const name = url.split("/").pop().toLowerCase();

    if (name.includes("_")) return false;

    return /^[a-z0-9]+\.[a-f0-9]+\.(png|webp)$/.test(name);
  });

  console.log("🎭 ตัวละคร:", filtered.length);

  // ✅ แปลงเป็น object
  const result = {};

  for (const url of filtered) {
    const file = url.split("/").pop();
    const name = file.split(".")[0];

    if (!result[name]) {
      result[name] = url;
    }
  }

  // ✅ sort
  const sorted = Object.fromEntries(
    Object.entries(result).sort(([a], [b]) => a.localeCompare(b))
  );

  const wrapped = [
    {
      updatedAt: new Date().toISOString(),
      rsp: sorted
    }
  ];

  await fs.writeFile(
    "./output/characters.json",
    JSON.stringify(wrapped, null, 2)
  );


  console.log("✅ saved characters.json");

  await browser.close();
}

run().catch(console.error);
