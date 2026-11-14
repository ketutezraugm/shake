export type ShareResult = "shared" | "copied" | "cancelled";

type ShareTarget = Pick<Navigator, "clipboard"> & { share?: Navigator["share"] };

/** Opens the phone's share sheet (Facebook, WhatsApp, ...) where there is one; on desktop it copies the link. */
export async function shareLink(url: string, title: string, target: ShareTarget = navigator): Promise<ShareResult> {
  if (target.share) {
    try {
      await target.share({ title, url });
      return "shared";
    } catch (e) {
      // Closing the share sheet is a choice, not an error.
      if ((e as Error).name === "AbortError") return "cancelled";
      throw e;
    }
  }
  await target.clipboard.writeText(url);
  return "copied";
}
