import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { chainFor } from "./client";
import { getInbox, splitInbox } from "./inbox";
import { canHover, hoverIntent } from "./hoverIntent";
import type { Profile, Shop } from "./market";
import { relayerUrl } from "./config";
import { market } from "./marketSource";
import { fetchLinkedShop } from "./wallet";

/** A header menu that opens by tap, or by a real mouse resting on it, and closes on an outside press or Escape. */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const hover = useMemo(() => hoverIntent(() => setOpen(true), () => setOpen(false)), []);
  useEffect(() => hover.cancel, [hover]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    addEventListener("pointerdown", onPointer);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("pointerdown", onPointer);
      removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mouse only: touch and pen open by tap, and a tap would otherwise also fire a pointerenter.
  const onHover = (act: () => void) => (event: ReactPointerEvent) => event.pointerType === "mouse" && canHover() && act();
  return { open, setOpen, root, hoverProps: { onPointerEnter: onHover(hover.enter), onPointerLeave: onHover(hover.leave) } };
}

/** The signed-in person's own shop, for the chips and cards that show its name and photo; null until it loads or if it fails. */
export function useMyShop(handle: string | null): Shop | null {
  const [shop, setShop] = useState<Shop | null>(null);
  useEffect(() => {
    if (!handle) return;
    let current = true;
    market
      .profile(handle)
      .then((found) => current && setShop(found))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [handle]);
  return shop;
}

/** The wallet account and shop behind a Google or email login, so that login shows the same name as the wallet; null if never linked. */
export function useLinkedShop(token: string | null): { account: string; profile: Profile } | null {
  const [linked, setLinked] = useState<{ account: string; profile: Profile } | null>(null);
  useEffect(() => {
    if (!token || !relayerUrl) return;
    let current = true;
    fetchLinkedShop(relayerUrl, token)
      .then((found) => current && setLinked(found))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [token]);
  return linked;
}

const POLL_MS = 30_000;

/** Things waiting on the shop: questions to answer and rounds to open. Silent on failure; the chip just shows no number. */
export function useWaiting(account: string | null): number {
  const [waiting, setWaiting] = useState(0);
  useEffect(() => {
    if (!account || !relayerUrl) return;
    const { signer } = chainFor(account);
    let current = true;
    const load = () =>
      getInbox(relayerUrl!, signer)
        .then((inbox) => {
          const shop = splitInbox(inbox, "selling");
          if (current) setWaiting(shop.questions.length + shop.roundsWaiting.length);
        })
        .catch(() => undefined);
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, [account]);
  return waiting;
}
