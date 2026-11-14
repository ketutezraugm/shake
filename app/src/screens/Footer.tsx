import { useEffect, useRef, useState, type CSSProperties } from "react";
import balanceScale from "../design/assets/stickers/balance-scale.svg";
import clippedTags from "../design/assets/stickers/clipped-tags.svg";
import priceTag from "../design/assets/stickers/price-tag.svg";
import pricePin from "../design/assets/stickers/price-pin.svg";
import wordmark from "../design/assets/logo/shake-wordmark.svg";
import "../styles/footer.css";
import { Link } from "../routes";
import { followCursor } from "../cursorFollow";
import { hasPopped, markPopped } from "../stickerPop";

const REPO = "https://github.com/ketutezraugm/blind-deal";
const WRITE_ID = "footer:write";
const NOTE = "Testnet only. No real money moves, and nobody on the team ever sees your number.";

/**
 * Abel's dark footer from the landing page: three short columns, then the shake wordmark with stickers on its edge.
 * On a phone the tab bar already carries the links, so only the testnet note, the stickers and the wordmark remain.
 */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  // The wordmark is written, then sinks into the panel, the first time the footer is on screen in a session; without an observer it just shows.
  const [write, setWrite] = useState<"done" | "wait" | "go">(() =>
    typeof IntersectionObserver === "undefined" || hasPopped(WRITE_ID) ? "done" : "wait",
  );

  useEffect(() => {
    const footer = ref.current;
    if (write !== "wait" || !footer) return;
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        markPopped(WRITE_ID);
        setWrite("go");
      },
      { threshold: 0.3 },
    );
    watcher.observe(footer);
    return () => watcher.disconnect();
  }, [write]);

  useEffect(() => (ref.current ? followCursor(ref.current) : undefined), []);

  return (
    <footer ref={ref} className={`site-footer write-${write}`} data-pop-own="">
      <div className="footer-cols">
        <section className="footer-col" aria-label="Try it">
          <span className="footer-pill sun">Try it</span>
          <Link to="/welcome">How it works</Link>
          <Link to="/">Browse listings</Link>
          <Link to="/sell">Sell something</Link>
        </section>

        <section className="footer-col" aria-label="Built on">
          <span className="footer-pill sky">Built on</span>
          <span className="footer-line">NEAR testnet</span>
          <span className="footer-line">OutLayer sealed machine</span>
        </section>

        <section className="footer-col" aria-label="The team">
          <span className="footer-pill pink">The team</span>
          <a href={REPO}>Read the code</a>
          <p className="footer-small">{NOTE}</p>
        </section>
      </div>
      <p className="footer-note">{NOTE}</p>

      {/* The wordmark is the brand repeated, so it is decoration: the mask recolours the ink shape to the ground colour, and
          the curtain, the panel's own colour, slides off it to "write" it from left to right. */}
      <div className="footer-art" aria-hidden="true">
        <img className="sticker s1" data-depth="16" src={priceTag} alt="" />
        <img className="sticker s2" data-depth="10" src={pricePin} alt="" />
        <img className="sticker s3" data-depth="14" src={clippedTags} alt="" />
        <img className="sticker s4" data-depth="8" src={balanceScale} alt="" />
        <div className="footer-write">
          <span className="footer-word" style={{ "--word": `url("${wordmark}")` } as CSSProperties} />
          <span className="footer-curtain" />
        </div>
      </div>
    </footer>
  );
}
