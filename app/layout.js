import { Space_Grotesk, Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500"],
  style: ["italic", "normal"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://multimind-ai.vercel.app";
const siteTitle = "MultiMind — All Your AI Models in One Workspace";
const siteDescription =
  "Ask once and route work across ChatGPT, Claude, Gemini, Groq, DeepSeek, and future AI models from one focused workspace. Compare answers instantly and keep every conversation in one place.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s · MultiMind",
  },
  description: siteDescription,
  keywords: [
    "multi AI chat app",
    "ChatGPT Claude Gemini in one app",
    "compare AI models",
    "AI chatbot workspace",
    "best AI assistant comparison",
    "ChatGPT vs Claude vs Gemini",
    "multiple AI models one prompt",
    "AI model router",
  ],
  authors: [{ name: "MultiMind" }],
  creator: "MultiMind",
  publisher: "MultiMind",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "MultiMind",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "MultiMind",
      url: siteUrl,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "MultiMind",
      description: siteDescription,
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

// Without this, Android Chrome treats the on-screen keyboard as an overlay
// that sits on top of the page — so a bottom-pinned element like the chat
// input doesn't get pushed up above it and ends up rendered partly behind/
// clipped by the keyboard. "resizes-content" tells the browser to shrink
// the layout viewport instead, so h-dvh containers (see ChatDashboard)
// actually resize and the input stays visible above the keyboard.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  // "cover" lets the page draw under the phone's status bar / gesture
  // nav bar, which is what makes env(safe-area-inset-*) resolve to a
  // real pixel value instead of 0 — without it the chat input pill
  // sits flush against (and gets covered by) the on-screen nav bar.
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  // Render the signed-in user's saved theme straight from the DB during SSR
  // so it's correct on the very first paint. Previously the page always
  // rendered with no theme (falling back to the dark "midnight" default)
  // and only switched to the real theme once client JS read localStorage
  // and/or the /api/user/settings fetch resolved a moment later — that gap
  // is what caused the "black flash before Sepia" on reload, and it was
  // worse on a device/browser that didn't have mm-theme in localStorage yet.
  let serverTheme = null;
  if (session?.user?.id) {
    try {
      await dbConnect();
      const dbUser = await User.findById(session.user.id).select("theme").lean();
      serverTheme = dbUser?.theme || null;
    } catch (e) {
      // DB hiccup — the client-side script below will still cover it
    }
  }

  return (
    <html
      lang="en"
      data-theme={serverTheme || undefined}
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Only needed when the server couldn't already set the theme
                // (logged-out visitor, or a DB hiccup during render).
                if (!document.documentElement.getAttribute('data-theme')) {
                  var stored = localStorage.getItem('mm-theme');
                  if (stored) {
                    document.documentElement.setAttribute('data-theme', stored);
                  } else if (
                    window.matchMedia &&
                    window.matchMedia('(prefers-color-scheme: light)').matches
                  ) {
                    // Brand-new visitor with no saved preference yet — match
                    // their device instead of always defaulting to dark.
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-body antialiased">
        <Providers session={session}>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}