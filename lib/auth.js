import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./mongodb";
import User from "@/models/User";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await dbConnect();

        const user = await User.findOne({
          email: credentials.email.toLowerCase(),
        }).select("+password");

        if (!user || !user.password) {
          throw new Error("No account found with this email");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          plan: user.plan,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        await dbConnect();
        const existing = await User.findOne({ email: user.email });
        if (!existing) {
          await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
            provider: "google",
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      await dbConnect();

      if (user?.email) {
        token.email = user.email;
      }

      const lookupId = token.id;
      const lookupEmail = token.email || user?.email;
      const dbUser =
        (lookupId && (await User.findById(lookupId))) ||
        (lookupEmail && (await User.findOne({ email: lookupEmail }))) ||
        null;

      if (dbUser) {
        // Always resolve to OUR MongoDB user id, regardless of provider.
        // (For Google sign-in, `user.id` is Google's own account id, not a Mongo ObjectId.)
        token.id = dbUser._id.toString();
        token.email = dbUser.email;
        token.name = dbUser.name;
        token.image = dbUser.image;
        token.plan = dbUser.plan || "free";
        token.preferredName = dbUser.preferredName || "";
      }

      if (!token.plan) token.plan = "free";
      if (typeof token.preferredName !== "string") token.preferredName = "";
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.plan = token.plan;
        session.user.preferredName = token.preferredName || "";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
