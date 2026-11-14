// The demo's timeline. Every move is a Web Animation created at load with its start as a delay, so the whole film is
// one clock: it plays by itself in a browser, and window.__seek(t) poses any frame exactly for render.mjs.
// Motion follows IDENTITY.md: transform and opacity only, the tokens' curves, and the sticker pop-shake springs.

const DURATION = 80;

const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const IN = "cubic-bezier(0.7, 0, 0.84, 0)";
const STD = "cubic-bezier(0.2, 0, 0, 1)";
const SWEEP = "cubic-bezier(0.65, 0, 0.35, 1)";
const HANDSHAKE = "cubic-bezier(0.3, 0.6, 0.3, 1)";
// The sticker pop's two springs, copied from styles/stickers.css.
const SPRING_SCALE =
  "linear(0, 0.05, 0.175, 0.343, 0.525, 0.7, 0.853, 0.977, 1.068, 1.126, 1.156, 1.163, 1.152, 1.13, 1.102, 1.073, 1.044, 1.02, 1.001, 0.987, 0.978, 0.974, 0.974, 0.976, 0.979, 0.984, 0.989, 0.993, 0.997, 1, 1.002, 1.004, 1)";
const SPRING_TURN =
  "linear(0, 0.063, 0.233, 0.471, 0.739, 1, 1.221, 1.382, 1.472, 1.491, 1.446, 1.353, 1.23, 1.097, 0.972, 0.87, 0.798, 0.762, 0.761, 0.789, 0.84, 0.902, 0.967, 1.027, 1.074, 1.105, 1.119, 1.116, 1.099, 1.072, 1.041, 1.009, 0.981, 0.959, 0.946, 0.941, 0.945, 0.954, 0.968, 0.984, 1)";

function els(target) {
  if (Array.isArray(target)) return target.flatMap(els);
  if (typeof target !== "string") return [target];
  const found = [...document.querySelectorAll(target)];
  if (!found.length) throw new Error(`Nothing matches ${target}`);
  return found;
}

// Every animation holds its end state ("forwards"); before it starts, the element's CSS applies. A later animation on
// the same property wins once it starts, so an element can enter, change and leave on one timeline.
function anim(target, start, dur, keyframes, easing = OUT) {
  for (const el of els(target))
    el.animate(keyframes, {
      delay: start * 1000,
      duration: Math.max(dur * 1000, 1),
      fill: "forwards",
      easing,
    });
}

const inUp = (t, s, d = 0.7, y = 50) =>
  anim(t, s, d, [
    { opacity: 0, translate: `0 ${y}px` },
    { opacity: 1, translate: "0 0" },
  ]);
const outUp = (t, s, d = 0.4, y = -40) =>
  anim(
    t,
    s,
    d,
    [
      { opacity: 1, translate: "0 0" },
      { opacity: 0, translate: `0 ${y}px` },
    ],
    IN,
  );
const fadeIn = (t, s, d = 0.4) =>
  anim(t, s, d, [{ opacity: 0 }, { opacity: 1 }], STD);
const fadeOut = (t, s, d = 0.35) =>
  anim(t, s, d, [{ opacity: 1 }, { opacity: 0 }], STD);
const show = (t, s) =>
  anim(t, s, 0, [{ opacity: 0 }, { opacity: 1 }], "linear");
const hide = (t, s) =>
  anim(t, s, 0, [{ opacity: 1 }, { opacity: 0 }], "linear");

/** The brand's pop-shake: scale and turn as two springs, solid within 200 ms. `data-rot` is the sticker's resting tilt. */
function pop(t, s, from = 0.55) {
  for (const el of els(t)) {
    const rest = Number(el.dataset.rot ?? 0);
    anim(el, s, 0.64, [{ scale: from }, { scale: 1 }], SPRING_SCALE);
    anim(
      el,
      s,
      0.64,
      [{ rotate: `${rest - 10}deg` }, { rotate: `${rest}deg` }],
      SPRING_TURN,
    );
    anim(el, s, 0.2, [{ opacity: 0 }, { opacity: 1 }], "linear");
  }
}

