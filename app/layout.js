import { Space_Grotesk, Inter, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export const metadata = {
  title: "MultiMind - All your AI models in one workspace",
  description:
    "Ask once and route work across ChatGPT, Claude, Gemini, Groq, DeepSeek, and future AI models from one focused workspace.",
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
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = localStorage.getItem('mm-theme');
                if (t) document.documentElement.setAttribute('data-theme', t);
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