import puppeteer from "puppeteer";
import fs from "fs/promises";

const OUTPUT_PATH = "./output/characters.json";

function getBaseName(file: string) {
  return file
    .replace(/\?.*$/, "")
    .replace(/\.[a-f0-9]{6,10}\.(png|webp|mp4|jpg|jpeg|svg)$/i, "")
    .replace(/\.(png|webp|mp4|jpg|jpeg|svg)$/i, "");
}

function getCategory(url: string, file: string) {
  const u = url.toLowerCase();

  // 🎮 UI
  if (
    u.includes("button") ||
    u.includes("icon") ||
    u.includes("logo") ||
    u.includes("store") ||
    u.includes("theme") ||
    u.includes("ui")
  ) {
    return "ui";
  }

  // 🌄 background
  if (
    u.includes("bg") ||
    u.includes("background") ||
    u.includes("wave") ||
    u.includes("banner") ||
    u.includes("kv") ||
    file.startsWith("bg")
  ) {
    return "background";
  }

  // 👤 character (default)
  return "character";
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  const assets = new Set<string>();

  page.on("response", (res) => {
    const url = res.url();
    if (/\.(png|webp|mp4|jpg|jpeg|svg)(\?.*)?$/.test(url)) {
      assets.add(url);
    }
  });

  await page.goto("https://endfield.gryphline.com/th-th#operator", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight)
    );
    await new Promise((r) => setTimeout(r, 1200));
  }

  const domAssets: string[] = await page.evaluate(() => {
    return [
      ...Array.from(document.querySelectorAll("img")).map(
        (el: any) => el.src
      ),
      ...Array.from(document.querySelectorAll("video")).map(
        (el: any) => el.src
      ),
      ...Array.from(document.querySelectorAll("source")).map(
        (el: any) => el.src
      ),
    ];
  });

  domAssets.forEach((u) => assets.add(u));

  console.log("RAW:", assets.size);

  // ======================
  // 🧠 GROUPING ENGINE
  // ======================
  const grouped: Record<
    string,
    {
      type: string;
      versions: string[];
    }
  > = {};

  for (const url of assets) {
    const file = url.split("/").pop() || "";
    const base = getBaseName(file);
    const type = getCategory(url, file);

    if (!grouped[base]) {
      grouped[base] = {
        type,
        versions: [],
      };
    }

    grouped[base].versions.push(url);
  }

  // ======================
  // 📊 SORT versions
  // ======================
  for (const key in grouped) {
    grouped[key].versions.sort();
  }

  const result = {
    updatedAt: new Date().toISOString(),
    totalGroups: Object.keys(grouped).length,
    assets: grouped,
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(result, null, 2));

  console.log("✅ grouped + merged variants saved");

  await browser.close();
}

run().catch(console.error);