/** A tap: the control dips to 0.96 and springs back. */
const press = (t, s) =>
  anim(
    t,
    s,
    0.32,
    [{ scale: 1 }, { scale: 0.95, offset: 0.35 }, { scale: 1 }],
    STD,
  );

/** Types `text` into `el` one character at a time from `s`; returns when the last character lands. */
function type(t, s, text, perSecond = 16) {
  const el = els(t)[0];
  el.textContent = "";
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.className = "ch";
    span.textContent = char;
    el.append(span);
    show(span, s + i / perSecond);
  });
  return s + text.length / perSecond;
}

/** A phone screen slides in from the right over the one before it. */
const slideIn = (t, s) =>
  anim(t, s, 0.55, [{ translate: "100% 0" }, { translate: "0 0" }]);
const slideOut = (t, s) =>
  anim(t, s, 0.5, [{ translate: "0 0" }, { translate: "100% 0" }], IN);

/** The phone arrives from the right with a small tilt and leaves upward. */
const phoneIn = (t, s) =>
  anim(t, s, 0.9, [
    { opacity: 0, translate: "520px 0", rotate: "6deg" },
    { opacity: 1, translate: "0 0", rotate: "0deg" },
  ]);
const phoneOut = (t, s) =>
  anim(
    t,
    s,
    0.5,
    [
      { opacity: 1, translate: "0 0" },
      { opacity: 0, translate: "0 -80px" },
    ],
    IN,
  );

/** The camera leans in on the phone (toward its CSS transform-origin) from `s`, and back out at `back`. */
function push(t, s, back, to = 1.3) {
  anim(t, s, 0.9, [{ scale: 1 }, { scale: to }], STD);
  anim(t, back, 0.7, [{ scale: to }, { scale: 1 }], STD);
}

/** A copy block's headline swap: the old line leaves up, the new one rises. */
function swap(from, to, s) {
  outUp(from, s);
  inUp(to, s + 0.2);
}

// 1. Hook (0 to 7.6)
function hook() {
  show("#s1", 0);
  [...document.querySelectorAll("#hook1 span")].forEach((word, i) =>
    inUp(word, 0.3 + i * 0.3, 0.6, 70),
  );
  anim("#hook2", 1.9, 0.64, [{ scale: 0.6 }, { scale: 1 }], SPRING_SCALE);
  anim("#hook2", 1.9, 0.2, [{ opacity: 0 }, { opacity: 1 }], "linear");
  pop("#s1-tag", 2.15);
  pop("#s1-fingers", 2.3);
  outUp(["#hook1", "#hook2"], 3.6, 0.45, -80);
  fadeOut(["#s1-tag", "#s1-fingers"], 3.6);
  const lines = [...document.querySelectorAll("#hook3 div")];
  inUp(lines[0], 3.95);
  inUp(lines[1], 4.45);
  inUp("#hook4", 5.4);
  pop("#hook4 .nodeal", 6.1, 0.7);
  outUp(["#hook3", "#hook4"], 7.0, 0.4, -60);
  hide("#s1", 7.9);
}

// 2. Brand (7.3 to 12.2): the ink panel rises, the wordmark writes itself, stickers land.
function brand() {
  show("#s2", 7.3);
  anim("#s2-panel", 7.3, 0.75, [{ translate: "0 100%" }, { translate: "0 0" }]);
  anim(
    "#s2-curtain",
    8.1,
    0.7,
    [{ translate: "0 0" }, { translate: "101% 0" }],
    "linear",
  );
  ["#s2-a", "#s2-b", "#s2-c", "#s2-d"].forEach((id, i) =>
    pop(id, 8.9 + i * 0.18),
  );
  inUp("#s2-tag", 9.3);
  anim(
    "#s2-panel",
    11.5,
    0.65,
    [{ translate: "0 0" }, { translate: "0 -100%" }],
    SWEEP,
  );
  hide("#s2", 12.2);
}

