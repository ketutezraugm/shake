// Opens and closes a hover menu after a short delay, so crossing the gap between the chip and the panel doesn't close it.

export type HoverIntent = { enter: () => void; leave: () => void; cancel: () => void };

export function hoverIntent(show: () => void, hide: () => void, delays = { open: 120, close: 200 }): HoverIntent {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
  };
  const after = (ms: number, run: () => void) => {
    stop();
    timer = setTimeout(run, ms);
  };
  return {
    enter: () => after(delays.open, show),
    leave: () => after(delays.close, hide),
    cancel: stop,
  };
}

/** Only a real mouse or trackpad hovers; on a touch screen the chip opens by tap. */
export const canHover = () => matchMedia("(hover: hover) and (pointer: fine)").matches;
