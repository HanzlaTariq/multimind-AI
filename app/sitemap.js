const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://multimind-ai.vercel.app";

export default function sitemap() {
  const routes = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/login", priority: 0.5, changeFrequency: "yearly" },
    { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}