// The demo's timeline. Every move is a Web Animation created at load with its start as a delay, so the whole film is
// one clock: it plays by itself in a browser, and window.__seek(t) poses any frame exactly for a frame-by-frame render.
// Each move that makes a sound registers a cue, so the soundtrack is mixed from the same clock (window.__mix()).
// Motion follows IDENTITY.md: transform and opacity only, the tokens' curves, and the sticker pop-shake springs.

const DURATION = 81.5;

const OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
const IN = "cubic-bezier(0.7, 0, 0.84, 0)";
const STD = "cubic-bezier(0.2, 0, 0, 1)";
const SWEEP = "cubic-bezier(0.65, 0, 0.35, 1)";
const GLIDE = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const HANDSHAKE = "cubic-bezier(0.3, 0.6, 0.3, 1)";
// The sticker pop's two springs, copied from styles/stickers.css.
const SPRING_SCALE =
  "linear(0, 0.05, 0.175, 0.343, 0.525, 0.7, 0.853, 0.977, 1.068, 1.126, 1.156, 1.163, 1.152, 1.13, 1.102, 1.073, 1.044, 1.02, 1.001, 0.987, 0.978, 0.974, 0.974, 0.976, 0.979, 0.984, 0.989, 0.993, 0.997, 1, 1.002, 1.004, 1)";
const SPRING_TURN =
  "linear(0, 0.063, 0.233, 0.471, 0.739, 1, 1.221, 1.382, 1.472, 1.491, 1.446, 1.353, 1.23, 1.097, 0.972, 0.87, 0.798, 0.762, 0.761, 0.789, 0.84, 0.902, 0.967, 1.027, 1.074, 1.105, 1.119, 1.116, 1.099, 1.072, 1.041, 1.009, 0.981, 0.959, 0.946, 0.941, 0.945, 0.954, 0.968, 0.984, 1)";
const PERSPECTIVE = "perspective(1800px)";

// The hook runs 1.5 s longer than first cut, so every scene after it is written in its old times and shifted here.
let shift = 0;

// Sound cues: { t, name, gain, rate }. Files live in ./sfx (sources in sfx/SOURCES.md).
const cues = [];
let seed = 11;
const rand = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const jitter = (spread = 0.12) => 1 + (rand() - 0.5) * 2 * spread;
function sfx(name, t, gain = 0.5, rate = 1) {
  cues.push({ t: t + shift, name, gain, rate });
}

// The voiceover: one file per scene in ./vo, placed at its scene's start. A missing file is skipped.
const VOICE = [
  { file: "01-hook", t: 0.4 },
  { file: "02-brand", t: 9.5 },
  { file: "03-seller", t: 13.7 },
  { file: "04-ask", t: 27.0 },
  { file: "05-offer", t: 36.8 },
  { file: "06-machine", t: 46.8 },
  { file: "07-reveal", t: 56.4 },
  { file: "08-escrow", t: 61.8 },
  { file: "09-end", t: 75.0 },
];

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
  for (const el of els(target)) {
    el.animate(keyframes, {
      delay: (start + shift) * 1000,
      duration: Math.max(dur * 1000, 1),
      fill: "forwards",
      easing,
    });
  }
}

const inUp = (t, s, d = 0.8, y = 50) =>
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
function pop(t, s, from = 0.55, loud = 0.4) {
  els(t).forEach((el, i) => {
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
    if (loud) sfx(i % 2 ? "pop2" : "pop", s, loud, jitter());
  });
}

/** A tap: the control dips and springs back, and a ripple spreads from its middle. */
function press(t, s) {
  for (const el of els(t)) {
    anim(
      el,
      s,
      0.36,
      [{ scale: 1 }, { scale: 0.94, offset: 0.35 }, { scale: 1 }],
      STD,
    );
    const ripple = document.createElement("i");
    ripple.className = "ripple";
    el.append(ripple);
    anim(ripple, s, 0.7, [
      { opacity: 0.35, scale: 0.2 },
      { opacity: 0, scale: 3 },
    ]);
  }
  sfx("tap", s, 0.7);
}

/** Types `text` into `el` one character at a time from `s`, with a key sound for each. */
function type(t, s, text, perSecond = 16) {
  const el = els(t)[0];
  el.textContent = "";
  [...text].forEach((char, i) => {
    const span = document.createElement("span");
    span.className = "ch";
    span.textContent = char;
    el.append(span);
    show(span, s + i / perSecond);
    if (char !== " ") sfx("key", s + i / perSecond, 0.3, jitter(0.2));
  });
}

