import type { MetadataRoute } from "next";

const BASE_URL = "https://pass.co.zw";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`,        lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/about`,   lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    { url: `${BASE_URL}/signup`,  lastModified: now, changeFrequency: "yearly",  priority: 0.5 },
    { url: `${BASE_URL}/login`,   lastModified: now, changeFrequency: "yearly",  priority: 0.4 },
  ];
}
