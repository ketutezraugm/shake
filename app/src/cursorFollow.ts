// Stickers that lean a few pixels toward the cursor. A sticker carries `data-depth`: how many pixels it moves when the
// cursor is at the edge of the footer, so near and far stickers move differently. The easing is CSS (a `translate`
// transition on the sticker); this file only measures and sets the target.

export type Offset = { x: number; y: number };

/** Where the cursor is in a box, from -1 (left or top edge) to 1 (right or bottom edge), 0 in the middle. */
export function pointerOffset(box: Pick<DOMRect, "left" | "top" | "width" | "height">, clientX: number, clientY: number): Offset {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return {
    x: box.width ? clamp(((clientX - box.left) / box.width) * 2 - 1) : 0,
    y: box.height ? clamp(((clientY - box.top) / box.height) * 2 - 1) : 0,
  };
}

/** The `translate` value for a sticker `depth` pixels deep. */
export function lean({ x, y }: Offset, depth: number): string {
  return `${(x * depth).toFixed(2)}px ${(y * depth).toFixed(2)}px`;
}

// Only a real mouse or trackpad: a touch screen has no cursor to follow. Reduced motion asks for no movement at all.
const canFollow = () => matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;

/** While the cursor is over `element`, leans every `[data-depth]` sticker inside it toward the cursor; rests when it leaves. */
export function followCursor(element: HTMLElement): () => void {
  if (!canFollow()) return () => undefined;

  // Each sticker is set directly. A CSS variable on the footer would make the browser restyle everything inside it on
  // every mouse move, when only these few elements change.
  const stickers = [...element.querySelectorAll<HTMLElement>("[data-depth]")].map((sticker) => ({ sticker, depth: Number(sticker.dataset.depth) }));
  const set = (offset: Offset) => stickers.forEach(({ sticker, depth }) => (sticker.style.translate = lean(offset, depth)));

  let frame = 0;
  // A pointer can report many times per frame; only the last position of each frame is used.
  const move = (event: PointerEvent) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => set(pointerOffset(element.getBoundingClientRect(), event.clientX, event.clientY)));
  };
  const leave = () => {
    cancelAnimationFrame(frame);
    set({ x: 0, y: 0 });
  };

  element.addEventListener("pointermove", move);
  element.addEventListener("pointerleave", leave);
  return () => {
    cancelAnimationFrame(frame);
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
  };
}
