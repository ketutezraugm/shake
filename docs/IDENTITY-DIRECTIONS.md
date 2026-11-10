# Phase 3: Identity directions (Blind deal)

Name is open. Clear per raw/identity-checks.md: Harga Pas, Kode Jari, Sarung (common word). Avoid Bisik (live OTC project), Sealbid. Marosok not yet checked. "Blind deal" is a working title.

## Step 0: context profile
- **Who:** students and ordinary people selling or buying a used item (laptop, motorbike, phone), both sides non-crypto. Second audience: judges watching a split-screen demo on a laptop or projector.
- **Device / setting:** phone, one hand, often mid-WhatsApp chat, sometimes outdoors. Demo: 1280-1920 px laptop, split screen.
- **Session:** 1-3 minutes, once per deal. Very low information density: one item, one number, one result.
- **Cost of mistakes:** medium-high. It's real money and a binding deal, so the number entry must be unmistakable and the confirm step deliberate.
- **Density:** low. **Motion budget:** measured, with one expressive moment (the reveal). **Interaction model:** touch-first, linear, one decision per screen.

## Step 1: defaults we refuse
- (a) **What any AI would make for "private crypto negotiation":** near-black navy, neon green or violet glow, padlock and shield icons, glassmorphism cards, Space Grotesk or Inter, a gradient "secure" hero.
- (b) **What it would make after reading our ban list:** warm cream ground, italic serif display, terracotta accent, "sealed letter" wax-stamp ornaments. Or broadsheet: hairline rules and tiny tracked mono labels.
- Both are spent. No padlocks, shields, wax seals or vault doors anywhere.

## The three directions

### A. Security Tint
- **World:** the inside of security envelopes (payslips, bank PIN mailers, exam results). These are printed with dense blue tint patterns made specifically so nobody can read the number through the paper. Also carbonless copy forms (white / yellow / pink sets).
- **Reference objects (mood only):** PIN mailer interior tint, payslip envelope window, NCR carbonless form set, cheque guilloche, tamper "VOID" tape.
- **Emotion for a judge:** "Of course: the number is hidden the way banks have always hidden numbers."
- **Voice:** plain, dry, exact. Sample: *"Your limit stays inside the envelope. Even we can't open it."* / *"Deal. Rp 4,200,000."*
- **Palette (60/30/10):**
  | Role | Hex | Note |
  |---|---|---|
  | ground / dominant | `#2E4FA3` tint blue | the page is the envelope |
  | surface | `#23408A` | deeper tint for panels |
  | pattern line | `#9DB0E0` | generative tint lines |
  | ink | `#F4F6FB` | 7.03:1 on ground |
  | accent | `#F2D640` carbon-copy yellow | 5.24:1 on ground; dark text `#1B2F66` on it 8.79:1 |
- **Type:** display **Anybody** (Etcetera Type, OFL, Google Fonts), width 150, weight 900 for prices; text **Schibsted Grotesk** (Schibsted, OFL, Google Fonts), 400. Why: extended black numerals read like the printed amount in an envelope window.
- **Signature move:** every screen is an envelope with a window. Your own number shows only through your window; the other side's area is solid tint. The deal price appears in a shared window.
- **Medium:** generative / procedural: tint patterns drawn as real SVG line fields, seeded per deal, so every deal has its own pattern.
- **Icons:** 24 px grid, 2 px stroke, square terminals, built from tint-line fragments; glyph-like, not literal.
- **Motion:** measured. Lines settle, never bounce. **Signature motion:** on a deal, the tint lines over the shared window slide apart sideways (translateX, 700 ms ease-out) and the price is left standing.
- **Category test:** fintech and crypto both default to dark, glowing and padlocked. A saturated mid-blue page made of security tint comes from paper, not from the category.

