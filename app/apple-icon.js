import { brandImageResponse } from "../lib/metadata/brand-images.mjs";

// Serve pre-rendered PNG bytes. No ImageResponse, runtime font loading,
// external font download or Windows file-URL conversion is involved.
export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return brandImageResponse("apple");
}
