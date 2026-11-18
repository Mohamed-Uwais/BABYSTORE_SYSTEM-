import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import WhatsAppButton from './WhatsAppButton';
import ChatWidget from './ChatWidget';
import CookieConsent from './CookieConsent';
import PromoBanner from './PromoBanner';
import Announcement from './Announcement';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:p-4">Skip to main content</a>
      <PromoBanner />
      <Announcement />
      <Header />
      <main id="main-content" tabIndex={-1} className="storefront-main flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <ChatWidget />
      <CookieConsent />
    </div>
  );
}
