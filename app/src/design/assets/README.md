# Design assets

Drawn in Claude Design by Abel (design system "Blind deal", direction G). Screens that use them: the "Final screens (G)" page of the screens canvas. Each SVG names its source in a one-line comment.

## Stickers (`stickers/`)

Illustrations on a 120-unit grid, 144 × 144 viewBox including the white die-cut edge. One thick ink outline (9 units, 7.5% of the width); fills from the detail colours. No text inside.

| File | Means | Used on |
|---|---|---|
| `price-tag.svg` | your number | landing, enter limit (card corner) |
| `clipped-tags.svg` | the deal | deal reveal, landing |
| `hand-under-cloth.svg` | sealed | share link, waiting, landing |
| `four-fingers.svg` | your offer | name yourself |
| `sealed-machine.svg` | proof | proof panel, landing, demo split |
| `escrow-box.svg` | pay | pay, landing |
| `scratch-card.svg` | the reveal | spare |
| `price-pin.svg` | the fair price | landing footer |
| `balance-scale.svg` | fair | deal (desktop), landing footer |

Rules:
- Show them as `<img>` with the file's `aria-label` as `alt`, or `alt=""` when the words next to them say the same thing.
- Add the shadow in CSS: `filter: var(--shadow-sticker);`. Stickers are the only shadowed elements.
- Scale the whole image (56-170 px wide, never under 44 px); tilt between -10° and 10° with `transform: rotate()`.
- Never over text or on a button.

## Icons (`icons/`)

24 px grid, 2-2.2 px round stroke in `currentColor`, so they take the text colour. Always next to a visible label, or on a button with `aria-label`.

| File | Use |
|---|---|
| `back.svg` | back button (phone) |
| `lock.svg` | privacy note |
| `chat.svg` | Share to WhatsApp |
| `check.svg` | done step in a progress list |
| `no-deal.svg` | no-deal line, always with words |

`currentColor` works when the SVG is inlined (for example with `vite-plugin-svgr` or by pasting the markup into a component); as an `<img>`, the icon draws in black.

## Logo (`logo/`)

Option E, "tied together": a pink and a yellow price tag on one ink string, next to the outlined "shake" wordmark (Manrope ExtraBold, -0.04em, converted to paths).

| File | Use |
|---|---|
| `shake-lockup.svg` | header and README on broken white or white |
| `shake-lockup-on-ink.svg` | on the ink background |
| `shake-mark.svg` | the mark alone: avatars, phone header, loading (32 px and up) |
| `shake-wordmark.svg` | the word alone, where the mark is already on screen |

The shadow is built into the files. Keep clear space of 40% of the mark's height on every side, and keep the lockup at least 120 px wide. The favicon (`app/public/favicon.svg`, `favicon-32.png`) drops the die-cut edge so it reads at 16 px; `apple-touch-icon.png` (180) and `icon-512.png` put the mark on the sky tint.
