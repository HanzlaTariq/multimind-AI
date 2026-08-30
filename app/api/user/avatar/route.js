import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { uploadBufferToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return Response.json({ error: "You must be signed in" }, { status: 401 });
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    return Response.json(
      { error: "Profile picture uploads aren't configured yet on the server" },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return Response.json({ error: "Please select an image" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Please upload a JPG, PNG, WEBP, or GIF image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await uploadBufferToCloudinary(buffer, {
      folder: "multimind/avatars",
      public_id: `user_${session.user.id}`,
      overwrite: true,
      resource_type: "image",
      transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }],
    });
  } catch (err) {
    return Response.json({ error: "Upload failed — please try again" }, { status: 500 });
  }

  await dbConnect();
  const user = await User.findByIdAndUpdate(
    session.user.id,
    { image: result.secure_url },
    { new: true }
  ).select("image");

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({ image: user.image });
}