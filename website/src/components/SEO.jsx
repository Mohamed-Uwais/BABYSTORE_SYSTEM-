import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'LITTORA';
const BASE_URL = 'https://littoradiapers.com';

export default function SEO({ title, description, path = '', type = 'website', image }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Diapers & Wet Wipes, Sri Lanka`;
  const desc = description || 'Sri Lanka\'s best place to buy diapers and wet wipes. Better prices, faster delivery, always in stock. Genuine brands delivered island-wide.';
  const url = `${BASE_URL}${path}`;
  const ogImage = image || `${BASE_URL}/og-default.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_LK" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
