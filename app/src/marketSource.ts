import { relayerUrl } from "./config";
import { httpMarket, mockMarket, type Profile, type ShopListing } from "./market";

const DEMO = "demo.blind-deal.testnet";

const profiles: Profile[] = [
  { handle: "demo", displayName: "Demo Shop", avatarUrl: null, bio: "Pre-loved gear, honest condition notes.", city: "Yogyakarta" },
];

function seed(id: string, title: string, category: ShopListing["category"], hoursAgo: number, extra: Partial<ShopListing> = {}): ShopListing {
  return {
    id,
    sellerAccount: DEMO,
    title,
    description: "",
    category,
    photoUrls: [],
    maxRounds: 2,
    status: "open",
    createdAt: new Date(Date.UTC(2026, 10, 13, 12) - hoursAgo * 3_600_000).toISOString(),
    freeSlots: 3,
    ...extra,
  };
}

// Placeholder items until the relayer is seeded with the real demo shop (MK-31 photos).
const listings: ShopListing[] = [
  seed("seed-camera", "Kamera Fujifilm X-T20", "electronics", 1, { description: "Body only, shutter count 8k." }),
  seed("seed-lens", "Lensa 35mm f/2", "electronics", 2, { description: "Fits Fujifilm X kamera mirrorless." }),
  seed("seed-jacket", "Denim jacket, size M", "fashion", 3, { freeSlots: 0 }),
  seed("seed-chair", "Rattan chair", "home", 4),
  seed("seed-bike", "Sepeda lipat 20 inch", "vehicles", 5, { status: "reserved", freeSlots: 0 }),
  seed("seed-lamp", "Lampu meja vintage", "home", 6, { status: "sold", freeSlots: 0 }),
];

// The screens run on seed data until VITE_RELAYER_URL points at a deployed relayer.
export const market = relayerUrl ? httpMarket(relayerUrl) : mockMarket(listings, profiles);
