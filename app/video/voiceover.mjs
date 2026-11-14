// Generates the demo video's voiceover with ElevenLabs: one MP3 per scene into ./vo, which timeline.js places on the
// soundtrack. Run from app/video:  ELEVENLABS_API_KEY=... node voiceover.mjs [voice-id]
// `node voiceover.mjs --voices` lists the voices the key can use.

import { mkdir, writeFile } from "node:fs/promises";

const API = "https://api.elevenlabs.io/v1";
const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("Set ELEVENLABS_API_KEY first.");
  process.exit(1);
}

// Each line fits its scene: the file name is the slot in timeline.js (VOICE), the comment is the room it has.
const LINES = {
  "01-hook":
    "Whoever names a number first, loses. She'd take five million. He'd pay five and a half. Neither says it. No deal.", // 8.9 s
  "02-brand": "This is Shake. Post your price. Keep your floor.", // 4 s
  "03-seller":
    "A seller lists an item with an asking price everyone sees. The lowest price they'd take is sealed on their phone. Nobody sees it, not even us. One link in their bio opens the whole shop.", // 12.8 s
  "04-ask":
    "Buyers can ask the AI assistant anything about the item. Anything except the price. It never knows it.", // 9.5 s
  "05-offer":
    "Then they make a blind offer: the most they'd pay. It's signed with their own NEAR wallet, and encrypted before it leaves the phone.", // 9.7 s
  "06-machine":
    "Inside a sealed machine, public code compares the two numbers. They overlap, so the price lands at random inside the gap.", // 9.2 s
  "07-reveal":
    "Both phones show one fair price. Nobody's number is ever shown.", // 5.1 s
  "08-escrow":
    "The buyer pays into NEAR escrow. Chat opens to arrange the handover. Tap Received: the seller is paid, and the item is sold.", // 12.7 s
  "09-end": "Shake. Post your price. Keep your floor. Built at NEAR Hackathon.", // 6.5 s
};

async function call(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": key, ...init.headers },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res;
}

if (process.argv[2] === "--voices") {
  const { voices } = await (await call("/voices")).json();
  for (const voice of voices)
    console.log(
      `${voice.voice_id}  ${voice.name}  (${Object.values(voice.labels ?? {}).join(", ")})`,
    );
  process.exit(0);
}

// Default: "George", a warm narration voice from the ElevenLabs default library.
const voice = process.argv[2] ?? "JBFqnCBsd6RMkjVDRZzb";
await mkdir(new URL("./vo/", import.meta.url), { recursive: true });
for (const [name, text] of Object.entries(LINES)) {
  const res = await call(
    `/text-to-speech/${voice}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.25 },
      }),
    },
  );
  await writeFile(
    new URL(`./vo/${name}.mp3`, import.meta.url),
    Buffer.from(await res.arrayBuffer()),
  );
  console.log(`vo/${name}.mp3`);
}
