// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { followCursor, lean, pointerOffset } from "./cursorFollow";

const box = { left: 100, top: 50, width: 200, height: 100 };

function stubMedia(matches: Record<string, boolean>) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: Object.entries(matches).some(([key, value]) => value && query.includes(key)) }));
}

function footer(): HTMLElement {
  const element = document.createElement("div");
  for (const depth of ["16", "8"]) {
    const sticker = document.createElement("img");
    sticker.dataset.depth = depth;
    element.append(sticker);
  }
  element.getBoundingClientRect = () => ({ ...box, right: 300, bottom: 150, x: 100, y: 50, toJSON: () => ({}) });
  return element;
}

const move = (element: HTMLElement, clientX: number, clientY: number) =>
  element.dispatchEvent(new MouseEvent("pointermove", { clientX, clientY }));

describe("cursorFollow", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("measures the cursor from -1 to 1 across the box", () => {
    expect(pointerOffset(box, 100, 50)).toEqual({ x: -1, y: -1 });
    expect(pointerOffset(box, 300, 150)).toEqual({ x: 1, y: 1 });
    expect(pointerOffset(box, 200, 100)).toEqual({ x: 0, y: 0 });
  });

  it("never reports past the edge, or anything for an empty box", () => {
    expect(pointerOffset(box, 900, -900)).toEqual({ x: 1, y: -1 });
    expect(pointerOffset({ left: 0, top: 0, width: 0, height: 0 }, 5, 5)).toEqual({ x: 0, y: 0 });
  });

  it("moves a sticker by its depth, so near and far ones differ", () => {
    expect(lean({ x: 1, y: -1 }, 16)).toBe("16.00px -16.00px");
    expect(lean({ x: 0.5, y: 0 }, 8)).toBe("4.00px 0.00px");
  });

  it("leans each sticker toward the cursor by its own depth and rests when the cursor leaves", () => {
    stubMedia({ hover: true });
    vi.stubGlobal("requestAnimationFrame", (run: () => void) => (run(), 1));
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
    const element = footer();
    const stop = followCursor(element);

    const [deep, shallow] = [...element.querySelectorAll<HTMLElement>("img")];
    move(element, 300, 50);
    expect(deep?.style.translate).toBe("16px -16px");
    expect(shallow?.style.translate).toBe("8px -8px");
    expect(element.style.getPropertyValue("--follow-x")).toBe("");

    element.dispatchEvent(new MouseEvent("pointerleave"));
    expect(deep?.style.translate).toBe("0px");
    stop();
  });

  it("stays still on a touch screen and when reduced motion is asked for", () => {
    const cases: Record<string, boolean>[] = [{ hover: false }, { hover: true, "prefers-reduced-motion": true }];
    for (const media of cases) {
      stubMedia(media);
      vi.stubGlobal("requestAnimationFrame", (run: () => void) => (run(), 1));
      vi.stubGlobal("cancelAnimationFrame", () => undefined);
      const element = footer();
      followCursor(element);

      move(element, 300, 50);

      expect(element.querySelector("img")?.style.translate).toBeFalsy();
    }
  });
});
