// The shake's sticker pop (IDENTITY.md, "Signature motion"): every sticker pops in with a damped wiggle the first time it
// enters the screen, staggered, and never again in the same session. The look is in styles/stickers.css.

const STORAGE_KEY = "blind-deal:popped";

function load(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

const popped = new Set<string>(load());

export function hasPopped(id: string): boolean {
  return popped.has(id);
}

export function markPopped(id: string): void {
  popped.add(id);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...popped]));
  } catch {
    // Storage is off (a private window): the in-memory set still stops repeats until the next reload.
  }
}

// Small stable hash, so the session record holds a few characters per sticker instead of its whole inlined image.
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** A sticker is "the same one" by its picture: once the price tag has popped, it does not pop again on another screen. */
export function stickerId(img: HTMLImageElement): string {
  return hash(img.getAttribute("src") ?? "");
}

/**
 * Hides each sticker that has not popped yet until half of it is on screen, then pops it. Stickers that enter together
 * pop one `--pop-stagger` apart. Returns a function that stops watching.
 */
export function watchStickers(root: HTMLElement = document.body): () => void {
  if (typeof IntersectionObserver === "undefined") return () => undefined;

  const entering = new IntersectionObserver(
    (entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target as HTMLImageElement;
        entering.unobserve(img);
        markPopped(stickerId(img));
        img.style.setProperty("--pop-index", String(index++));
        img.classList.replace("sticker-wait", "sticker-pop");
      }
    },
    { threshold: 0.5 },
  );

  function consider(img: HTMLImageElement): void {
    // A parent that marks itself `data-pop-own` starts its stickers itself (the footer, which plays them in order).
    if (img.closest("[data-pop-own]") || hasPopped(stickerId(img))) return;
    img.classList.add("sticker-wait");
    entering.observe(img);
  }

  function scan(node: Node): void {
    if (!(node instanceof HTMLElement)) return;
    if (node.matches("img.sticker")) consider(node as HTMLImageElement);
    node.querySelectorAll<HTMLImageElement>("img.sticker").forEach(consider);
  }

  // Screens mount and unmount stickers as the route changes, so watch the page rather than each screen.
  const mounted = new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(scan)));
  mounted.observe(root, { childList: true, subtree: true });
  scan(root);

  return () => {
    entering.disconnect();
    mounted.disconnect();
  };
}
