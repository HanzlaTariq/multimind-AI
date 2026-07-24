import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import { sendSignupOtpEmail } from "@/lib/email";
import PendingSignup from "@/models/PendingSignup";
import User from "@/models/User";

export async function POST(req) {
  try {
    const { name, email, password, otp } = await req.json();
    const normalizedEmail = email?.toLowerCase().trim();

    if (!name || !normalizedEmail || !password) {
      return Response.json(
        { error: "Name, email and password are all required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return Response.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    if (otp) {
      const pendingSignup = await PendingSignup.findOne({ email: normalizedEmail }).select(
        "+otpHash"
      );

      if (!pendingSignup || pendingSignup.expiresAt < new Date()) {
        return Response.json(
          { error: "Your verification code expired. Please request a new code." },
          { status: 400 }
        );
      }

      const isOtpValid = await bcrypt.compare(String(otp).trim(), pendingSignup.otpHash);
      if (!isOtpValid) {
        return Response.json({ error: "Invalid verification code" }, { status: 400 });
      }

      const user = await User.create({
        name: pendingSignup.name,
        email: pendingSignup.email,
        password: pendingSignup.password,
        provider: "credentials",
      });

      await PendingSignup.deleteOne({ _id: pendingSignup._id });

      return Response.json(
        {
          message: "Account verified and created. Welcome to MultiMind!",
          userId: user._id.toString(),
        },
        { status: 201 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const signupOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(signupOtp, 12);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PendingSignup.findOneAndUpdate(
      { email: normalizedEmail },
      {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        otpHash,
        expiresAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const { error } = await sendSignupOtpEmail({
      name,
      email: normalizedEmail,
      otp: signupOtp,
    });

    if (error) {
      console.error("Signup OTP email error:", error);
      return Response.json(
        { error: "Could not send verification email. Please try again." },
        { status: 500 }
      );
    }

    return Response.json(
      { message: "Verification code sent to your email", needsOtp: true },
      { status: 200 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return Response.json(
      { error: "Something went wrong while creating your account" },
      { status: 500 }
    );
  }
}
