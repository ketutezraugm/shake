// Proves the marketplace tables are closed to the public anon key and open to the relayer's service key.
// Run: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-db.mjs
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TABLES = ["listings", "slots", "profiles", "questions", "messages"];
const failures = [];

for (const table of TABLES) {
  const read = await anon.from(table).select("*").limit(1);
  if (!read.error && read.data.length > 0) failures.push(`anon can read ${table}`);
  const write = await anon.from(table).insert({});
  if (!write.error) failures.push(`anon can insert into ${table}`);
  const asService = await service.from(table).select("*").limit(1);
  if (asService.error) failures.push(`service role cannot read ${table}: ${asService.error.message}`);
}
const view = await anon.from("listing_cards").select("*").limit(1);
if (!view.error && view.data.length > 0) failures.push("anon can read listing_cards");

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok");
