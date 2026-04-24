export async function fetchOperator(): Promise<Record<string, string>> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  const images = new Set<string>();

  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("_next/static/media") && (url.endsWith(".png") || url.endsWith(".webp"))) {
      images.add(url);
    }
  });

  await page.goto("https://endfield.gryphline.com/th-th#operator", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await page.waitForTimeout(3000);

  await browser.close();

  return Object.fromEntries([...images].map(url => {
    const file = url.split("/").pop()!;
    const name = file.replace(/\.[a-f0-9]+\.(png|webp|mp4)$/i, "");
    return [name, url];
  }));
}
