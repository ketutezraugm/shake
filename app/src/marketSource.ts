import { relayerUrl } from "./config";
import { httpMarket, mockMarket, type Profile, type ShopListing } from "./market";

const DEMO = "demo.blind-deal.testnet";

const profiles: Profile[] = [
  { handle: "demo", displayName: "Demo Shop", avatarUrl: null, bio: "Pre-loved gear, honest condition notes.", city: "Yogyakarta" },
];

const ASKING_PRICES: Record<string, string> = {
  "seed-camera": "4500000",
  "seed-lens": "1800000",
  "seed-jacket": "250000",
  "seed-chair": "600000",
  "seed-bike": "1500000",
  "seed-lamp": "350000",
};

function seed(id: string, title: string, category: ShopListing["category"], hoursAgo: number, extra: Partial<ShopListing> = {}): ShopListing {
  return {
    id,
    askingPrice: ASKING_PRICES[id] ?? "1000000",
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

const answered = (id: number, question: string, answer: string) => ({
  id,
  listingId: "seed-camera",
  question,
  answer,
  answeredAt: "2026-11-13T05:00:00.000Z",
  createdAt: "2026-11-13T04:00:00.000Z",
});

const questions = [
  answered(1, "Bisa COD di Yogyakarta?", "Bisa, ketemu di dekat UGM."),
  answered(2, "Ada lecet di body?", "Ada goresan kecil di belakang, sudah difoto."),
];

// The screens run on seed data until VITE_RELAYER_URL points at a deployed relayer.
export const market = relayerUrl ? httpMarket(relayerUrl) : mockMarket(listings, profiles, questions);
