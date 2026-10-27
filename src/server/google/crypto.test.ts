import { describe, expect, it } from "vitest";
import { decrypt, encrypt, signConnectToken, verifyConnectToken } from "./crypto";

describe("token encryption", () => {
  it("round-trips and uses a fresh IV every time", () => {
    const a = encrypt("1//refresh-token");
    const b = encrypt("1//refresh-token");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("1//refresh-token");
  });

  it("rejects tampered data", () => {
    const [iv, tag, data] = encrypt("secret").split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 1;
    expect(() => decrypt([iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });
});

describe("connect links", () => {
  const claims = { memberId: "m1", nonce: "n1", expiresAt: Date.now() + 60_000 };

  it("accepts a valid link", () => {
    expect(verifyConnectToken(signConnectToken(claims))).toEqual(claims);
  });

  it("rejects an expired link", () => {
    expect(verifyConnectToken(signConnectToken({ ...claims, expiresAt: Date.now() - 1 }))).toBeNull();
  });

  it("rejects a link whose contents were changed", () => {
    const [, sig] = signConnectToken(claims).split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, memberId: "someone-else" })).toString("base64url");
    expect(verifyConnectToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyConnectToken("garbage")).toBeNull();
  });
});