/** Splits a headline into words behind masks, once, and returns the moving inner spans. */
function words(el) {
  if (!el.dataset.split) {
    const list = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    list.forEach((word, i) => {
      const mask = document.createElement("span");
      mask.className = "w";
      const inner = document.createElement("span");
      inner.className = "wi";
      inner.textContent = word;
      mask.append(inner);
      el.append(mask);
      if (i < list.length - 1) el.append(" ");
    });
    el.dataset.split = "1";
  }
  return [...el.querySelectorAll(".wi")];
}

/** A headline rises word by word out of its mask. */
function rise(t, s, stagger = 0.08) {
  for (const el of els(t)) {
    show(el, s);
    words(el).forEach((word, i) =>
      anim(word, s + i * stagger, 0.9, [
        { translate: "0 115%", rotate: "5deg" },
        { translate: "0 0", rotate: "0deg" },
      ]),
    );
  }
}

/** And leaves upward, word by word. */
function sink(t, s) {
  for (const el of els(t)) {
    const list = words(el);
    list.forEach((word, i) =>
      anim(
        word,
        s + i * 0.04,
        0.4,
        [{ translate: "0 0" }, { translate: "0 -115%" }],
        IN,
      ),
    );
    hide(el, s + 0.4 + list.length * 0.04);
  }
}

function swap(from, to, s) {
  sink(from, s);
  rise(to, s + 0.3);
}

function swapCaption(from, to, s) {
  outUp(from, s);
  inUp(to, s + 0.25);
}

/** Rolls a price's digits into place like a counter. The element holds an optional <small> and the digits as text. */
function roll(t, s) {
  for (const el of els(t)) {
    const text = [...el.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join("")
      .trim();
    [...el.childNodes].forEach(
      (node) => node.nodeType === Node.TEXT_NODE && node.remove(),
    );
    [...text].forEach((char, i) => {
      const col = document.createElement("span");
      col.className = "col";
      const strip = document.createElement("span");
      strip.className = "strip";
      col.append(strip);
      el.append(col);
      if (!/\d/.test(char)) {
        strip.textContent = char === " " ? " " : char;
        return;
      }
      const stop = 10 + Number(char);
      for (let k = 0; k <= stop; k++) {
        const digit = document.createElement("span");
        digit.textContent = String(k % 10);
        strip.append(digit);
      }
      anim(strip, s + i * 0.05, 1.2, [
        { translate: "0 0" },
        { translate: `0 -${stop}em` },
      ]);
    });
  }
}

/** A phone screen slides in from the right over the one before it. */
function slideIn(t, s) {
  anim(t, s, 0.6, [{ translate: "100% 0" }, { translate: "0 0" }]);
  sfx("whoosh", s, 0.22, 1.35);
}
const slideOut = (t, s) =>
  anim(t, s, 0.5, [{ translate: "0 0" }, { translate: "100% 0" }], IN);

// Each phone sits in a rig that carries its 3D pose: the entrance turn and a slow float while its scene plays.
function rig(phone) {
  if (!phone.parentElement.classList.contains("rig")) {
    const box = document.createElement("div");
    box.className = "rig";
    box.style.transformOrigin = `${phone.offsetLeft + phone.offsetWidth / 2}px ${phone.offsetTop + phone.offsetHeight / 2}px`;
    phone.before(box);
    box.append(phone);
  }
  return phone.parentElement;
}

/** The phone arrives turned in 3D from `from` (a translate), settles, then floats until `until`. */
function phoneIn(
  t,
  s,
  until,
  {
    from = "520px 0",
    turn = "rotateY(-34deg) rotateX(8deg)",
    quiet = false,
  } = {},
) {
  const phone = els(t)[0];
  const box = rig(phone);
  anim(phone, s, 1.1, [
    { opacity: 0, translate: from },
    { opacity: 1, translate: "0 0" },
  ]);
  anim(box, s, 1.2, [
    { transform: `${PERSPECTIVE} ${turn}` },
    { transform: `${PERSPECTIVE} rotateY(0deg) rotateX(0deg)` },
  ]);
  if (!quiet) sfx("whoosh", s, 0.4);
  // The float: three slow sines, sampled every 0.2 s so the path is smooth at 60 fps.
  const begin = s + 1.2;
  const frames = [];
  for (let time = 0; time <= until - begin + 0.001; time += 0.2) {
    const y = 3.2 * Math.sin((2 * Math.PI * time) / 7.3);
    const x = 2 * Math.sin((2 * Math.PI * time) / 5.1);
    const lift = 7 * Math.sin((2 * Math.PI * time) / 6.2);
    frames.push({
      transform: `${PERSPECTIVE} rotateY(${y.toFixed(3)}deg) rotateX(${x.toFixed(3)}deg) translateY(${lift.toFixed(2)}px)`,
    });
  }
  if (frames.length > 1) anim(box, begin, until - begin, frames, "linear");
}

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
  anim(t, s, 1.0, [{ scale: 1 }, { scale: to }], STD);
  anim(t, back, 0.8, [{ scale: to }, { scale: 1 }], STD);
}

