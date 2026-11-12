# IDENTITY (direction G, approved 2026-11-12)

The spec, not inspiration. Every design and build step reads this. Name: Shake (approved in #42; the working title was "Blind deal"). Replaces the 2026-11-10 marosok blue-and-yellow identity (Ezra approved the change in issue #32). Living reference with previews: the Blind deal design system artifact (https://claude.ai/artifact/C52dyDv46uwPsNeJzL1Rgi); screens: https://claude.ai/artifact/2a84fxGdsY2sezcJvjVAaG, page "New directions", row G.

**Direction G, "broken white & ink":** a clean light app with one dark action colour, and fun reserved for the details (stickers, confetti dots, small tints).

## Context profile
- Users: students and ordinary people selling or buying a used item; both sides non-crypto. Second audience: judges on a laptop or projector, split screen.
- Device: phone, one hand, mid-WhatsApp. Demo: 1280-1920 px.
- Session 1-3 min; one item, one number, one result. Mistakes cost real money: number entry unmistakable, confirm deliberate.
- **Density:** low. **Motion budget:** measured, one expressive moment (the reveal). **Interaction:** touch-first, linear, one decision per screen.

## Color tokens
| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--ground` | `#F7F6F2` | page background, a neutral broken white | ink 15.7:1 |
| `--surface` | `#FFFFFF` | cards, sheets, sticker die-cut edge | |
| `--line` | `#E8E6E0` | 1px card and pill borders (decoration only) | |
| `--ink` | `#1D1C1A` | text, primary buttons, sticker outlines | 15.7:1 on ground |
| `--ink-muted` | `#5E5B55` | secondary text, "Rp" units | 6.3:1 on ground, 6.8:1 on surface |
| `--on-ink` | `#F7F6F2` | text on ink buttons | 15.7:1 |
| `--deal` | `#2D6A4F` | the deal price and success text only | 6.4:1 on surface |
| `--danger` | `#B42318` | "No deal", errors, always with words | 6.1:1 on ground |
| `--sun` `--sky` `--coral` `--pink` `--mint` | `#FFD23F` `#8EC9F5` `#FF8A65` `#F7B8D2` `#D3E8DA` | sticker fills and confetti dots | never text |
| `--sun-tint` `--sky-tint` `--pink-tint` | `#FFF1B8` `#DDEEFC` `#FCE1EC` | small chip and label grounds, ink text | ink 15.0 / 13.9:1 |
| `--mint-ink` / `--sky-ink` | `#173B2B` / `#12406B` | text on mint / sky-tint | 9.6:1 / 9.0:1 |

Kept for code written against the first identity: `--tag` = `--ink` (primary action fill) and `--check` = `--ground` (field ground, text on ink). New code uses the role names above.

Rule: the five detail colours never colour text, buttons or whole panels. A screen stays ground, surface and ink; colour appears only in stickers, dots and small tints.

## Typography
- **One family: Manrope** (Mikhail Sharanda, OFL, https://fonts.google.com/specimen/Manrope), self-hosted as a Latin variable woff2 (400-800) in `app/public/fonts/` with its licence, `font-display: swap` and a metric-matched Arial fallback.
- Weights: 800 headings and amounts, 700 buttons, 600 labels, 400 text.
- Scale (px): 13 · 14 · 16 · 17 · 20 · 28 · 40 · 48. Phone: title 40, heading 28, typed amount 40, deal price 48, body 16-17.
- Headings: tracking -0.03em, leading 1.05, sentence case. Text leading 1.55. Numbers use `font-variant-numeric: tabular-nums`, Rupiah with dots (Rp 4.200.000).

## Space, shape
- Spacing scale (px): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Phone gutter 20.
- Radius: buttons and chips fully round (`--radius-button` 999px); fields 12; cards 20; the one hero card per screen 24.
- Cards are `--surface` with a 1px `--line` border. No shadows except stickers.
- Touch targets ≥ 48 px.

## Stickers (the illustration system)
Nine literal objects: price tag (your number), clipped tags (deal), hand under a cloth (sealed), four-finger hand sign (your offer), sealed-machine chip (proof), escrow box with coin (pay), scratch card (reveal), price pin (fair price), balance scale (fair).
- One thick `--ink` outline, `--sticker-outline` = 9 units on the 120-unit grid (7.5% of the width); inner details and gaps use the same width; round joins and caps.
- Flat fills from the detail colours and white, one main colour each, no text or numbers inside.
- White die-cut edge (`--sticker-edge`, 6 units) and `--shadow-sticker` (two drop-shadow filters). Stickers are the only shadowed elements.
- One to three per screen, tilted −10° to 10°, never over text or on a button, never below 44 px. Scale the whole drawing.
- Exported as SVG into `app/src/assets/` with a one-line source note.

## Signature move
Your number goes on a tag only you can see; the deal is two tags clipped together showing one price. The reveal screen is one white hero card holding the clipped-tags sticker, "It's a deal", and the price in `--deal` green, with up to four confetti dots.

## Signature motion: the shake
The brand's one move: things shake hands. Specs and a replayable demo: screens canvas, page "Brand: motion and logo".
1. **Sticker pop-shake.** The first time a sticker enters the screen it pops in and wiggles once: scale 0.55 → 1.08 → 0.97 → 1, rotate −10° → +6° → −4° → +2° → −1° → 0, opacity 0 → 1 (`--dur-pop` 640 ms, `--ease-pop`, `--pop-stagger` 90 ms between stickers). Never again in the same session.
2. **Deal handshake.** When a deal lands, the deal card (with its clipped-tags sticker) bounces once vertically: translateY −10 → +8 → −6 → +3 → −1 → 0 px (`--dur-handshake` 560 ms, `--ease-handshake`, starting `--handshake-delay` 520 ms after the reveal). A phone may add one short vibration. Vertical only: a sideways shake means "wrong" (error) and is never used for a deal.
3. The price fades in (`opacity`, 200 ms); it is shown whole and does not count up.
4. "No deal": no sticker, no shake, one line of `--danger` text fades in (200 ms).

## Motion tokens
| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 100 ms | press, hover, toggles |
| `--dur-quick` | 200 ms | state changes, fades |
| `--dur-deliberate` | 400 ms | screen changes |
| `--dur-reveal` | 600 ms | longest screen-level move |
| `--dur-pop` / `--ease-pop` / `--pop-stagger` | 640 ms / `cubic-bezier(0.2, 0.7, 0.2, 1)` / 90 ms | sticker pop-shake |
| `--dur-handshake` / `--ease-handshake` / `--handshake-delay` | 560 ms / `cubic-bezier(0.3, 0.6, 0.3, 1)` / 520 ms | deal handshake |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entering |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | leaving |
| `--ease-std` | `cubic-bezier(0.2, 0, 0, 1)` | on-screen moves |

Rules: animate only `transform` and `opacity`; overshoot only in the sticker pop-shake and the deal handshake; nothing blocks input; a repeated action skips its animation. `prefers-reduced-motion`: stickers fade in over 200 ms with no wiggle, the handshake is skipped; nothing loops.

## Icon language
UI icons (back, lock, share): 24 px line icons, 2-2.2 px `--ink` stroke, round caps, always labelled. Stickers are illustration, not icons. Drawn in Claude Design; no icon libraries.

## Voice
Short, friendly, plain; Bahasa where it's natural ("Cocok!" on a deal). Examples: *"Agree on a price without showing yours."* / *"Only you will ever see this number."* / *"No deal this round. Your numbers didn't meet, and neither of you learns more than that."* Never say TEE, enclave, wallet or gas in the main flow.

## Not this
- Cream ground with a serif display and terracotta; near-black with one acid accent; purple-blue gradients.
- Full-colour screens (the first identity's all-blue ground was hard to read for long).
- Detail colours on text, buttons or large panels; shadows on cards or buttons; emoji; padlock-and-shield security clichés as illustrations.
- Anything from PLAYBOOK section 6.
