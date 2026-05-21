import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/papers",
          "/study",
          "/projects",
          "/resources",
          "/profile",
          "/checkout",
          "/payments",
          "/onboarding",
          "/api/",
        ],
      },
    ],
    sitemap: "https://pass.co.zw/sitemap.xml",
  };
}