/** A scene never sits still: it drifts 4% closer over its life. */
const drift = (scene, s, e) =>
  anim(scene, s, e - s, [{ scale: 1 }, { scale: 1.04 }], "linear");

/** An ink band sweeps the frame; the scene changes while it covers everything. Returns that moment. */
function wipe(s) {
  anim(
    "#wipe",
    s,
    0.84,
    [{ translate: "-112% 0" }, { translate: "0 0" }, { translate: "112% 0" }],
    SWEEP,
  );
  sfx("whoosh-big", s + 0.05, 0.5);
  return s + 0.42;
}

/** A faint numeral behind the copy, sliding slowly, so each step has its own backdrop. */
function ghost(scene, numeral, s, e) {
  const el = document.createElement("div");
  el.className = "ghost";
  el.textContent = numeral;
  document.querySelector(scene).prepend(el);
  anim(el, s, 1.2, [{ opacity: 0 }, { opacity: 0.55 }], STD);
  anim(
    el,
    s,
    e - s,
    [{ translate: "60px 0" }, { translate: "-60px 0" }],
    "linear",
  );
}

// The progress rail: five steps along the bottom, with the app's header line gliding to the current one.
const rail = { line: null, spots: [], at: null };
function buildRail() {
  const el = document.createElement("div");
  el.id = "rail";
  for (const name of ["List", "Ask", "Offer", "Match", "Paid"]) {
    const label = document.createElement("span");
    label.textContent = name;
    const on = document.createElement("b");
    on.textContent = name;
    label.append(on);
    el.append(label);
  }
  rail.line = document.createElement("i");
  el.append(rail.line);
  document
    .querySelector("#stage")
    .insertBefore(el, document.querySelector("#s9"));
  rail.spots = [...el.querySelectorAll("span")].map((label) => ({
    x: label.offsetLeft,
    w: label.offsetWidth,
    on: label.querySelector("b"),
  }));
}

function railTo(index, s) {
  const to = rail.spots[index];
  const from = rail.at === null ? to : rail.spots[rail.at];
  anim(
    rail.line,
    s,
    0.6,
    [
      { translate: `${from.x}px 0`, scale: `${from.w / 100} 1` },
      { translate: `${to.x}px 0`, scale: `${to.w / 100} 1` },
    ],
    GLIDE,
  );
  if (rail.at !== null) fadeOut(from.on, s, 0.3);
  fadeIn(to.on, s + 0.15, 0.3);
  rail.at = index;
}

/** A chat bubble arrives with its sound. */
function bubble(t, s, y = 24) {
  inUp(t, s, 0.5, y);
  sfx("msg", s, 0.45, jitter(0.08));
}

