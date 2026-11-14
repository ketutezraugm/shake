import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hoverIntent } from "./hoverIntent";

describe("hoverIntent", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens only after the open delay", () => {
    const show = vi.fn();
    hoverIntent(show, vi.fn()).enter();
    vi.advanceTimersByTime(119);
    expect(show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(show).toHaveBeenCalledOnce();
  });

  it("stays open when the cursor comes back before the close delay", () => {
    const hide = vi.fn();
    const intent = hoverIntent(vi.fn(), hide);
    intent.leave();
    vi.advanceTimersByTime(100);
    intent.enter();
    vi.advanceTimersByTime(500);
    expect(hide).not.toHaveBeenCalled();
  });

  it("closes after the close delay", () => {
    const hide = vi.fn();
    hoverIntent(vi.fn(), hide).leave();
    vi.advanceTimersByTime(200);
    expect(hide).toHaveBeenCalledOnce();
  });
});
