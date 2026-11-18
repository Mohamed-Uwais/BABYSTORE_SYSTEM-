import { Helmet } from 'react-helmet-async';
import {useContent} from '../context/ContentContext';

const SITE_NAME = 'LITTORA';
const BASE_URL = 'https://littora.lk';

export default function SEO({ title, description, path = '', type = 'website', image, noIndex=false }) {
  const pages=useContent().pages;
  const key=path.startsWith('/policies/')?path.split('/')[2]:path.slice(1);
  const managed=pages?.[key];
  title=managed?.title||title;description=managed?.meta_description||description;
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Baby Care, Toys & Home Décor`;
  const desc = description || 'Shop baby care, toys, flowers and home décor from LITTORA in Sri Lanka. Explore current products, prices and availability.';
  const url = `${BASE_URL}${path}`;
  const ogImage = new URL(image || '/favicon.png',BASE_URL).href;
  const privatePage=/^\/(checkout|track|order-confirmation)(\/|$)/.test(path);
  const preview=new URLSearchParams(window.location.search).has('preview');
  const local=['localhost','127.0.0.1','[::1]'].includes(window.location.hostname);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={noIndex||privatePage||preview||local?'noindex, nofollow':'index, follow'} />
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