function typingDots(id, s, e) {
  fadeIn(id, s, 0.2);
  for (let k = 0; k < 3; k++) {
    anim(
      `${id} i:nth-child(${k + 1})`,
      s + k * 0.12,
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
  }
  hide(id, e);
}

// 1. Hook (0 to 9.3)
function hook() {
  show("#s1", 0);
  drift("#s1", 0, 9.3);
  rise("#hook1", 0.3, 0.2);
  words(document.querySelector("#hook1")).forEach((_, i) =>
    sfx("pop2", 0.35 + i * 0.2, 0.25, 0.8 + i * 0.08),
  );
  anim("#hook2", 1.9, 0.64, [{ scale: 0.6 }, { scale: 1 }], SPRING_SCALE);
  anim("#hook2", 1.9, 0.2, [{ opacity: 0 }, { opacity: 1 }], "linear");
  // "loses." lands with the brand's shake.
  anim(
    "#hook2",
    1.95,
    0.7,
    [
      { rotate: "0deg" },
      { rotate: "-4deg" },
      { rotate: "3deg" },
      { rotate: "-2deg" },
      { rotate: "1deg" },
      { rotate: "0deg" },
    ],
    "linear",
  );
  sfx("thud", 1.9, 0.9);
  pop("#s1-tag", 2.15);
  pop("#s1-fingers", 2.3);
  outUp(["#hook1", "#hook2"], 3.3, 0.45, -90);
  anim(
    ["#s1-tag", "#s1-fingers"],
    3.3,
    0.4,
    [
      { opacity: 1, scale: 1 },
      { opacity: 0, scale: 0.5 },
    ],
    IN,
  );
  sfx("whoosh", 3.3, 0.3);

  const [take, pay] = document.querySelectorAll("#hook3 div");
  rise(take, 3.7);
  rise(pay, 4.9);
  sfx("pop", 3.75, 0.3, 0.85);
  sfx("pop", 4.95, 0.3, 1);
  inUp("#hook4", 6.4, 0.7);
  pop("#hook4 .nodeal", 7.2, 1.6, 0);
  sfx("thud", 7.22, 0.8, 0.9);
  // The two prices flinch when the deal dies.
  anim(
    "#hook3",
    7.25,
    0.5,
    [
      { translate: "0 0" },
      { translate: "-14px 0" },
      { translate: "11px 0" },
      { translate: "-6px 0" },
      { translate: "0 0" },
    ],
    "linear",
  );
  outUp(["#hook3", "#hook4"], 8.5, 0.4, -60);
  hide("#s1", 9.4);
}

// 2. Brand (7.3 to 12.2): the ink panel rises, the wordmark writes itself, stickers land.
function brand() {
  show("#s2", 7.3);
  anim(
    "#s2-panel",
    7.3,
    0.8,
    [{ translate: "0 100%" }, { translate: "0 0" }],
    SWEEP,
  );
  sfx("whoosh-big", 7.3, 0.55);
  anim(
    "#s2-curtain",
    8.1,
    0.7,
    [{ translate: "0 0" }, { translate: "101% 0" }],
    "linear",
  );
  anim(
    "#s2 .word-wrap",
    8.1,
    3.6,
    [{ scale: 0.94 }, { scale: 1.02 }],
    "linear",
  );
  ["#s2-a", "#s2-b", "#s2-c", "#s2-d"].forEach((id, i) =>
    pop(id, 8.9 + i * 0.18),
  );
  inUp("#s2-tag", 9.3);
  anim(
    "#s2-panel",
    11.5,
    0.7,
    [{ translate: "0 0" }, { translate: "0 -100%" }],
    SWEEP,
  );
  sfx("whoosh-big", 11.5, 0.45, 1.15);
  hide("#s2", 12.3);
}

// 3. The seller lists and seals a floor (11.5 to 24.8)
function seller() {
  show("#s3", 11.5);
  drift("#s3", 11.5, 24.8);
  ghost("#s3", "1", 11.8, 24.8);
  fadeIn("#rail", 11.9, 0.6);
  railTo(0, 11.9);
  phoneIn("#s3-phone", 11.8, 24.8);
  inUp("#s3-step", 12.0, 0.6, 30);
  rise("#s3-h1", 12.1);
  inUp("#s3-c1", 12.5);
  pop("#s3-p1", 12.7, 0.7, 0.25);
  pop("#s3-p2", 12.85, 0.7, 0.25);

  show("#s3-r1", 13.2);
  type("#s3-t1", 13.3, "Fujifilm X-T20 camera", 24);
  hide("#s3-r1", 14.4);
  show("#s3-r2", 14.5);
  type("#s3-t2", 14.6, "6.000.000", 12);
  hide("#s3-r2", 15.5);

  swap("#s3-h1", "#s3-h2", 15.9);
  swapCaption("#s3-c1", "#s3-c2", 16.1);
  push("#s3-phone", 16.0, 19.5);
  show("#s3-r3", 16.4);
  type("#s3-t3", 16.5, "5.000.000", 12);
  // The seal: the digits drop away, five dots and the lock take their place, and the cloth covers the secret.
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
  sfx("lock", 18.2, 0.8);
  pop("#s3-lock", 18.35, 0.55, 0);
  pop("#s3-cloth", 18.5);
  fadeIn("#s3-sealnote", 18.7);
  hide("#s3-r3", 19.4);
  press("#s3-btn", 19.7);
  slideIn("#s3-listing", 20.1);

  swap("#s3-h2", "#s3-h3", 21.2);
  swapCaption("#s3-c2", "#s3-c3", 21.4);
  inUp("#s3-bio", 21.9, 0.8, 60);
  sfx("whoosh", 21.9, 0.25, 1.2);
  pop("#s3-pin", 22.3);
}

// 4. A buyer asks the assistant (24.8 to 34.6)
function ask() {
  const cut = wipe(24.35);
  hide("#s3", cut);
  show("#s4", cut);
  drift("#s4", cut, 34.7);
  ghost("#s4", "2", cut, 34.7);
  railTo(1, cut);
  phoneIn("#s4-phone", cut - 0.1, 34.7, {
    from: "0 600px",
    turn: "rotateX(26deg) rotateY(-10deg)",
    quiet: true,
  });
  inUp("#s4-step", 25.0, 0.6, 30);
  rise("#s4-h1", 25.1);
  bubble("#s4-q1", 26.2);
  typingDots("#s4-d1", 26.9, 27.9);
  bubble("#s4-a1", 27.9, 16);
  bubble("#s4-q2", 29.3);
  rise("#s4-h2", 29.5);
  typingDots("#s4-d2", 30.0, 31.0);
  bubble("#s4-a2", 31.0, 16);
  inUp("#s4-c1", 31.4);
  inUp("#s4-btn", 32.2, 0.5, 20);
  press("#s4-btn", 33.6);
}

// 5. The blind offer: type, lock, sign, encrypt (34.6 to 45)
function offer() {
  const cut = wipe(34.2);
  hide("#s4", cut);
  show("#s5", cut);
  drift("#s5", cut, 45);
  ghost("#s5", "3", cut, 45);
  railTo(2, cut);
  phoneIn("#s5-phone", cut - 0.1, 44.3, {
    turn: "rotateY(-30deg) rotateX(-6deg)",
    quiet: true,
  });
  inUp("#s5-step", 34.9, 0.6, 30);
  rise("#s5-h1", 35.0);
  inUp("#s5-c1", 35.5);
  push("#s5-phone", 35.8, 37.4);
  show("#s5-r1", 36.0);
  type("#s5-t1", 36.1, "5.500.000", 12);
  hide("#s5-r1", 37.2);
  press("#s5-btn1", 37.6);
  slideIn("#s5-b", 37.9);
  press("#s5-btn2", 39.0);

  fadeIn("#s5-dim", 39.3, 0.3);
  anim("#s5-sheet", 39.3, 0.6, [{ translate: "0 110%" }, { translate: "0 0" }]);
  sfx("whoosh", 39.3, 0.25, 1.2);
  swap("#s5-h1", "#s5-h2", 39.4);
  swapCaption("#s5-c1", "#s5-c2", 39.6);
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
    sfx("blip", 41.9 + i * 0.13, 0.3, 0.9 + i * 0.07);
    if (i < frames.length - 1) hide(frame, 41.9 + (i + 1) * 0.13);
  });
  anim(
    "#s5-c .card",
    41.9,
    0.9,
    [{ scale: 1 }, { scale: 1.05, offset: 0.5 }, { scale: 1 }],
    STD,
  );
  pop("#s5-lock", 42.9, 0.55, 0);
  sfx("lock", 42.9, 0.7, 1.1);
  fadeIn("#s5-enc", 43.0);
  // The sealed offer leaves the phone, toward the machine in the next scene.
  anim(
    "#s5-c .card",
    44.0,
    0.6,
    [
      { translate: "0 0", opacity: 1, scale: 1 },
      { translate: "700px 0", opacity: 0, scale: 0.6 },
    ],
    IN,
  );
  sfx("whoosh", 44.0, 0.45);
  outUp(["#s5-step", "#s5-c2"], 44.1);
  sink("#s5-h2", 44.05);
  phoneOut("#s5-phone", 44.3);
  hide("#s5", 45.0);
}