// 3. The seller lists and seals a floor (11.5 to 25)
function seller() {
  show("#s3", 11.5);
  phoneIn("#s3-phone", 11.9);
  inUp("#s3-step", 12.0, 0.6, 30);
  inUp("#s3-h1", 12.15);
  inUp("#s3-c1", 12.5);
  pop("#s3-p1", 12.7, 0.7);
  pop("#s3-p2", 12.85, 0.7);

  show("#s3-r1", 13.2);
  type("#s3-t1", 13.3, "Fujifilm X-T20 camera", 24);
  hide("#s3-r1", 14.4);
  show("#s3-r2", 14.5);
  type("#s3-t2", 14.6, "6.000.000", 12);
  hide("#s3-r2", 15.5);

  swap("#s3-h1", "#s3-h2", 16.0);
  swap("#s3-c1", "#s3-c2", 16.1);
  push("#s3-phone", 16.1, 19.5);
  show("#s3-r3", 16.4);
  type("#s3-t3", 16.5, "5.000.000", 12);
  // The seal: the digits drop away, five dots and the lock take their place, and the cloth covers the field.
  anim(
    "#s3-t3",
    17.9,
    0.35,
    [
      { opacity: 1, translate: "0 0" },
      { opacity: 0, translate: "0 18px" },
    ],
    IN,
  );
  inUp("#s3-dots", 18.2, 0.45, -16);
  pop("#s3-lock", 18.35);
  pop("#s3-cloth", 18.5);
  fadeIn("#s3-sealnote", 18.7);
  hide("#s3-r3", 19.4);
  press("#s3-btn", 19.7);
  slideIn("#s3-listing", 20.1);

  swap("#s3-h2", "#s3-h3", 21.3);
  swap("#s3-c2", "#s3-c3", 21.4);
  inUp("#s3-bio", 21.9, 0.7, 60);
  pop("#s3-pin", 22.3);

  outUp(["#s3-step", "#s3-h3", "#s3-c3"], 24.3);
  fadeOut(["#s3-bio", "#s3-pin"], 24.3);
  phoneOut("#s3-phone", 24.4);
  hide("#s3", 25.0);
}

// 4. A buyer asks the assistant (24.8 to 35)
function ask() {
  show("#s4", 24.8);
  anim("#s4-phone", 24.9, 0.9, [
    { opacity: 0, translate: "0 700px" },
    { opacity: 1, translate: "0 0" },
  ]);
  inUp("#s4-step", 25.1, 0.6, 30);
  inUp("#s4-h1", 25.25);
  inUp("#s4-q1", 26.2, 0.45, 24);
  fadeIn("#s4-d1", 26.9, 0.2);
  for (let k = 0; k < 3; k++)
    anim(
      `#s4-d1 i:nth-child(${k + 1})`,
      26.9 + k * 0.12,
      0.9,
      [
        { translate: "0 0" },
        { translate: "0 -6px" },
        { translate: "0 0" },
        { translate: "0 -6px" },
        { translate: "0 0" },
      ],
      "linear",
    );
  hide("#s4-d1", 27.9);
  inUp("#s4-a1", 27.9, 0.45, 16);
  inUp("#s4-q2", 29.3, 0.45, 24);
  inUp("#s4-h2", 29.5);
  fadeIn("#s4-d2", 30.0, 0.2);
  for (let k = 0; k < 3; k++)
    anim(
      `#s4-d2 i:nth-child(${k + 1})`,
      30.0 + k * 0.12,
      0.9,
      [
        { translate: "0 0" },
        { translate: "0 -6px" },
        { translate: "0 0" },
        { translate: "0 -6px" },
        { translate: "0 0" },
      ],
      "linear",
    );
  hide("#s4-d2", 31.0);
  inUp("#s4-a2", 31.0, 0.45, 16);
  inUp("#s4-c1", 31.4);
  inUp("#s4-btn", 32.2, 0.5, 20);
  press("#s4-btn", 33.6);

  outUp(["#s4-step", "#s4-h1", "#s4-h2", "#s4-c1"], 34.2);
  phoneOut("#s4-phone", 34.2);
  hide("#s4", 34.9);
}

