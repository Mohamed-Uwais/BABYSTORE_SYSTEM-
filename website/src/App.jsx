import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import { ContentProvider } from './context/ContentContext';
import ErrorBoundary from './components/ErrorBoundary';
import {PageTransition} from './components/StoreMotion';

const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const ManagedPage = lazy(() => import('./components/ManagedPage'));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-500" />
    </div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <ContentProvider>
        <Layout>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition key={location.pathname}>
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<ManagedPage page="faq" />} />
                <Route path="/policies/:slug" element={<ManagedPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </PageTransition>
            </AnimatePresence>
          </Suspense>
        </Layout>
      </ContentProvider>
    </ErrorBoundary>
  );
}
