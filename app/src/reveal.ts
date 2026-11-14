// Scroll reveal for the landing page: each `[data-reveal]` element fades up once, the first time a fifth of it is on
// screen. Elements that come in together are staggered by `--reveal-index`. The look lives in styles/landing.css.

/** Starts watching every `[data-reveal]` inside `root`; returns a function that stops. */
export function watchReveals(root: HTMLElement): () => void {
  const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
  if (typeof IntersectionObserver === "undefined") return () => undefined;

  const observer = new IntersectionObserver(
    (entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const item = entry.target as HTMLElement;
        observer.unobserve(item);
        item.style.setProperty("--reveal-index", String(index++));
        item.classList.add("revealed");
      }
    },
    // The bottom margin waits until an element is a little way up the screen, so the reveal is seen, not missed.
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
  );

  items.forEach((item) => observer.observe(item));
  // Hiding starts only once the observer is in place, so nothing stays hidden if scripts fail.
  root.classList.add("reveal-on");
  return () => observer.disconnect();
}
