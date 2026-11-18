export const HOME_SECTIONS=['hero','offers','categories','featured','story','testimonials','offer_banner','new_arrivals','blog','closing'];
export const PAGE_KEYS=['about','contact','track','blog','faq','privacy','returns','shipping','terms'];
export const PAGE_NAMES={about:'About',contact:'Contact',track:'Track order',blog:'Blog',faq:'FAQs',privacy:'Privacy policy',returns:'Returns policy',shipping:'Shipping policy',terms:'Terms and conditions'};
export const MENU_DESTINATIONS=['/','/shop','/blog','/about','/contact','/track','/faq','/policies/privacy','/policies/returns','/policies/shipping','/policies/terms',...HOME_SECTIONS.map(key=>`/#${key}`)];
