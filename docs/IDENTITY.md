# IDENTITY (locked 2026-11-10)

The spec, not inspiration. Every design and build step reads this. Name: TBD (working title "Blind deal").

**Mix chosen by Abel:** layout and structure from direction B (*marosok*: sarong checks, ear-tag prices, cloth-lift reveal) in the colors of direction A (security-tint blue, carbon-copy yellow). Indigo-check sarongs are real cloth, so the world holds together.

## Context profile
- Users: students and ordinary people selling or buying a used item; both sides non-crypto. Second audience: judges on a laptop or projector, split screen.
- Device: phone, one hand, mid-WhatsApp. Demo: 1280-1920 px.
- Session 1-3 min; one item, one number, one result. Mistakes cost real money: number entry unmistakable, confirm deliberate.
- **Density:** low. **Motion budget:** measured, one expressive moment (the reveal). **Interaction:** touch-first, linear, one decision per screen.

## World
*Marosok*: the Minangkabau (West Sumatra) cattle-market practice where buyer and seller agree a price with finger touches hidden under a sarong or towel (source: raw/identity-checks.md). Materials: indigo-check sarong cloth, yellow plastic cattle ear tags numbered in marker, the handshake. We claim West Sumatra only.

## Color tokens
| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--ground` | `#2E4FA3` | page; dominant ~55% | ink 7.03:1 |
| `--surface` | `#23408A` | panels, phone cards | ink 8.94:1 |
| `--check` | `#1B2F66` | sarong check stripes (area); text on yellow | ink 11.81:1 |
| `--line` | `#9DB0E0` | thin pattern lines, dividers; large text only | 3.52:1 on ground |
| `--ink` | `#F4F6FB` | text, icons | |
| `--ink-muted` | `#C9D4F0` | secondary text | 5.12:1 on ground |
| `--tag` | `#F2D640` | ear tags, primary buttons; ~15% | 5.24:1 on ground; `--check` text on it 8.79:1 |
| `--danger` | `#FFC9BF` | "No deal", errors (always with text, never color alone) | 5.20:1 on ground |

Area split: ground 55 / surface + checks 30 / tag 15. Yellow appears only for the user's own price, the deal price, and primary actions.

## Typography
- **Display:** Big Shoulders Display (Patric King, OFL, https://fonts.google.com/specimen/Big+Shoulders+Display). 900 for prices and headlines, 200 for the "Rp" unit and quiet numerals. Uppercase headlines. Why: tall condensed figures are marker numbers on ear tags.
- **Text:** Familjen Grotesk (Familjen, OFL, https://fonts.google.com/specimen/Familjen+Grotesk). 400 body, 700 labels and buttons.
- Self-host both as woff2 (`font-display: swap`, size-adjusted fallback to avoid layout shift). Numbers use `font-variant-numeric: tabular-nums`.
- Scale (px): 13 · 16 · 20 · 28 · 48 · 96 · 160 (deal price on the demo screen). Phone: price 96, headline 48, body 16-20.
- Line height: display 0.86-0.92, text 1.45.

## Space, shape
- Spacing scale (px): 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Phone gutter 20.
- Radius: buttons 3; panels and phone cards 20; **ear tag** = 8 top corners, 40 bottom corners, plus a punched hole (circle 16 px in `--surface`).
- No shadows. Depth comes from the cloth layer sitting over the tags.
- Touch targets ≥ 48 px.

## Signature move
Prices are ear tags on cloth. Each side's own tag hangs on its half of a sarong-check field; the other side's half is plain cloth with no tag, so nothing is shown. The deal result is two tags clipped together showing one price. Every screen is built around the tag: entry screen = writing on your tag; waiting = your tag under the cloth; result = the joined tags.

## Signature motion: the reveal
1. Both sides confirmed: the cloth over the shared area lifts (`translateY(-100%)`, 600 ms, `--ease-out`).
2. Tags fade in already joined (`opacity`, 200 ms), then swing once (`rotate(-4deg)` → `0`, 300 ms, `--ease-out`, origin = the punched hole). No overshoot.
3. The price is shown whole; it does not count up.
4. "No deal": the cloth stays down, one line of `--danger` text appears (200 ms fade). Nothing else moves.

## Motion tokens
| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 100 ms | press, hover, toggles |
| `--dur-quick` | 200 ms | state changes, fades |
| `--dur-deliberate` | 400 ms | screen changes |
| `--dur-reveal` | 600 ms | cloth lift (the only long move) |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | entering |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | leaving |
| `--ease-std` | `cubic-bezier(0.2, 0, 0, 1)` | on-screen moves |

Rules: animate only `transform` and `opacity`; no springs; nothing blocks input; a repeated action skips its animation. `prefers-reduced-motion`: the cloth lift and tag swing become a 200 ms crossfade; nothing loops.

## Icon language
24 px grid, filled flat shapes, 3 px corner radius, literal objects (ear tag, hidden hand, item, two clipped tags, escrow box). One color per icon. Drawn in Claude Design; no libraries.

## Art direction
Bold flat shapes: check patterns built from our own stripes (rendered as real CSS/SVG patterns, not textures), tag silhouettes, hands as simple shapes. No photos, no paper grain, no faked fabric texture.

## Voice
Short, friendly market talk; Bahasa where it's natural. "Cocok!" on a deal. Examples: *"Shake on it. Nobody sees."* / *"Your number stays under the cloth. Even we can't lift it."* / *"No deal: your ranges didn't meet. Neither of you learns more than that."*

## Not this
- Default (a): near-black navy, neon glow, padlocks, shields, glassmorphism, Space Grotesk or Inter.
- Default (b): cream ground, italic serif, terracotta, wax seals, broadsheet hairlines and tracked mono labels.
- Rejected: direction A's envelope-window layout and Anybody type; direction B's green and maroon palette; direction C (answer sheet) entirely.
- Anything from PLAYBOOK section 6.
