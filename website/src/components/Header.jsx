import {usePanelMotion} from './StoreMotion';
import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate,useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag, Search, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import api from '../api/client';
import {useContent} from '../context/ContentContext';
import useDialogFocus from './useDialogFocus';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
  { to: '/track', label: 'Track Order' },
];

export default function Header() {
  const panelMotion=usePanelMotion('top');
  const {navigation}=useContent();
  const navLinks=navigation?.items||NAV_LINKS;
  const { itemCount, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchDialog=useDialogFocus(searchOpen,()=>setSearchOpen(false));
  const location=useLocation();
  const [activeSection,setActiveSection]=useState('hero');
  useEffect(()=>{const update=event=>setActiveSection(event.detail);window.addEventListener('littora-section',update);return()=>window.removeEventListener('littora-section',update);},[]);
  const sectionActive=link=>location.pathname==='/'&&link.to.split('#')[1]===activeSection;
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    api.get('/store-info').then(r => {
      if (r.data.data?.logo_url) setLogoUrl(r.data.data.logo_url);
    }).catch(() => {});
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchStatus, setSearchStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setSuggestions([]);
    setSearchStatus('');
    if (!searchOpen || searchQuery.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchStatus('Searching…');
      try {
        const response = await api.get('/products', { params: { search: searchQuery.trim(), limit: 5, view: 'card' }, signal: controller.signal });
        if (controller.signal.aborted) return;
        setSuggestions(response.data.data.products);
        setSearchStatus(response.data.data.total ? (response.data.data.suggested ? 'Similar products' : 'Matching products') : 'No matches. Try another word or browse Shop.');
      } catch {
        if (!controller.signal.aborted) setSearchStatus('Search unavailable. Please try again.');
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery, searchOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  }

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 ${
      isActive
        ? 'text-primary-600'
        : 'text-slate-600 hover:text-primary-600'
    }`;

  return (
    <>
      <header
        className={`sticky top-0 z-50 py-3 transition-colors duration-300 ${
          scrolled
            ? 'bg-white/90 shadow-sm backdrop-blur-lg'
            : 'bg-white'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            {logoUrl ? (
              <img src={logoUrl} alt="LITTORA" className="h-9 w-9 rounded-xl object-contain" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-bold text-white shadow-sm">
                L
              </div>
            )}
            <span className="text-lg font-bold text-slate-900">LITTORA</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} aria-current={l.to.includes('#')?(sectionActive(l)?'location':'false'):undefined} className={({isActive})=>linkClass({isActive:l.to.includes('#')?sectionActive(l):isActive})} end={l.to === '/'}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setOpen(true)}
              className="relative rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-bold text-white"
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            {...panelMotion}
              className="absolute inset-x-0 top-full max-h-[75vh] overflow-y-auto border-t border-slate-100 bg-white shadow-xl lg:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                {navLinks.map(l => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 pt-24 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              {...panelMotion}
              ref={searchDialog} role="dialog" aria-modal="true" aria-label="Product search" tabIndex={-1}
              className="mx-4 w-full max-w-xl"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false); }}
            >
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  aria-label="Search products"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search diapers, wipes..."
                  className="w-full rounded-2xl border-0 bg-white py-4 pl-12 pr-4 text-lg shadow-2xl outline-none ring-2 ring-primary-200 placeholder:text-slate-400 focus:ring-primary-400"
                />
              </form>
              {searchStatus && <div className="mt-2 rounded-xl bg-white p-4 shadow-xl">
                <p role="status" className="mb-2 text-sm text-slate-600">{searchStatus}</p>
                <ul>{suggestions.map(product => <li key={product.id}>
                  <Link to={`/product/${product.slug}`} onClick={() => setSearchOpen(false)} className="block rounded-lg p-3 text-slate-900 hover:bg-slate-100 focus-visible:outline-2">
                    {product.name}
                  </Link>
                </li>)}</ul>
                <Link to={`/shop?search=${encodeURIComponent(searchQuery.trim())}`} onClick={() => setSearchOpen(false)} className="mt-2 inline-block text-primary-700 underline">View all results</Link>
              </div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
