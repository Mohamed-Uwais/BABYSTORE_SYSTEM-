// Safe fallbacks, not testimonials, performance claims or invented promotions.
export const DEFAULTS = {
  hero: {badge:'LITTORA',headline_1:'Little essentials. Lovely homes.',headline_2:'Discover something for your family.',subtitle:'Explore baby care, toys, flowers and home décor.',cta_text:'Shop now',whatsapp_text:'Contact us',delivery_msg:''},
  promo_banners:{banners:[]}, categories:{items:[]}, stats:{items:[]},
  brand_story:{title:'Welcome to LITTORA',paragraph_1:'Explore our collection of everyday essentials and thoughtful gifts.',paragraph_2:''},
  testimonials:{items:[]},
  cta_banner:{badge:'Explore LITTORA',headline:'Find your favourites',subtitle:''},
  footer:{phone:'',email:'',address:'',facebook:'',instagram:'',youtube:'',tiktok:'',whatsapp:''},
  announcement_bar:{text:'',enabled:false},
  pages:{},
  articles:{items:[]},
  homepage:{sections:['hero','offers','categories','featured','story','testimonials','offer_banner','new_arrivals','blog','closing'].map(key=>({key,enabled:true})),featured_slugs:[]},
  navigation:{items:[{label:'Home',to:'/'},{label:'Shop',to:'/shop'},{label:'Blog',to:'/blog'},{label:'About',to:'/about'},{label:'Contact',to:'/contact'},{label:'Track order',to:'/track'}]},
  appearance:{palette:'ocean',motion:'subtle',density:'comfortable'},
};
