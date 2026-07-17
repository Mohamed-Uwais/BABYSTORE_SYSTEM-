import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const DEFAULTS = {
  hero: {
    badge: "Sri Lanka's #1 Diaper & Wipes Store",
    headline_1: 'Better Prices. Faster Delivery.',
    headline_2: 'Diapers. Wipes. Delivered.',
    subtitle: 'The best place in Sri Lanka to buy diapers and wet wipes. Genuine brands, unbeatable prices, always in stock.',
    cta_text: 'Shop Now',
    whatsapp_text: 'Chat on WhatsApp',
    delivery_msg: 'Free delivery on orders over Rs. 5,000',
  },
  promo_banners: {
    banners: [
      { text: 'Buy 2 Get 1 Free on Huggies this week!', icon: '🔥', cta: 'Shop Huggies', link: '/shop?brand=Huggies', color: 'orange' },
      { text: 'Free Delivery over Rs. 5,000!', icon: '🚚', cta: 'Start Shopping', link: '/shop', color: 'green' },
      { text: 'New: MamyPoko Extra Dry now in stock!', icon: '🎁', cta: 'View Now', link: '/shop?brand=MamyPoko', color: 'blue' },
    ],
  },
  categories: {
    items: [
      { name: 'Diapers', desc: 'Pants & tape-style, every size always in stock', brands: 'Pampers · Huggies · MamyPoko' },
      { name: 'Wet Wipes', desc: 'Baby wipes for every need — scented, unscented, travel', brands: 'Pigeon · Water Wipes · Huggies' },
      { name: 'Trending', desc: 'Cute finds and gifting essentials parents love', brands: 'Seasonal picks · Gifts · Accessories' },
    ],
  },
  stats: {
    items: [
      { value: '500+', label: 'Happy Parents' },
      { value: '10,000+', label: 'Packs Delivered' },
      { value: '24hr', label: 'Fast Delivery' },
      { value: '100%', label: 'Genuine Products' },
    ],
  },
  brand_story: {
    title: 'Why Parents Choose Littora',
    paragraph_1: "We started Littora because we noticed Sri Lankan parents were paying too much for diapers. As parents ourselves, we knew there had to be a better way — genuine products at fair prices, delivered right to your doorstep.",
    paragraph_2: "Today, we're trusted by hundreds of families across the island. We work directly with authorized distributors to guarantee every product is 100% genuine — no fakes, no expired stock, no compromises on your baby's comfort.",
  },
  testimonials: {
    items: [
      { quote: "Best prices for Huggies in Sri Lanka. Delivery was super fast — ordered at 10am and got it by 3pm the same day!", name: 'Amaya Perera', city: 'Colombo 05', stars: 5 },
      { quote: "මාසයක් පාසා order කරනවා. සැමවිටම genuine products, කවදාවත් disappoint වෙලා නෑ. Highly recommend! 💯", name: 'Sanduni Fernando', city: 'Nugegoda', stars: 5 },
      { quote: "Love how easy it is to reorder through WhatsApp! The team remembers my usual order. Personal service you won't find anywhere else.", name: 'Nimesha Silva', city: 'Galle', stars: 5 },
    ],
  },
  cta_banner: {
    badge: 'Limited Time Offers',
    headline: 'Ready to Stock Up?',
    subtitle: 'Free delivery on orders over Rs. 5,000. Buy 2 Get 1 Free on selected brands!',
  },
  footer: {
    phone: '+94 77 123 4567',
    email: 'hello@littoradiapers.com',
    address: 'Colombo, Sri Lanka',
    facebook: '#',
    instagram: '#',
    whatsapp: '94771234567',
  },
  announcement_bar: {
    text: 'Buy 2 Get 1 FREE!',
    enabled: true,
  },
};

const ContentContext = createContext(DEFAULTS);

export function ContentProvider({ children }) {
  const [content, setContent] = useState(DEFAULTS);

  useEffect(() => {
    api.get('/content')
      .then(r => {
        const data = r.data?.data || {};
        const merged = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS)) {
          if (data[key]) merged[key] = { ...DEFAULTS[key], ...data[key] };
        }
        setContent(merged);
      })
      .catch(() => {});
  }, []);

  return (
    <ContentContext.Provider value={content}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}
