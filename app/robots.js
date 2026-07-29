const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://multimind-ai.vercel.app";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api", "/share"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}