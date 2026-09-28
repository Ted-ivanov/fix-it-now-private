// Turns an uploaded photo into web-ready versions. Metadata is always removed: phone photos
// carry GPS coordinates, and site photos are taken at customers' homes.
import exifReader from "exif-reader";
import heicConvert from "heic-convert";
import sharp from "sharp";

export class UnsupportedImageError extends Error {
  constructor(message = "Unsupported image") {
    super(message);
  }
}

export type ImageKind = "jpeg" | "png" | "webp" | "heic" | "avif";

/** Detects the real file type from its first bytes (never trust the extension or MIME type). */
export function detectImageKind(buf: Buffer): ImageKind | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
  }
  return null;
}

async function toDecodable(buf: Buffer, kind: ImageKind): Promise<Buffer> {
  if (kind !== "heic") return buf;
  // sharp's prebuilt binaries cannot decode HEVC-based HEIC (iPhone photos): convert first.
  const out = await heicConvert({ buffer: buf, format: "JPEG", quality: 0.92 });
  return Buffer.from(out);
}

function readTakenAt(exif: Buffer | undefined): Date | null {
  if (!exif) return null;
  try {
    const data = exifReader(exif);
    const value = data.Photo?.DateTimeOriginal ?? data.Image?.DateTime;
    return value instanceof Date && !Number.isNaN(value.getTime()) ? value : null;
  } catch {
    return null;
  }
}

export type ProcessedImage = {
  large: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  blurDataUrl: string;
  takenAt: Date | null;
};

const MAX_INPUT_PIXELS = 100_000_000; // refuse decompression bombs

/** Gallery photo: 2000px and 480px WebP plus a tiny blurred placeholder. */
export async function processGalleryImage(input: Buffer): Promise<ProcessedImage> {
  const kind = detectImageKind(input);
  if (!kind) throw new UnsupportedImageError();
  const buf = await toDecodable(input, kind);

  const source = sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
  const meta = await source.metadata();
  const takenAt = readTakenAt(meta.exif);

  // .rotate() applies the EXIF orientation; sharp drops all metadata unless asked to keep it.
  const base = source.rotate();
  const large = await base
    .clone()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();
  const blur = await base
    .clone()
    .resize({ width: 16, height: 16, fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();

  return {
    large: large.data,
    thumb,
    width: large.info.width,
    height: large.info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    takenAt,
  };
}

/** Customer photo attached to a booking: one 1600px WebP, metadata removed. */
export async function processCustomerPhoto(input: Buffer) {
  const kind = detectImageKind(input);
  if (!kind) throw new UnsupportedImageError();
  const buf = await toDecodable(input, kind);
  const out = await sharp(buf, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, width: out.info.width, height: out.info.height };
}
