import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import WhatsAppButton from './WhatsAppButton';
import CookieConsent from './CookieConsent';
import PromoBanner from './PromoBanner';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PromoBanner />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <CookieConsent />
    </div>
  );
}
