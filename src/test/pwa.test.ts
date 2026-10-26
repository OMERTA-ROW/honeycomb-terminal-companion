import { describe, it, expect } from "vitest";
import { swRefusalReason } from "@/lib/pwa";

describe("service worker guard", () => {
  it("refuses in development", () => expect(swRefusalReason("example.com", "", false, false)).toBe("development build"));
  it("refuses inside the editor frame", () => expect(swRefusalReason("example.com", "", true, true)).not.toBeNull());
  it("refuses on the Lovable preview address", () =>
    expect(swRefusalReason("id-preview--f5dd4092-07a4-4e53-bf40-35c167b9eaac.lovable.app", "", true, false)).not.toBeNull());
  it("honours the ?sw=off kill switch", () => expect(swRefusalReason("example.com", "?sw=off", true, false)).not.toBeNull());
  it("allows a published address", () => expect(swRefusalReason("honeycomb.lovable.app", "", true, false)).toBeNull());
});
