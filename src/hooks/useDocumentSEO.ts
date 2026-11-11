import { useEffect } from "react";

export interface SEOProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: "website" | "article";
}

const BASE_URL = import.meta.env.VITE_SITE_URL || "https://ekkhwaab.in";

/**
 * Custom hook to dynamically update document title, description, canonical link,
 * and OpenGraph meta tags on client navigation.
 */
export function useDocumentSEO({ title, description, canonicalPath = "", ogType = "website" }: SEOProps) {
  useEffect(() => {
    // 1. Title
    if (title) {
      document.title = title;
    }

    // 2. Meta description
    if (description) {
      let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;
    }

    // 3. Canonical URL
    const canonicalHref = `${BASE_URL}${canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`}`.replace(/\/$/, "");
    const finalCanonical = canonicalHref || BASE_URL;

    let linkCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.rel = "canonical";
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = finalCanonical;

    // 4. OpenGraph tags
    const setMetaProperty = (property: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (title) setMetaProperty("og:title", title);
    if (description) setMetaProperty("og:description", description);
    setMetaProperty("og:url", finalCanonical);
    setMetaProperty("og:type", ogType);
  }, [title, description, canonicalPath, ogType]);
}

