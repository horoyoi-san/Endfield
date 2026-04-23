import puppeteer from "puppeteer";

export async function fetchOperator(): Promise<Record<string, string>> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const images = new Set<string>();

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

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await new Promise((r) => setTimeout(r, 1000));
  }

  const filtered = [...images].filter((url) => {
    const name = url.split("/").pop()?.toLowerCase() || "";
    if (name.includes("_")) return false;
    return /^[a-z0-9]+\.[a-f0-9]+\.(png|webp)$/.test(name);
  });

  const result: Record<string, string> = {};

  for (const url of filtered) {
    const file = url.split("/").pop()!;
    const name = file.split(".")[0];
    result[name] = url;
  }

  await browser.close();
  return result;
}
