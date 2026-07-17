import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useContent } from '../context/ContentContext';

const QUICK_LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About Us' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
  { to: '/track', label: 'Track Order' },
];

export default function Footer() {
  const { footer } = useContent();

  return (
    <footer className="relative mt-auto bg-slate-900 text-slate-300">
      <div className="absolute -top-1 left-0 right-0">
        <svg viewBox="0 0 1440 48" fill="none" className="w-full" preserveAspectRatio="none">
          <path d="M0 48V24C360 0 720 48 1080 24C1260 12 1380 12 1440 18V48H0Z" fill="var(--color-warm-50)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 text-sm font-bold text-white">
                LD
              </div>
              <span className="text-lg font-bold text-white">
                Littora <span className="text-primary-400">Diapers</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Sri Lanka's best place to buy diapers and wet wipes.
              Better prices, faster delivery, always in stock.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Quick Links</h3>
            <ul className="space-y-2.5">
              {QUICK_LINKS.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-slate-400 transition hover:text-primary-400">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-slate-400">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" />
                <span>{footer.address}</span>
              </li>
              <li>
                <a href={`tel:${footer.phone?.replace(/\s/g, '')}`} className="flex items-center gap-2.5 text-sm text-slate-400 transition hover:text-primary-400">
                  <Phone className="h-4 w-4 text-primary-400" />
                  {footer.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${footer.email}`} className="flex items-center gap-2.5 text-sm text-slate-400 transition hover:text-primary-400">
                  <Mail className="h-4 w-4 text-primary-400" />
                  {footer.email}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Follow Us</h3>
            <div className="flex gap-3">
              <a href={footer.facebook || '#'} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-primary-500/10 hover:text-primary-400" aria-label="Facebook">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
              </a>
              <a href={footer.instagram || '#'} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-primary-500/10 hover:text-primary-400" aria-label="Instagram">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>
              </a>
              <a href={`https://wa.me/${footer.whatsapp || '94771234567'}`} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-400" aria-label="WhatsApp">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Littora Diapers. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
