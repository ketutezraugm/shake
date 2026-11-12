// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Entry = { target: Element; isIntersecting: boolean };
let notify: (entries: Entry[]) => void = () => undefined;

class FakeIntersectionObserver {
  constructor(callback: (entries: Entry[]) => void) {
    notify = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

async function freshModule() {
  vi.resetModules();
  return import("./stickerPop");
}

function sticker(src: string, parent: HTMLElement = document.body): HTMLImageElement {
  const img = document.createElement("img");
  img.className = "sticker";
  img.setAttribute("src", src);
  parent.append(img);
  return img;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// A watcher left running would keep marking stickers of the next test, so every test's watcher is stopped after it.
const stops: (() => void)[] = [];
async function watch() {
  const module = await freshModule();
  stops.push(module.watchStickers());
  return module;
}

describe("stickerPop", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  });
  afterEach(() => {
    stops.splice(0).forEach((stop) => stop());
    vi.unstubAllGlobals();
  });

  it("knows a sticker by its picture", async () => {
    const { stickerId } = await freshModule();

    expect(stickerId(sticker("a.svg"))).toBe(stickerId(sticker("a.svg")));
    expect(stickerId(sticker("a.svg"))).not.toBe(stickerId(sticker("b.svg")));
  });

  it("leaves the stickers of a parent that starts them itself alone", async () => {
    await watch();
    const footer = document.createElement("footer");
    footer.setAttribute("data-pop-own", "");
    document.body.append(footer);
    const own = sticker("a.svg", footer);
    await flush();

    expect(own.classList.contains("sticker-wait")).toBe(false);
  });

  it("holds a new sticker back, then pops it when it enters, one stagger after the one before", async () => {
    await watch();
    const first = sticker("a.svg");
    const second = sticker("b.svg");
    await flush();

    expect(first.classList.contains("sticker-wait")).toBe(true);

    notify([
      { target: first, isIntersecting: true },
      { target: second, isIntersecting: true },
    ]);

    expect(first.classList.contains("sticker-pop")).toBe(true);
    expect(first.classList.contains("sticker-wait")).toBe(false);
    expect(first.style.getPropertyValue("--pop-index")).toBe("0");
    expect(second.style.getPropertyValue("--pop-index")).toBe("1");
  });

  it("leaves a sticker still off screen alone", async () => {
    await watch();
    const below = sticker("a.svg");
    await flush();

    notify([{ target: below, isIntersecting: false }]);

    expect(below.classList.contains("sticker-wait")).toBe(true);
  });

  it("does not pop a sticker again in the same session, even after a reload of the page's code", async () => {
    await watch();
    const shown = sticker("a.svg");
    await flush();
    notify([{ target: shown, isIntersecting: true }]);

    stops.splice(0).forEach((stop) => stop());
    document.body.innerHTML = "";
    await watch();
    const back = sticker("a.svg");
    await flush();

    expect(back.classList.contains("sticker-wait")).toBe(false);
    expect(back.classList.contains("sticker-pop")).toBe(false);
  });
});
