// Source: the app's tab-bar glyphs and Abel's UI icons (design/assets/icons), 24 px grid, round stroke in currentColor.

const stroke = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const GridIcon = () => (
  <svg {...stroke}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
);

export const BubbleIcon = () => (
  <svg {...stroke}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" />
  </svg>
);

export const HeartIcon = () => (
  <svg {...stroke}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </svg>
);

export const TagIcon = () => (
  <svg {...stroke}>
    <path d="M4 12.5V5a1 1 0 0 1 1-1h7.5L20 11.5 12.5 19z" />
    <circle cx="8.5" cy="8.5" r="1.2" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...stroke} strokeWidth={2.2}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/** Abel's "back" chevron, mirrored to point forward. */
export const ForwardIcon = () => (
  <svg {...stroke} strokeWidth={2.2}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
