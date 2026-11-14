import { expect, test, type Browser, type Page } from "@playwright/test";

// The demo happy path from the README's "Do this, see this" table, on the simulated chain:
// a seller lists an item with a sealed lowest price, a second browser makes a blind offer inside the overlap,
// both pay and receive, and the listing is sold.

async function signUp(browser: Browser, intent: "sell" | "buy", handle: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/signin");
  await page.getByRole("button", { name: /continue with google/i }).click();
  await page.getByRole("link", { name: intent === "sell" ? /i want to sell/i : /i just want to buy/i }).click();
  await page.getByLabel(/shop handle|username/i).fill(handle);
  await page.getByRole("button", { name: /continue|open|create|start|next|done|save/i }).last().click();
  return page;
}

test("a listing is sold through a blind offer, payment and Received", async ({ browser }) => {
  const seller = await signUp(browser, "sell", "e2eshop");
  await expect(seller).toHaveURL(/\/@e2eshop/);

  await seller.goto("/sell");
  await seller.getByLabel(/what are you selling/i).fill("E2E camera");
  await seller.getByLabel(/^asking price/i).fill("2000000");
  await seller.getByLabel(/^lowest price/i).fill("1500000");
  await seller.locator('input[type="file"]').setInputFiles("seed/photos/camera.jpg");
  await seller.getByRole("button", { name: /seal and publish/i }).click();
  await expect(seller.getByRole("heading", { name: /e2e camera/i })).toBeVisible({ timeout: 60_000 });
  const listingUrl = seller.url();

  const buyer = await signUp(browser, "buy", "e2ebuyer");
  await buyer.goto(listingUrl);
  await buyer.getByRole("button", { name: /make a blind offer/i }).click();
  await buyer.getByLabel("Your offer in Rupiah").fill("1800000");
  await buyer.getByRole("button", { name: /review my offer/i }).click();
  await buyer.getByRole("button", { name: /^lock /i }).click();

  // The simulated matcher draws a price between the two limits; the exact number is random.
  const pay = buyer.getByRole("button", { name: /^pay /i });
  await expect(pay).toBeVisible({ timeout: 90_000 });
  await pay.click();
  await buyer.getByRole("button", { name: /^received$/i }).click();
  await expect(buyer.getByText(/paid out/i)).toBeVisible({ timeout: 60_000 });

  await seller.goto("/");
  await expect(seller.getByText(/e2e camera/i)).toHaveCount(0);
});