// 5. The blind offer: type, lock, sign, encrypt (34.7 to 45)
function offer() {
  show("#s5", 34.7);
  phoneIn("#s5-phone", 34.8);
  inUp("#s5-step", 35.0, 0.6, 30);
  inUp("#s5-h1", 35.15);
  inUp("#s5-c1", 35.5);
  push("#s5-phone", 35.8, 37.4);
  show("#s5-r1", 36.0);
  type("#s5-t1", 36.1, "5.500.000", 12);
  hide("#s5-r1", 37.2);
  press("#s5-btn1", 37.6);
  slideIn("#s5-b", 37.9);
  press("#s5-btn2", 39.0);

  fadeIn("#s5-dim", 39.3, 0.3);
  anim("#s5-sheet", 39.3, 0.55, [
    { translate: "0 110%" },
    { translate: "0 0" },
  ]);
  swap("#s5-h1", "#s5-h2", 39.5);
  swap("#s5-c1", "#s5-c2", 39.6);
  press("#s5-approve", 40.6);
  anim(
    "#s5-sheet",
    40.95,
    0.4,
    [{ translate: "0 0" }, { translate: "0 110%" }],
    IN,
  );
  fadeOut("#s5-dim", 41.0, 0.3);
  slideIn("#s5-c", 41.0);

  // Encrypting: the amount scrambles through ciphertext and settles on one.
  hide("#s5-plain", 41.9);
  const frames = [...document.querySelectorAll("#s5-c .cx")];
  frames.forEach((frame, i) => {
    show(frame, 41.9 + i * 0.13);
    if (i < frames.length - 1) hide(frame, 41.9 + (i + 1) * 0.13);
  });
  pop("#s5-lock", 42.9);
  fadeIn("#s5-enc", 43.0);
  // The sealed offer leaves the phone, toward the machine in the next scene.
  anim(
    "#s5-c .card",
    44.0,
    0.6,
    [
      { translate: "0 0", opacity: 1 },
      { translate: "700px 0", opacity: 0 },
    ],
    IN,
  );
  outUp(["#s5-step", "#s5-h2", "#s5-c2"], 44.1);
  phoneOut("#s5-phone", 44.3);
  hide("#s5", 45.0);
}