// 6. The sealed machine compares, and the price lands inside the overlap (44.8 to 53.6)
function machine() {
  show("#s6", 44.8);
  drift("#s6", 44.8, 53.2);
  railTo(3, 44.9);
  rise("#s6-h", 44.9);
  pop("#s6-machine", 45.1, 0.4);
  anim("#s6-left", 45.4, 0.8, [
    { opacity: 0, translate: "-500px 0" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim("#s6-right", 45.6, 0.8, [
    { opacity: 0, translate: "500px 0" },
    { opacity: 1, translate: "0 0" },
  ]);
  sfx("whoosh", 45.4, 0.3, 1.1);
  sfx("whoosh", 45.6, 0.3, 0.95);
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
  sfx("pop2", 46.72, 0.4, 0.8);
  sfx("pop2", 46.92, 0.4, 0.9);
  inUp("#s6-sub", 46.6, 0.6, 20);
  // The shake: the machine rattles twice while it compares, and rings spread from it.
  [47.0, 47.75].forEach((start, k) => {
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
    sfx("rattle", start, 0.6, 1 + k * 0.1);
  });
  for (let k = 0; k < 4; k++) {
    const ring = document.createElement("i");
    ring.className = "pulse";
    document
      .querySelector("#s6")
      .insertBefore(ring, document.querySelector("#s6-machine"));
    anim(ring, 47.0 + k * 0.38, 1.3, [
      { opacity: 0.45, scale: 0.7 },
      { opacity: 0, scale: 2.6 },
    ]);
  }

  fadeIn("#s6-line", 48.6, 0.4);
  anim("#s6-line", 48.6, 0.8, [{ scale: "0 1" }, { scale: "1 1" }]);
  anim("#s6-m1", 48.9, 0.5, [
    { opacity: 0, translate: "0 30px" },
    { opacity: 1, translate: "0 0" },
  ]);
  anim("#s6-m2", 49.2, 0.5, [
    { opacity: 0, translate: "0 30px" },
    { opacity: 1, translate: "0 0" },
  ]);
  sfx("tap", 48.9, 0.4, 0.8);
  sfx("tap", 49.2, 0.4, 0.95);
  fadeIn("#s6-only", 49.4);
  anim("#s6-band", 49.7, 0.6, [{ scale: "0 1" }, { scale: "1 1" }]);
  sfx("whoosh", 49.7, 0.2, 1.5);
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
  [0.22, 0.45, 0.66, 0.84].forEach((offset, k) =>
    sfx("tap", 50.3 + 1.8 * offset * 0.8, 0.3, 1.1 + k * 0.1),
  );
  inUp("#s6-cap", 50.6, 0.6, 24);
  anim(
    "#s6-ball",
    52.1,
    0.5,
    [{ scale: 1 }, { scale: 1.6 }, { scale: 1 }],
    STD,
  );
  show("#s6-landed", 52.1);
  roll("#s6-landed", 52.1);
  sfx("ding", 52.1, 0.8);

  anim(
    "#s6",
    53.2,
    0.4,
    [
      { opacity: 1, scale: 1.04 },
      { opacity: 0, scale: 1.12 },
    ],
    IN,
  );
  sfx("whoosh", 53.2, 0.35);
}

// 7. The reveal on both phones, with a handshake (53.4 to 59.8)
function reveal() {
  show("#s7", 53.4);
  drift("#s7", 53.4, 59.9);
  phoneIn("#s7-p1", 53.5, 59.8, {
    from: "-200px 400px",
    turn: "rotateY(38deg) rotateX(10deg)",
    quiet: true,
  });
  phoneIn("#s7-p2", 53.62, 59.8, {
    from: "200px 400px",
    turn: "rotateY(-38deg) rotateX(10deg)",
    quiet: true,
  });
  inUp(["#s7-w1", "#s7-w2"], 53.9, 0.5, 20);
  pop("#s7-st1", 54.2, 0.55, 0);
  pop("#s7-st2", 54.3, 0.55, 0);
  sfx("success", 54.25, 0.75);
  document
    .querySelectorAll(".s7-t")
    .forEach((el, i) => inUp(el, 54.5 + i * 0.12, 0.5, 20));
  document
    .querySelectorAll(".s7-u")
    .forEach((el, i) => inUp(el, 54.55 + i * 0.12, 0.5, 20));
  roll(["#s7-p1 .amount", "#s7-p2 .amount"], 54.75);
  confetti(54.3);
  // The handshake: both phones dip together, once, like two hands shaking on it.
  anim(
    ["#s7-p1", "#s7-p2"],
    55.9,
    0.56,
    [
      { translate: "0 0" },
      { translate: "0 26px" },
      { translate: "0 -10px" },
      { translate: "0 0" },
    ],
    HANDSHAKE,
  );
  sfx("thud", 56.0, 0.6, 0.8);
  rise("#s7-cap", 56.4);
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
  origins.forEach(([x, y], o) => {
    for (let i = 0; i < 22; i++) {
      const dot = document.createElement("i");
      dot.className = "confetti";
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      dot.style.background = colours[i % colours.length];
      box.append(dot);
      const angle = rand() * Math.PI * 2;
      const dist = 140 + rand() * 260;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const s = start + o * 0.1 + rand() * 0.1;
      anim(dot, s, 1.5, [
        { opacity: 1, translate: "0 0", scale: 1 },
        {
          opacity: 1,
          translate: `${dx * 0.85}px ${dy * 0.85}px`,
          scale: 1,
          offset: 0.5,
        },
        { opacity: 0, translate: `${dx}px ${dy + 110}px`, scale: 0.5 },
      ]);
    }
  });
}

// 8. Escrow, chat, Received, Sold (59.8 to 70.2)
function escrow() {
  const cut = wipe(59.35);
  hide("#s7", cut);
  show("#s8", cut);
  drift("#s8", cut, 70.2);
  ghost("#s8", "4", cut, 70.2);
  railTo(4, cut);
  phoneIn("#s8-phone", cut - 0.1, 69.6, { quiet: true });
  inUp("#s8-step", 60.0, 0.6, 30);
  rise("#s8-h1", 60.1);
  inUp("#s8-c1", 60.6);
  pop("#s8-box", 60.9);
  show("#s8-paid", 61.6);
  anim("#s8-paid", 61.6, 0.5, [{ scale: "0.6 1" }, { scale: "1 1" }]);
  sfx("blip", 61.6, 0.4, 0.9);
  show("#s8-held", 62.2);
  anim("#s8-held", 62.2, 0.5, [{ scale: "0.6 1" }, { scale: "1 1" }]);
  sfx("blip", 62.2, 0.4, 1.1);

  slideIn("#s8-chat", 63.2);
  swap("#s8-h1", "#s8-h2", 63.2);
  swapCaption("#s8-c1", "#s8-c2", 63.4);
  bubble("#s8-m1", 63.9);
  bubble("#s8-m2", 64.7);
  bubble("#s8-m3", 65.4);
  slideOut("#s8-chat", 66.1);

  press("#s8-btn", 66.5);
  hide("#s8-held", 66.75);
  show("#s8-recv", 66.75);
  anim("#s8-recv", 66.75, 0.5, [{ scale: "0.6 1" }, { scale: "1 1" }]);
  sfx("cash", 66.8, 0.6);
  swap("#s8-h2", "#s8-h3", 66.5);
  swapCaption("#s8-c2", "#s8-c3", 66.7);
  slideIn("#s8-done", 67.1);
  document
    .querySelectorAll(".s8-r")
    .forEach((el, i) => inUp(el, 67.6 + i * 0.2, 0.45, 14));
  inUp("#s8-listing", 68.3, 0.5, 20);
  pop("#s8-sold", 68.7, 1.8, 0);
  sfx("thud", 68.78, 0.9);
  // The stamp lands hard enough to jolt the phone.
  anim(
    "#s8-phone",
    68.8,
    0.4,
    [
      { translate: "0 0" },
      { translate: "0 10px" },
      { translate: "0 -4px" },
      { translate: "0 0" },
    ],
    HANDSHAKE,
  );

  outUp(["#s8-step", "#s8-c3"], 69.6);
  sink("#s8-h3", 69.55);
  fadeOut("#rail", 69.6);
  phoneOut("#s8-phone", 69.7);
  hide("#s8", 70.3);
}

// 9. Recap, then the end card (70 to 80)
function end() {
  show("#s9", 70.0);
  ["#r1", "#r2", "#r3", "#r4"].forEach((id, i) => {
    const s = 70.25 + i * 0.42;
    anim(id, s, 0.64, [{ scale: 0.6 }, { scale: 1 }], SPRING_SCALE);
    anim(id, s, 0.15, [{ opacity: 0 }, { opacity: 1 }], "linear");
    sfx("thud", s, 0.55, 1 + i * 0.12);
    const img = document.querySelector(`${id} img`);
    img.dataset.rot = String(i % 2 ? 8 : -8);
    pop(img, s + 0.12, 0.55, 0.3);
  });
  anim(".recap", 70.2, 2.6, [{ scale: 1 }, { scale: 1.06 }], "linear");
  anim(
    "#s9-panel",
    72.5,
    0.8,
    [{ translate: "0 100%" }, { translate: "0 0" }],
    SWEEP,
  );
  sfx("whoosh-big", 72.5, 0.55);
  anim(
    "#s9-curtain",
    73.3,
    0.7,
    [{ translate: "0 0" }, { translate: "101% 0" }],
    "linear",
  );
  anim(
    "#s9 .word-wrap",
    73.3,
    6.7,
    [{ scale: 0.95 }, { scale: 1.03 }],
    "linear",
  );
  ["#s9-a", "#s9-b", "#s9-c", "#s9-d"].forEach((id, i) =>
    pop(id, 74.0 + i * 0.18),
  );
  inUp("#s9-tag", 74.1);
  sfx("ding", 74.1, 0.45, 0.8);
  inUp("#s9-l1", 74.6, 0.6, 24);
  inUp("#s9-l2", 75.0, 0.6, 24);
  inUp("#s9-l3", 75.4, 0.6, 24);
}

function build() {
  const stage = document.querySelector("#stage");
  const grid = document.createElement("div");
  grid.id = "grid";
  stage.prepend(grid);
  const band = document.createElement("div");
  band.id = "wipe";
  stage.append(band);
  buildRail();
  // The dotted ground slides slowly the whole film, so even a held frame is moving.
  anim(
    grid,
    0,
    DURATION,
    [{ translate: "0 0" }, { translate: "-560px -280px" }],
    "linear",
  );

  hook();
  shift = 1.5;
  brand();
  seller();
  ask();
  offer();
  machine();
  reveal();
  escrow();
  end();
  shift = 0;
}

/** Poses every animation at `t` seconds and holds it there. */
function seek(t) {
  for (const a of document.getAnimations()) {
    a.pause();
    a.currentTime = t * 1000;
  }
}

// Sound. The same cue list drives the live preview and the offline mix.
async function loadSounds(ctx) {
  const buffers = new Map();
  const load = async (key, url) => {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio"))
      return;
    buffers.set(key, await ctx.decodeAudioData(await res.arrayBuffer()));
  };
  await Promise.all([
    ...[...new Set(cues.map((cue) => cue.name))].map((name) =>
      load(name, `/video/sfx/${name}.mp3`),
    ),
    ...VOICE.map((line) =>
      load(`vo:${line.file}`, `/video/vo/${line.file}.mp3`),
    ),
  ]);
  return buffers;
}

function schedule(ctx, buffers, at) {
  const effects = ctx.createGain();
  // Under a voice the effects sit back; alone they carry the film.
  effects.gain.value = VOICE.some((line) => buffers.has(`vo:${line.file}`))
    ? 0.5
    : 0.9;
  const voice = ctx.createGain();
  voice.gain.value = 1;
  const limiter = ctx.createDynamicsCompressor();
  effects.connect(limiter);
  voice.connect(limiter);
  limiter.connect(ctx.destination);
  const play = (buffer, t, gain, rate, bus) => {
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const level = ctx.createGain();
    level.gain.value = gain;
    source.connect(level).connect(bus);
    source.start(at + t);
  };
  for (const cue of cues)
    play(buffers.get(cue.name), cue.t, cue.gain, cue.rate, effects);
  for (const line of VOICE)
    play(buffers.get(`vo:${line.file}`), line.t, 1, 1, voice);
}

function wav(rendered) {
  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  const bytes = new DataView(new ArrayBuffer(44 + left.length * 4));
  const text = (offset, value) =>
    [...value].forEach((char, i) =>
      bytes.setUint8(offset + i, char.charCodeAt(0)),
    );
  text(0, "RIFF");
  bytes.setUint32(4, 36 + left.length * 4, true);
  text(8, "WAVEfmt ");
  bytes.setUint32(16, 16, true);
  bytes.setUint16(20, 1, true);
  bytes.setUint16(22, 2, true);
  bytes.setUint32(24, rendered.sampleRate, true);
  bytes.setUint32(28, rendered.sampleRate * 4, true);
  bytes.setUint16(32, 4, true);
  bytes.setUint16(34, 16, true);
  text(36, "data");
  bytes.setUint32(40, left.length * 4, true);
  for (let i = 0; i < left.length; i++) {
    bytes.setInt16(
      44 + i * 4,
      Math.max(-1, Math.min(1, left[i])) * 32767,
      true,
    );
    bytes.setInt16(
      46 + i * 4,
      Math.max(-1, Math.min(1, right[i])) * 32767,
      true,
    );
  }
  return new Blob([bytes], { type: "audio/wav" });
}

/** Mixes the whole soundtrack offline and downloads it as a WAV; resolves with what was loaded. */
async function mix() {
  const ctx = new OfflineAudioContext(2, 48000 * DURATION, 48000);
  const buffers = await loadSounds(ctx);
  schedule(ctx, buffers, 0);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(wav(await ctx.startRendering()));
  link.download = "shake-demo-audio.wav";
  link.click();
  return {
    loaded: [...buffers.keys()],
    lengths: Object.fromEntries(
      [...buffers].map(([key, buffer]) => [
        key,
        Number(buffer.duration.toFixed(2)),
      ]),
    ),
  };
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
  window.__mix = mix;
  window.__cues = cues;
  if (params.has("render")) {
    seek(0);
  } else {
    const from = Number(params.get("t") ?? 0);
    if (from)
      for (const a of document.getAnimations()) a.currentTime = from * 1000;
    // A browser plays no sound before a click, so a click restarts the film with its soundtrack. Space reloads.
    addEventListener(
      "click",
      async () => {
        const ctx = new AudioContext();
        const buffers = await loadSounds(ctx);
        for (const a of document.getAnimations()) a.currentTime = 0;
        schedule(ctx, buffers, ctx.currentTime);
      },
      { once: true },
    );
    addEventListener("keydown", (e) => e.key === " " && location.reload());
  }
  window.__ready = true;
}

start();