### B. Under the Sarong
- **World:** *marosok*, the Minangkabau (West Sumatra) cattle-market practice of agreeing a price by finger touches hidden under a sarong or towel, so bystanders never see the number. It's documented (raw/identity-checks.md, goodnewsfromindonesia.id); the Java/Madura version is not, so we don't claim it. Also cattle ear tags: yellow plastic, numbered in marker.
- **Reference objects:** checked sarong cloth (maroon, green, indigo), yellow numbered ear tags, market tarp, marker-written price boards, the broker's handshake.
- **Emotion:** "This is an old human ritual, now with a proof." It's warm, local and confident.
- **Voice:** friendly market talk, short. Sample: *"Shake on it, nobody sees."* / *"Cocok! Rp 4,200,000."* (Bahasa where it's natural.)
- **Palette (55/30/15):**
  | Role | Hex | Note |
  |---|---|---|
  | ground / dominant | `#1E5B3A` sarong green | the page is the cloth |
  | surface | `#174A2F` | |
  | check stripe | `#8E2338` maroon | area only (1.07:1 on green; never text) |
  | ink | `#F3F0E6` | 7.05:1 on green; 7.52:1 on maroon. Off-white ink, not a ground |
  | accent | `#F6C700` ear-tag yellow | text `#1A1A14` on it 10.89:1 |
- **Type:** display **Big Shoulders Display** (Patric King, OFL, Google Fonts) 900 condensed, for ear-tag numerals; text **Familjen Grotesk** (Familjen, OFL, Google Fonts). Why: tall condensed figures are what marker-on-plastic numbers look like.
- **Signature move:** prices live on ear tags. Each side's tag hangs on its own half of a sarong-check grid; the shared result is two tags clipped together.
- **Medium:** bold flat shapes. Check patterns built from our own stripes, plus tag silhouettes.
- **Icons:** filled shapes, 3 px corner radius, literal objects (tag, hand, item).
- **Motion:** the most expressive of the three, still purposeful. Tags hang with a small swing (rotate, ease-out, no overshoot). **Signature motion:** two hands meet under the cloth; the cloth lifts (translateY) to reveal two tags clipped at the deal price.
- **Category test:** no fintech looks like a livestock market. The look comes from one specific place and practice.

### C. Answer Sheet (LJK)
- **World:** Indonesian computer-graded answer sheets (LJK): salmon-red printed grids, bubbles filled with 2B pencil, black timing marks down the edge, the scanner that grades them. Every student knows this object intimately.
- **Reference objects:** LJK sheet, the NIM / ID bubble columns, timing-mark strip, 2B pencil, OMR scanner light bar.
- **Emotion:** "Fill it in, hand it over, the machine decides fairly." It's fair, exact and a little nostalgic.
- **Voice:** instruction-sheet clear. Sample: *"Fill in your limit. Only the machine reads it."* / *"Result: DEAL — Rp 4,200,000."*
- **Palette (50/40/10):**
  | Role | Hex | Note |
  |---|---|---|
  | ground | `#F5F6F4` cool sheet white | *the one light ground; defended: it is the literal LJK paper, kept cool, never cream* |
  | dominant | `#E0475B` LJK red | printed grids and header bands cover ~40% of the page; graphic only (3.71:1) |
  | dominant text | `#C93A4E` | 4.61:1 on ground; white on it 5.00:1 |
  | ink | `#2B2B2E` graphite | 13.02:1 |
  | accent | `#111111` timing-mark black | marks and the filled bubbles |
- **Type:** **Martian Mono** (Evil Martians, OFL, Google Fonts) at both ends: display 800 at width 125, text 300. Why: OMR forms are monospaced by necessity; the weight jump does the hierarchy.
- **Signature move:** you enter your limit by filling bubble columns, digit by digit, like an exam ID. The page edge carries timing marks that double as progress.
- **Medium:** type as image plus technical grid. Bubbles and marks are the art.
- **Icons:** 20 px grid built from bubbles and timing marks, 2 px stroke, round terminals.
- **Motion:** measured, mechanical. **Signature motion:** a scanner bar sweeps down the sheet (translateY, 900 ms linear) and stamps the result as it passes.
- **Category test:** an exam sheet isn't on anyone's list of fintech references, and it speaks to our first real users, students.

## Comparison
| | A Security Tint | B Under the Sarong | C Answer Sheet |
|---|---|---|---|
| Ground | saturated blue | saturated green | cool white + big red areas |
| Type genre | extended grotesk | condensed display | mono |
| Signature | envelope window | ear tags on cloth | bubble entry + scanner |
| Story strength | high (hiding numbers) | highest: a documented centuries-old blind deal | medium-high (students) |
| Build cost for Abel | medium (generative pattern) | medium (pattern + tags) | low-medium |
| Risk | reads "bank-like" | cultural accuracy | the bubble input slows number entry |
