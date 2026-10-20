import images from '../hero-images.json';

// Unknown CMS images retain their existing URL. Local photographs have fingerprinted variants.
export default function HeroImage({ src, alt = '', loading = 'eager', fetchPriority, ...props }) {
  const variants = images[src];
  const srcSet = format => variants[format].map(v => `${v.src} ${v.width}w`).join(', ');
  return (
    <picture>
      {variants && <source type="image/avif" srcSet={srcSet('avif')} sizes="100vw" />}
      {variants && <source type="image/webp" srcSet={srcSet('webp')} sizes="100vw" />}
      <img {...props} src={src} alt={alt} width={variants?.width} height={variants?.height}
        loading={loading} fetchPriority={fetchPriority} decoding="async" />
    </picture>
  );
}