// 6. The sealed machine compares, and the price lands inside the overlap (44.8 to 53.6)
function machine() {
  show("#s6", 44.8);
  inUp("#s6-h", 44.9);
  pop("#s6-machine", 45.1, 0.5);
  anim("#s6-left", 45.4, 0.7, [
    { opacity: 0, translate: "-500px 0" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim("#s6-right", 45.6, 0.7, [
    { opacity: 0, translate: "500px 0" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim(
    "#s6-left",
    46.3,
    0.45,
    [
      { opacity: 1, translate: "0 0", scale: 1 },
      { opacity: 0, translate: "420px 20px", scale: 0.3 },
    ],
    IN,
  );
  anim(
    "#s6-right",
    46.5,
    0.45,
    [
      { opacity: 1, translate: "0 0", scale: 1 },
      { opacity: 0, translate: "-300px 20px", scale: 0.3 },
    ],
    IN,
  );
  inUp("#s6-sub", 46.6, 0.6, 20);
  // The shake: the machine rattles twice while it compares.
  for (const start of [47.0, 47.75]) {
    anim(
      "#s6-machine",
      start,
      0.7,
      [
        { rotate: "0deg" },
        { rotate: "-9deg" },
        { rotate: "8deg" },
        { rotate: "-6deg" },
        { rotate: "4deg" },
        { rotate: "0deg" },
      ],
      "linear",
    );
  }

  fadeIn("#s6-line", 48.6, 0.4);
  anim("#s6-m1", 48.8, 0.5, [
    { opacity: 0, translate: "0 30px" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim("#s6-m2", 49.1, 0.5, [
    { opacity: 0, translate: "0 30px" },
    { opacity: 1, translate: "0 0" },
  ]);
  fadeIn("#s6-only", 49.4);
  anim("#s6-band", 49.7, 0.6, [{ scale: "0 1" }, { scale: "1 1" }]);
  // The draw: the marker runs inside the overlap, then lands at random (here, Rp 5.200.000).
  fadeIn("#s6-ball", 50.3, 0.15);
  anim(
    "#s6-ball",
    50.3,
    1.8,
    [
      { translate: "275px 0" },
      { translate: "530px 0", offset: 0.22 },
      { translate: "300px 0", offset: 0.45 },
      { translate: "470px 0", offset: 0.66 },
      { translate: "360px 0", offset: 0.84 },
      { translate: "385px 0" },
    ],
    "cubic-bezier(0.3, 0.1, 0.3, 1)",
  );
  anim("#s6-landed", 52.1, 0.64, [{ scale: 0.6 }, { scale: 1 }], SPRING_SCALE);
  anim("#s6-landed", 52.1, 0.2, [{ opacity: 0 }, { opacity: 1 }], "linear");
  inUp("#s6-cap", 50.6, 0.6, 24);

  anim(
    "#s6",
    53.2,
    0.4,
    [
      { opacity: 1, scale: 1 },
      { opacity: 0, scale: 1.06 },
    ],
    IN,
  );
}

// 7. The reveal on both phones, with a handshake (53.4 to 60)
function reveal() {
  show("#s7", 53.4);
  anim("#s7-p1", 53.5, 0.8, [
    { opacity: 0, translate: "0 500px" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim("#s7-p2", 53.62, 0.8, [
    { opacity: 0, translate: "0 500px" },
    { opacity: 1, translate: "0 0" },
  ]);
  inUp(["#s7-w1", "#s7-w2"], 53.9, 0.5, 20);
  pop("#s7-st1", 54.2);
  pop("#s7-st2", 54.3);
  document
    .querySelectorAll(".s7-t")
    .forEach((el, i) => inUp(el, 54.5 + i * 0.12, 0.5, 20));
  document
    .querySelectorAll(".s7-u")
    .forEach((el, i) => inUp(el, 54.55 + i * 0.12, 0.5, 20));
  confetti(54.3);
  // The handshake: both phones dip together, once, like two hands shaking on it.
  anim(
    ["#s7-p1", "#s7-p2"],
    55.6,
    0.56,
    [
      { translate: "0 0" },
      { translate: "0 26px" },
      { translate: "0 -10px" },
      { translate: "0 0" },
    ],
    HANDSHAKE,
  );
  inUp("#s7-cap", 56.3);
  anim("#s7", 59.4, 0.45, [{ opacity: 1 }, { opacity: 0 }], STD);
}

function confetti(start) {
  const box = document.querySelector("#s7-confetti");
  const colours = [
    "var(--sun)",
    "var(--sky)",
    "var(--coral)",
    "var(--pink)",
    "var(--mint)",
  ];
  // Two bursts, from where each phone's sticker sits (the pair is scaled to 0.82 from the top centre).
  const origins = [
    [960 + (430 + 250 - 960) * 0.82, (60 + 330) * 0.82],
    [960 + (1000 + 250 - 960) * 0.82, (60 + 330) * 0.82],
  ];
  let seed = 7;
  const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  origins.forEach(([x, y], o) => {
    for (let i = 0; i < 16; i++) {
      const dot = document.createElement("i");
      dot.className = "confetti";
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      dot.style.background = colours[i % colours.length];
      box.append(dot);
      const angle = rand() * Math.PI * 2;
      const dist = 120 + rand() * 170;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const s = start + o * 0.1 + rand() * 0.08;
      anim(dot, s, 1.1, [
        { opacity: 1, translate: "0 0", scale: 1 },
        {
          opacity: 1,
          translate: `${dx * 0.8}px ${dy * 0.8}px`,
          scale: 1,
          offset: 0.6,
        },
        { opacity: 0, translate: `${dx}px ${dy + 60}px`, scale: 0.6 },
      ]);
    }
  });
}

// 8. Escrow, chat, Received, Sold (59.8 to 70)
function escrow() {
  show("#s8", 59.8);
  phoneIn("#s8-phone", 59.9);
  inUp("#s8-step", 60.1, 0.6, 30);
  inUp("#s8-h1", 60.25);
  inUp("#s8-c1", 60.6);
  pop("#s8-box", 60.9);
  show("#s8-paid", 61.6);
  anim("#s8-paid", 61.6, 0.4, [{ scale: "0.6 1" }, { scale: "1 1" }]);
  show("#s8-held", 62.2);
  anim("#s8-held", 62.2, 0.4, [{ scale: "0.6 1" }, { scale: "1 1" }]);

  slideIn("#s8-chat", 63.2);
  swap("#s8-h1", "#s8-h2", 63.3);
  swap("#s8-c1", "#s8-c2", 63.4);
  inUp("#s8-m1", 63.9, 0.45, 24);
  inUp("#s8-m2", 64.7, 0.45, 24);
  inUp("#s8-m3", 65.4, 0.45, 24);
  slideOut("#s8-chat", 66.1);

  press("#s8-btn", 66.5);
  hide("#s8-held", 66.75);
  show("#s8-recv", 66.75);
  anim("#s8-recv", 66.75, 0.4, [{ scale: "0.6 1" }, { scale: "1 1" }]);
  swap("#s8-h2", "#s8-h3", 66.6);
  swap("#s8-c2", "#s8-c3", 66.7);
  slideIn("#s8-done", 67.1);
  document
    .querySelectorAll(".s8-r")
    .forEach((el, i) => inUp(el, 67.6 + i * 0.2, 0.45, 14));
  inUp("#s8-listing", 68.3, 0.5, 20);
  pop("#s8-sold", 68.7, 1.5);

  outUp(["#s8-step", "#s8-h3", "#s8-c3"], 69.6);
  phoneOut("#s8-phone", 69.6);
  hide("#s8", 70.2);
}

// 9. Recap, then the end card (70 to 80)
function end() {
  show("#s9", 70.0);
  ["#r1", "#r2", "#r3", "#r4"].forEach((id, i) => {
    const s = 70.25 + i * 0.42;
    anim(id, s, 0.64, [{ scale: 0.6 }, { scale: 1 }], SPRING_SCALE);
    anim(id, s, 0.15, [{ opacity: 0 }, { opacity: 1 }], "linear");
    const img = document.querySelector(`${id} img`);
    img.dataset.rot = String(i % 2 ? 8 : -8);
    pop(img, s + 0.12);
  });
  anim(
    "#s9-panel",
    72.5,
    0.75,
    [{ translate: "0 100%" }, { translate: "0 0" }],
    SWEEP,
  );
  anim(
    "#s9-curtain",
    73.3,
    0.7,
    [{ translate: "0 0" }, { translate: "101% 0" }],
    "linear",
  );
  ["#s9-a", "#s9-b", "#s9-c", "#s9-d"].forEach((id, i) =>
    pop(id, 74.0 + i * 0.18),
  );
  inUp("#s9-tag", 74.1);
  inUp("#s9-l1", 74.6, 0.6, 24);
  inUp("#s9-l2", 75.0, 0.6, 24);
  inUp("#s9-l3", 75.4, 0.6, 24);
}

function build() {
  hook();
  brand();
  seller();
  ask();
  offer();
  machine();
  reveal();
  escrow();
  end();
}

/** Poses every animation at `t` seconds and holds it there. */
function seek(t) {
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
}

// Fit the 1920 × 1080 stage to the window, letterboxed.
function fit() {
  const stage = document.getElementById("stage");
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${scale})`;
  stage.style.left = `${(innerWidth - 1920 * scale) / 2}px`;
  stage.style.top = `${(innerHeight - 1080 * scale) / 2}px`;
}

async function start() {
  await document.fonts.ready;
  await Promise.all(
    [...document.images].map((img) =>
      img.complete
        ? null
        : new Promise((done) => (img.onload = img.onerror = done)),
    ),
  );
  fit();
  addEventListener("resize", fit);
  build();
  const params = new URLSearchParams(location.search);
  window.__duration = DURATION;
  window.__seek = seek;
  if (params.has("render")) {
    seek(0);
  } else {
    const from = Number(params.get("t") ?? 0);
    if (from)
      for (const a of document.getAnimations()) a.currentTime = from * 1000;
    // Space restarts the film.
    addEventListener("keydown", (e) => e.key === " " && location.reload());
  }
  window.__ready = true;
}

start();
