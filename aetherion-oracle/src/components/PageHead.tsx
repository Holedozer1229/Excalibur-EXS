import { Helmet } from "react-helmet-async";
import { SITE_ORIGIN } from "@/lib/site";

const SITE = SITE_ORIGIN;

type Props = {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogDescription?: string;
  /** Absolute https URL for og:image / twitter:image. */
  image?: string;
  imageAlt?: string;
  /** og:type — defaults to "website". */
  ogType?: string;
  /** twitter:card — defaults to "summary_large_image" when image is set, else "summary". */
  twitterCard?: "summary" | "summary_large_image";
  /** JSON-LD structured data object(s) to embed. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Emit <meta name="robots" content="noindex,nofollow"> — for private/internal routes. */
  noIndex?: boolean;
};

export function PageHead({
  title,
  description,
  path,
  ogTitle,
  ogDescription,
  image,
  imageAlt,
  ogType = "website",
  twitterCard,
  jsonLd,
  noIndex,
}: Props) {
  const url = `${SITE}${path}`;
  const card = twitterCard ?? (image ? "summary_large_image" : "summary");
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={ogTitle ?? title} />
      <meta property="og:description" content={ogDescription ?? description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      {image && <meta property="og:image" content={image} />}
      {image && imageAlt && <meta property="og:image:alt" content={imageAlt} />}
      <meta name="twitter:card" content={card} />
      <meta name="twitter:title" content={ogTitle ?? title} />
      <meta name="twitter:description" content={ogDescription ?? description} />
      {image && <meta name="twitter:image" content={image} />}
      {image && imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}

