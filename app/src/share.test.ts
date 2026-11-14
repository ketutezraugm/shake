import { describe, expect, it } from "vitest";
import { shareLink } from "./share";

function clipboard(): { written: string[]; clipboard: Clipboard } {
  const written: string[] = [];
  return { written, clipboard: { writeText: async (text: string) => void written.push(text) } as Clipboard };
}

describe("shareLink", () => {
  it("uses the share sheet when the device has one", async () => {
    const { written, clipboard: board } = clipboard();
    const sent: ShareData[] = [];
    const result = await shareLink("https://x/l/1", "Bike", { clipboard: board, share: async (data) => void sent.push(data!) });
    expect(result).toBe("shared");
    expect(sent).toEqual([{ title: "Bike", url: "https://x/l/1" }]);
    expect(written).toEqual([]);
  });

  it("copies the link when there is no share sheet", async () => {
    const { written, clipboard: board } = clipboard();
    expect(await shareLink("https://x/l/1", "Bike", { clipboard: board })).toBe("copied");
    expect(written).toEqual(["https://x/l/1"]);
  });

  it("treats closing the sheet as cancelled and passes other failures on", async () => {
    const { clipboard: board } = clipboard();
    const abort = async () => Promise.reject(new DOMException("closed", "AbortError"));
    expect(await shareLink("u", "t", { clipboard: board, share: abort })).toBe("cancelled");
    const denied = async () => Promise.reject(new DOMException("no", "NotAllowedError"));
    await expect(shareLink("u", "t", { clipboard: board, share: denied })).rejects.toThrow("no");
  });
});
