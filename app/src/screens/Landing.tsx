import { useEffect, useRef, type ReactNode } from "react";
import { followCursor } from "../cursorFollow";
import lockIcon from "../design/assets/icons/lock.svg";
import balanceScale from "../design/assets/stickers/balance-scale.svg";
import clippedTags from "../design/assets/stickers/clipped-tags.svg";
import escrowBox from "../design/assets/stickers/escrow-box.svg";
import fourFingers from "../design/assets/stickers/four-fingers.svg";
import handUnderCloth from "../design/assets/stickers/hand-under-cloth.svg";
import pricePin from "../design/assets/stickers/price-pin.svg";
import priceTag from "../design/assets/stickers/price-tag.svg";
import scratchCard from "../design/assets/stickers/scratch-card.svg";
import sealedMachine from "../design/assets/stickers/sealed-machine.svg";
import "../styles/landing.css";
import { Link } from "../routes";

// The hero's collage: every sticker in the set, around the headline and never over it. `depth` is how far each one
// leans toward the cursor (cursorFollow.ts), so near and far stickers move differently.
const COLLAGE = [
  { src: priceTag, name: "price-tag", depth: 18 },
  { src: clippedTags, name: "clip", depth: 12 },
  { src: handUnderCloth, name: "cloth", depth: 10 },
  { src: fourFingers, name: "fingers", depth: 16 },
  { src: sealedMachine, name: "machine", depth: 8 },
  { src: escrowBox, name: "escrow", depth: 14 },
  { src: pricePin, name: "pin", depth: 10 },
  { src: balanceScale, name: "scale", depth: 12 },
  { src: scratchCard, name: "scratch", depth: 9 },
];

/** A small phone-shaped frame holding a preview of one screen. Decorative: the step's text says the same thing. */
function Preview({ sticker, children }: { sticker: string; children: ReactNode }) {
  return (
    <div className="preview-wrap">
      <div className="preview" aria-hidden="true">
        {children}
      </div>
      <img className="sticker step-sticker" src={sticker} alt="" />
    </div>
  );
}

