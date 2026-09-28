import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImageKind, processCustomerPhoto, processGalleryImage, UnsupportedImageError } from "./images";

// A 3000×2000 JPEG with GPS coordinates, a capture date and "rotate 90°" orientation.
async function phonePhoto() {
  return sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c0503a" } })
    .jpeg()
    .withExif({
      IFD0: { Make: "TestPhone", DateTime: "2026:09:20 14:30:00" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "42/1 41/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "23/1 19/1 0/1" },
    })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

it("test photo really carries GPS and orientation", async () => {
  const meta = await sharp(await phonePhoto()).metadata();
  expect(meta.orientation).toBe(6);
  expect(meta.exif?.includes(Buffer.from("TestPhone"))).toBe(true);
  expect(meta.exif?.length).toBeGreaterThan(100);
});

describe("images", () => {
  it("detects real file types from bytes", async () => {
    expect(detectImageKind(await phonePhoto())).toBe("jpeg");
    expect(detectImageKind(await sharp({ create: { width: 2, height: 2, channels: 3, background: "#000" } }).png().toBuffer())).toBe("png");
    expect(detectImageKind(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  });

  it("resizes, applies orientation and strips all metadata including GPS", async () => {
    const out = await processGalleryImage(await phonePhoto());
    // Orientation 6 = rotated 90°, so the 3000×2000 photo becomes portrait 1333×2000.
    expect(out.width).toBe(1333);
    expect(out.height).toBe(2000);
    expect(out.takenAt?.getUTCFullYear()).toBe(2026);

    for (const buf of [out.large, out.thumb]) {
      const meta = await sharp(buf).metadata();
      expect(meta.format).toBe("webp");
      expect(meta.exif).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
    }
    expect((await sharp(out.thumb).metadata()).height).toBe(480);
    expect(out.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("processes customer photos the same way", async () => {
    const out = await processCustomerPhoto(await phonePhoto());
    expect(Math.max(out.width, out.height)).toBe(1600);
    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
  });

  it("rejects files that are not images", async () => {
    await expect(processGalleryImage(Buffer.from("definitely not an image file"))).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
  });
});
