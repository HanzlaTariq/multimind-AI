// Cloudinary config for user-uploaded content (profile pictures, etc).
// Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and
// CLOUDINARY_API_SECRET in the environment — get these from your
// Cloudinary dashboard at https://console.cloudinary.com.

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export default cloudinary;