/** The landing page: what Shake does, shown as the five moments of one deal, with the real screens in miniature. */
export function Landing() {
  const hero = useRef<HTMLElement>(null);

  useEffect(() => (hero.current ? followCursor(hero.current) : undefined), []);

  return (
    <main className="landing">
      <section className="landing-hero" ref={hero}>
        {COLLAGE.map((sticker) => (
          <img key={sticker.name} className={`sticker collage ${sticker.name}`} src={sticker.src} alt="" data-depth={sticker.depth} />
        ))}
        <div className="landing-hero-text">
          <span className="eyebrow">A second-hand marketplace with blind offers</span>
          <h1>Post your price. Keep your floor.</h1>
          <p>
            Sellers seal the lowest price they'd take. Buyers make a private offer. A sealed machine compares the two and shows both of
            you one thing: a fair price, or no deal.
          </p>
          <div className="landing-actions">
            <Link to="/" className="primary big">
              Browse items
            </Link>
            <Link to="/signin" className="outline-button">
              Open a shop
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="how">
        <h2 id="how">How one deal works</h2>
        <p className="muted">Five moments, from a link in a bio to an item marked sold.</p>

        <ol className="steps">
          <li className="step">
            <div className="step-text">
              <span className="step-number">1</span>
              <h3>The seller lists, and seals a floor</h3>
              <p>Photos, a title and an asking price everyone sees. The lowest price they'd take is sealed on their phone and never shown.</p>
            </div>
            <Preview sticker={priceTag}>
              <div className="pv-photo tint-0" />
              <b>Fujifilm X-T20 camera</b>
              <span className="pv-label">Asking price</span>
              <span className="pv-amount num">Rp 6.000.000</span>
              <span className="pv-note">
                <img src={lockIcon} alt="" width={16} height={16} /> Your lowest price is sealed. Nobody sees it, not even us.
              </span>
            </Preview>
          </li>

          <li className="step">
            <div className="step-text">
              <span className="step-number">2</span>
              <h3>A buyer makes a blind offer</h3>
              <p>The most they'd pay, up to the asking price. It is encrypted on their phone before it goes anywhere.</p>
            </div>
            <Preview sticker={fourFingers}>
              <span className="pv-label">Round 1 of 2</span>
              <b>The most you'd pay</b>
              <span className="pv-field num">
                <small>Rp</small> 5.500.000
              </span>
              <span className="pv-note">Only you will ever see this number.</span>
              <span className="pv-button">Lock Rp 5.500.000</span>
            </Preview>
          </li>

          <li className="step">
            <div className="step-text">
              <span className="step-number">3</span>
              <h3>A sealed machine compares them</h3>
              <p>Public code runs inside a secure enclave (a TEE on OutLayer). It sees both numbers, says only deal or no deal, and forgets.</p>
            </div>
            <Preview sticker={handUnderCloth}>
              <img className="pv-sticker" src={sealedMachine} alt="" />
              <b>Comparing in the sealed machine…</b>
              <span className="pv-note">Neither side, nor we, can read the other number.</span>
            </Preview>
          </li>

          <li className="step">
            <div className="step-text">
              <span className="step-number">4</span>
              <h3>Both see one fair price</h3>
              <p>If the numbers overlap, the price lands at random inside the overlap. If not, the buyer sees "No deal" and can raise next round.</p>
            </div>
            <Preview sticker={scratchCard}>
              <img className="pv-sticker" src={clippedTags} alt="" />
              <span className="pv-cocok">Cocok!</span>
              <b className="pv-title">It's a deal</b>
              <span className="pv-amount deal num">Rp 5.200.000</span>
            </Preview>
          </li>

          <li className="step">
            <div className="step-text">
              <span className="step-number">5</span>
              <h3>Pay into escrow, then tap Received</h3>
              <p>The money waits in a NEAR contract while you meet. Received pays the seller. Nothing arrives in 7 days? It comes back.</p>
            </div>
            <Preview sticker={escrowBox}>
              <span className="pv-label">Deal price</span>
              <span className="pv-amount num">Rp 5.200.000</span>
              <span className="pv-steps">
                <span className="done">Paid</span>
                <span className="now">Held</span>
                <span>Received</span>
              </span>
              <span className="pv-button">Received</span>
            </Preview>
          </li>
        </ol>
      </section>

      <section className="landing-section" aria-labelledby="private">
        <h2 id="private">What stays private</h2>
        <div className="private-row">
          <div className="private-card">
            <span className="pv-label">Seller's lowest price</span>
            <span className="hidden-amount">Rp ● ● ● ● ●</span>
            <p className="muted">Sealed once, when the item is listed.</p>
          </div>
          <img className="sticker private-sticker" src={balanceScale} alt="" />
          <div className="private-card">
            <span className="pv-label">Buyer's highest offer</span>
            <span className="hidden-amount">Rp ● ● ● ● ●</span>
            <p className="muted">Encrypted on the buyer's phone.</p>
          </div>
        </div>
        <p className="private-result">
          What you both see: <b className="num">Rp 5.200.000</b>, or <b>No deal</b>. Each round says one thing, nothing more.
        </p>
      </section>

      <section className="landing-section" aria-labelledby="more">
        <h2 id="more">Made for selling from your bio</h2>
        <ul className="features">
          <li>
            <img className="sticker feature-sticker" src={pricePin} alt="" />
            <h3>One link for your whole shop</h3>
            <p>Put /@yourname in your Instagram or marketplace bio. Every item, photo and asking price is there.</p>
          </li>
          <li>
            <h3>An assistant that knows the item</h3>
            <p>Buyers ask about the item and get an answer from the listing. It never knows anyone's price.</p>
          </li>
          <li>
            <h3>Up to three rounds</h3>
            <p>The seller picks how many. A buyer can only raise, so nobody can fish for your number.</p>
          </li>
          <li>
            <h3>Chat after the deal</h3>
            <p>No haggling in DMs. Chat opens only once you have a deal, to arrange the handover.</p>
          </li>
        </ul>
      </section>

      <section className="landing-cta">
        <h2>Got something to sell?</h2>
        <p>Open a shop with a NEAR wallet, list it, and put the link in your bio. Testnet only, no real money.</p>
        <div className="landing-actions">
          <Link to="/signin" className="primary big">
            Open a shop
          </Link>
          <Link to="/" className="outline-button">
            Browse items
          </Link>
        </div>
      </section>
    </main>
  );
}
