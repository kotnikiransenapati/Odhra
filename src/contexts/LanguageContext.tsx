import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'mr' | 'ar';

interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', dir: 'ltr' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
];

// Translation keys type
type TranslationKeys = typeof translations.en;
type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends object ? `${K}.${NestedKeyOf<T[K]>}` : K) : never }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationKeys>;

const translations = {
  en: {
    nav: {
      home: 'Home',
      shop: 'Shop',
      cart: 'Cart',
      wishlist: 'Wishlist',
      account: 'Account',
      rewards: 'Rewards',
      search: 'Search',
      signIn: 'Sign In',
      signUp: 'Sign Up',
    },
    common: {
      addToCart: 'Add to Cart',
      buyNow: 'Buy Now',
      outOfStock: 'Out of Stock',
      loading: 'Loading...',
      error: 'Something went wrong',
      retry: 'Try Again',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      viewAll: 'View All',
      seeMore: 'See More',
      noResults: 'No results found',
      backToHome: 'Back to Home',
      share: 'Share',
      copied: 'Copied!',
    },
    product: {
      reviews: 'Reviews',
      description: 'Description',
      specifications: 'Specifications',
      inStock: 'In Stock',
      freeDelivery: 'Free Delivery',
      warranty: 'Warranty',
      returnPolicy: 'Return Policy',
      similarProducts: 'Similar Products',
      recentlyViewed: 'Recently Viewed',
      notifyMe: 'Notify When Available',
      addedToCart: 'Added to cart',
      quantity: 'Quantity',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Create Account',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      orContinueWith: 'Or continue with',
      alreadyHaveAccount: 'Already have an account?',
      dontHaveAccount: "Don't have an account?",
      fullName: 'Full Name',
      phone: 'Phone Number',
    },
    checkout: {
      title: 'Checkout',
      shippingAddress: 'Shipping Address',
      paymentMethod: 'Payment Method',
      orderSummary: 'Order Summary',
      placeOrder: 'Place Order',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      total: 'Total',
      discount: 'Discount',
      promoCode: 'Promo Code',
      apply: 'Apply',
    },
    footer: {
      about: 'About Us',
      contact: 'Contact',
      faq: 'FAQ',
      terms: 'Terms & Conditions',
      privacy: 'Privacy Policy',
      followUs: 'Follow Us',
    },
    home: {
      heroTitle: 'Where Luxury Meets Innovation',
      heroSubtitle: 'Discover curated collections from premium vendors',
      shopNow: 'Shop Now',
      trending: 'Trending Now',
      featured: 'Featured Products',
      deals: 'Top Deals',
      categories: 'Shop by Category',
      newArrivals: 'New Arrivals',
    },
  },
  hi: {
    nav: {
      home: 'होम',
      shop: 'दुकान',
      cart: 'कार्ट',
      wishlist: 'विशलिस्ट',
      account: 'खाता',
      rewards: 'पुरस्कार',
      search: 'खोजें',
      signIn: 'साइन इन',
      signUp: 'साइन अप',
    },
    common: {
      addToCart: 'कार्ट में जोड़ें',
      buyNow: 'अभी खरीदें',
      outOfStock: 'स्टॉक में नहीं',
      loading: 'लोड हो रहा है...',
      error: 'कुछ गलत हो गया',
      retry: 'पुन: प्रयास करें',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      close: 'बंद करें',
      viewAll: 'सभी देखें',
      seeMore: 'और देखें',
      noResults: 'कोई परिणाम नहीं मिला',
      backToHome: 'होम पर वापस जाएं',
      share: 'शेयर करें',
      copied: 'कॉपी हो गया!',
    },
    product: {
      reviews: 'समीक्षाएं',
      description: 'विवरण',
      specifications: 'विशिष्टताएं',
      inStock: 'स्टॉक में',
      freeDelivery: 'मुफ्त डिलीवरी',
      warranty: 'वारंटी',
      returnPolicy: 'वापसी नीति',
      similarProducts: 'समान उत्पाद',
      recentlyViewed: 'हाल ही में देखा गया',
      notifyMe: 'उपलब्ध होने पर सूचित करें',
      addedToCart: 'कार्ट में जोड़ा गया',
      quantity: 'मात्रा',
    },
    auth: {
      signIn: 'साइन इन करें',
      signUp: 'खाता बनाएं',
      email: 'ईमेल',
      password: 'पासवर्ड',
      forgotPassword: 'पासवर्ड भूल गए?',
      resetPassword: 'पासवर्ड रीसेट करें',
      orContinueWith: 'या इसके साथ जारी रखें',
      alreadyHaveAccount: 'पहले से खाता है?',
      dontHaveAccount: 'कोई खाता नहीं है?',
      fullName: 'पूरा नाम',
      phone: 'फोन नंबर',
    },
    checkout: {
      title: 'चेकआउट',
      shippingAddress: 'शिपिंग पता',
      paymentMethod: 'भुगतान विधि',
      orderSummary: 'ऑर्डर सारांश',
      placeOrder: 'ऑर्डर दें',
      subtotal: 'उप-योग',
      shipping: 'शिपिंग',
      tax: 'कर',
      total: 'कुल',
      discount: 'छूट',
      promoCode: 'प्रोमो कोड',
      apply: 'लागू करें',
    },
    footer: {
      about: 'हमारे बारे में',
      contact: 'संपर्क',
      faq: 'सवाल-जवाब',
      terms: 'नियम और शर्तें',
      privacy: 'गोपनीयता नीति',
      followUs: 'हमें फॉलो करें',
    },
    home: {
      heroTitle: 'जहां विलासिता नवाचार से मिलती है',
      heroSubtitle: 'प्रीमियम विक्रेताओं से क्यूरेटेड संग्रह खोजें',
      shopNow: 'अभी खरीदें',
      trending: 'ट्रेंडिंग',
      featured: 'विशेष उत्पाद',
      deals: 'टॉप डील्स',
      categories: 'श्रेणी द्वारा खरीदें',
      newArrivals: 'नए उत्पाद',
    },
  },
  ta: {
    nav: { home: 'முகப்பு', shop: 'கடை', cart: 'கார்ட்', wishlist: 'விருப்பப்பட்டியல்', account: 'கணக்கு', rewards: 'வெகுமதிகள்', search: 'தேடு', signIn: 'உள்நுழை', signUp: 'பதிவு' },
    common: { addToCart: 'கார்ட்டில் சேர்', buyNow: 'இப்போதே வாங்கு', outOfStock: 'கையிருப்பில் இல்லை', loading: 'ஏற்றுகிறது...', error: 'ஏதோ தவறு', retry: 'மீண்டும் முயற்சி', save: 'சேமி', cancel: 'ரத்து', delete: 'நீக்கு', edit: 'திருத்து', close: 'மூடு', viewAll: 'அனைத்தும் காண', seeMore: 'மேலும் காண', noResults: 'முடிவுகள் இல்லை', backToHome: 'முகப்புக்கு திரும்பு', share: 'பகிர்', copied: 'நகலெடுக்கப்பட்டது!' },
    product: { reviews: 'மதிப்புரைகள்', description: 'விவரம்', specifications: 'விவரக்குறிப்புகள்', inStock: 'கையிருப்பில்', freeDelivery: 'இலவச டெலிவரி', warranty: 'உத்தரவாதம்', returnPolicy: 'திரும்ப நயம்', similarProducts: 'ஒத்த தயாரிப்புகள்', recentlyViewed: 'சமீபத்தில் பார்த்தவை', notifyMe: 'கிடைக்கும்போது அறிவிக்கவும்', addedToCart: 'கார்ட்டில் சேர்க்கப்பட்டது', quantity: 'அளவு' },
    auth: { signIn: 'உள்நுழை', signUp: 'கணக்கு உருவாக்கு', email: 'மின்னஞ்சல்', password: 'கடவுச்சொல்', forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?', resetPassword: 'கடவுச்சொல் மீட்டமை', orContinueWith: 'அல்லது தொடர', alreadyHaveAccount: 'ஏற்கனவே கணக்கு உள்ளதா?', dontHaveAccount: 'கணக்கு இல்லையா?', fullName: 'முழு பெயர்', phone: 'தொலைபேசி எண்' },
    checkout: { title: 'செக்அவுட்', shippingAddress: 'அனுப்பும் முகவரி', paymentMethod: 'பணம் செலுத்தும் முறை', orderSummary: 'ஆர்டர் சுருக்கம்', placeOrder: 'ஆர்டர் செய்', subtotal: 'உப-மொத்தம்', shipping: 'அனுப்புதல்', tax: 'வரி', total: 'மொத்தம்', discount: 'தள்ளுபடி', promoCode: 'புரோமோ குறியீடு', apply: 'பயன்படுத்து' },
    footer: { about: 'எங்களைப் பற்றி', contact: 'தொடர்பு', faq: 'கேள்வி பதில்', terms: 'விதிமுறைகள்', privacy: 'தனியுரிமை', followUs: 'எங்களை பின்தொடரவும்' },
    home: { heroTitle: 'ஆடம்பரம் புதுமையை சந்திக்கிறது', heroSubtitle: 'பிரீமியம் விற்பனையாளர்களிடமிருந்து தயாரிப்புகள்', shopNow: 'இப்போது வாங்கு', trending: 'ட்ரெண்டிங்', featured: 'சிறப்பு தயாரிப்புகள்', deals: 'சிறந்த ஒப்பந்தங்கள்', categories: 'வகை வாரியாக', newArrivals: 'புதிய வருகைகள்' },
  },
  te: {
    nav: { home: 'హోమ్', shop: 'షాప్', cart: 'కార్ట్', wishlist: 'విష్‌లిస్ట్', account: 'ఖాతా', rewards: 'రివార్డ్స్', search: 'వెతకండి', signIn: 'సైన్ ఇన్', signUp: 'సైన్ అప్' },
    common: { addToCart: 'కార్ట్‌కు జోడించు', buyNow: 'ఇప్పుడే కొనండి', outOfStock: 'స్టాక్ లేదు', loading: 'లోడ్ అవుతోంది...', error: 'ఏదో తప్పు జరిగింది', retry: 'మళ్ళీ ప్రయత్నించు', save: 'సేవ్', cancel: 'రద్దు', delete: 'తొలగించు', edit: 'మార్చు', close: 'మూసివేయి', viewAll: 'అన్నీ చూడండి', seeMore: 'మరిన్ని చూడండి', noResults: 'ఫలితాలు లేవు', backToHome: 'హోమ్‌కు తిరిగి', share: 'షేర్', copied: 'కాపీ చేయబడింది!' },
    product: { reviews: 'సమీక్షలు', description: 'వివరణ', specifications: 'స్పెసిఫికేషన్లు', inStock: 'స్టాక్‌లో ఉంది', freeDelivery: 'ఉచిత డెలివరీ', warranty: 'వారంటీ', returnPolicy: 'రిటర్న్ పాలసీ', similarProducts: 'సారూప్య ఉత్పత్తులు', recentlyViewed: 'ఇటీవల చూసినవి', notifyMe: 'అందుబాటులో ఉన్నప్పుడు తెలియజేయండి', addedToCart: 'కార్ట్‌కు జోడించబడింది', quantity: 'పరిమాణం' },
    auth: { signIn: 'సైన్ ఇన్', signUp: 'ఖాతా సృష్టించు', email: 'ఇమెయిల్', password: 'పాస్‌వర్డ్', forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?', resetPassword: 'పాస్‌వర్డ్ రీసెట్', orContinueWith: 'లేదా కొనసాగించండి', alreadyHaveAccount: 'ఇప్పటికే ఖాతా ఉందా?', dontHaveAccount: 'ఖాతా లేదా?', fullName: 'పూర్తి పేరు', phone: 'ఫోన్ నంబర్' },
    checkout: { title: 'చెక్అవుట్', shippingAddress: 'షిప్పింగ్ చిరునామా', paymentMethod: 'చెల్లింపు పద్ధతి', orderSummary: 'ఆర్డర్ సారాంశం', placeOrder: 'ఆర్డర్ ఇవ్వండి', subtotal: 'ఉప-మొత్తం', shipping: 'షిప్పింగ్', tax: 'పన్ను', total: 'మొత్తం', discount: 'తగ్గింపు', promoCode: 'ప్రోమో కోడ్', apply: 'వర్తించు' },
    footer: { about: 'మా గురించి', contact: 'సంప్రదించండి', faq: 'FAQ', terms: 'నిబంధనలు', privacy: 'గోప్యత', followUs: 'మమ్మల్ని అనుసరించండి' },
    home: { heroTitle: 'విలాసం ఆవిష్కరణను కలుస్తుంది', heroSubtitle: 'ప్రీమియం విక్రేతల నుండి ఉత్పత్తులు', shopNow: 'ఇప్పుడే షాప్ చేయండి', trending: 'ట్రెండింగ్', featured: 'ప్రత్యేక ఉత్పత్తులు', deals: 'టాప్ డీల్స్', categories: 'వర్గం ప్రకారం', newArrivals: 'కొత్త వచ్చినవి' },
  },
  bn: {
    nav: { home: 'হোম', shop: 'দোকান', cart: 'কার্ট', wishlist: 'ইচ্ছাতালিকা', account: 'অ্যাকাউন্ট', rewards: 'পুরস্কার', search: 'খুঁজুন', signIn: 'সাইন ইন', signUp: 'সাইন আপ' },
    common: { addToCart: 'কার্টে যোগ করুন', buyNow: 'এখনই কিনুন', outOfStock: 'স্টক নেই', loading: 'লোড হচ্ছে...', error: 'কিছু ভুল হয়েছে', retry: 'পুনরায় চেষ্টা', save: 'সংরক্ষণ', cancel: 'বাতিল', delete: 'মুছুন', edit: 'সম্পাদনা', close: 'বন্ধ', viewAll: 'সব দেখুন', seeMore: 'আরও দেখুন', noResults: 'কোনো ফলাফল নেই', backToHome: 'হোমে ফিরে যান', share: 'শেয়ার', copied: 'কপি হয়েছে!' },
    product: { reviews: 'পর্যালোচনা', description: 'বিবরণ', specifications: 'স্পেসিফিকেশন', inStock: 'স্টকে আছে', freeDelivery: 'বিনামূল্যে ডেলিভারি', warranty: 'ওয়ারেন্টি', returnPolicy: 'রিটার্ন পলিসি', similarProducts: 'একই ধরনের পণ্য', recentlyViewed: 'সম্প্রতি দেখা', notifyMe: 'উপলব্ধ হলে জানান', addedToCart: 'কার্টে যোগ হয়েছে', quantity: 'পরিমাণ' },
    auth: { signIn: 'সাইন ইন', signUp: 'অ্যাকাউন্ট তৈরি', email: 'ইমেইল', password: 'পাসওয়ার্ড', forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?', resetPassword: 'পাসওয়ার্ড রিসেট', orContinueWith: 'অথবা চালিয়ে যান', alreadyHaveAccount: 'ইতিমধ্যে অ্যাকাউন্ট আছে?', dontHaveAccount: 'অ্যাকাউন্ট নেই?', fullName: 'পুরো নাম', phone: 'ফোন নম্বর' },
    checkout: { title: 'চেকআউট', shippingAddress: 'শিপিং ঠিকানা', paymentMethod: 'পেমেন্ট পদ্ধতি', orderSummary: 'অর্ডার সারাংশ', placeOrder: 'অর্ডার দিন', subtotal: 'উপ-মোট', shipping: 'শিপিং', tax: 'কর', total: 'মোট', discount: 'ছাড়', promoCode: 'প্রোমো কোড', apply: 'প্রয়োগ' },
    footer: { about: 'আমাদের সম্পর্কে', contact: 'যোগাযোগ', faq: 'FAQ', terms: 'শর্তাবলী', privacy: 'গোপনীয়তা', followUs: 'আমাদের অনুসরণ করুন' },
    home: { heroTitle: 'যেখানে বিলাসিতা উদ্ভাবনের সাথে মিলিত হয়', heroSubtitle: 'প্রিমিয়াম বিক্রেতাদের থেকে কিউরেটেড সংগ্রহ', shopNow: 'এখনই কিনুন', trending: 'ট্রেন্ডিং', featured: 'বিশেষ পণ্য', deals: 'সেরা ডিলস', categories: 'ক্যাটাগরি অনুযায়ী', newArrivals: 'নতুন আগমন' },
  },
  mr: {
    nav: { home: 'होम', shop: 'दुकान', cart: 'कार्ट', wishlist: 'विशलिस्ट', account: 'खाते', rewards: 'बक्षिसे', search: 'शोधा', signIn: 'साइन इन', signUp: 'साइन अप' },
    common: { addToCart: 'कार्टमध्ये जोडा', buyNow: 'आत्ता खरेदी करा', outOfStock: 'स्टॉकमध्ये नाही', loading: 'लोड होत आहे...', error: 'काहीतरी चुकले', retry: 'पुन्हा प्रयत्न करा', save: 'जतन करा', cancel: 'रद्द करा', delete: 'हटवा', edit: 'संपादित करा', close: 'बंद करा', viewAll: 'सर्व पहा', seeMore: 'अधिक पहा', noResults: 'कोणतेही निकाल नाहीत', backToHome: 'मुखपृष्ठावर परत', share: 'शेअर करा', copied: 'कॉपी केले!' },
    product: { reviews: 'पुनरावलोकने', description: 'वर्णन', specifications: 'वैशिष्ट्ये', inStock: 'स्टॉकमध्ये', freeDelivery: 'मोफत डिलिव्हरी', warranty: 'वॉरंटी', returnPolicy: 'परतीचे धोरण', similarProducts: 'समान उत्पादने', recentlyViewed: 'अलीकडे पाहिलेले', notifyMe: 'उपलब्ध झाल्यावर कळवा', addedToCart: 'कार्टमध्ये जोडले', quantity: 'प्रमाण' },
    auth: { signIn: 'साइन इन करा', signUp: 'खाते तयार करा', email: 'ईमेल', password: 'पासवर्ड', forgotPassword: 'पासवर्ड विसरलात?', resetPassword: 'पासवर्ड रीसेट करा', orContinueWith: 'किंवा पुढे चला', alreadyHaveAccount: 'आधीच खाते आहे?', dontHaveAccount: 'खाते नाही?', fullName: 'पूर्ण नाव', phone: 'फोन नंबर' },
    checkout: { title: 'चेकआउट', shippingAddress: 'शिपिंग पत्ता', paymentMethod: 'पेमेंट पद्धत', orderSummary: 'ऑर्डर सारांश', placeOrder: 'ऑर्डर द्या', subtotal: 'उप-एकूण', shipping: 'शिपिंग', tax: 'कर', total: 'एकूण', discount: 'सूट', promoCode: 'प्रोमो कोड', apply: 'लागू करा' },
    footer: { about: 'आमच्याबद्दल', contact: 'संपर्क', faq: 'FAQ', terms: 'अटी', privacy: 'गोपनीयता', followUs: 'आम्हाला फॉलो करा' },
    home: { heroTitle: 'जेथे ऐशोआराम नवकल्पनाला भेटतो', heroSubtitle: 'प्रीमियम विक्रेत्यांकडून निवडलेले संग्रह', shopNow: 'आत्ता खरेदी करा', trending: 'ट्रेंडिंग', featured: 'विशेष उत्पादने', deals: 'टॉप डील्स', categories: 'श्रेणीनुसार', newArrivals: 'नवीन आगमन' },
  },
  ar: {
    nav: { home: 'الرئيسية', shop: 'المتجر', cart: 'السلة', wishlist: 'المفضلة', account: 'الحساب', rewards: 'المكافآت', search: 'بحث', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب' },
    common: { addToCart: 'أضف للسلة', buyNow: 'اشترِ الآن', outOfStock: 'نفذ من المخزون', loading: 'جاري التحميل...', error: 'حدث خطأ', retry: 'أعد المحاولة', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', close: 'إغلاق', viewAll: 'عرض الكل', seeMore: 'عرض المزيد', noResults: 'لا توجد نتائج', backToHome: 'العودة للرئيسية', share: 'مشاركة', copied: 'تم النسخ!' },
    product: { reviews: 'التقييمات', description: 'الوصف', specifications: 'المواصفات', inStock: 'متوفر', freeDelivery: 'توصيل مجاني', warranty: 'الضمان', returnPolicy: 'سياسة الإرجاع', similarProducts: 'منتجات مشابهة', recentlyViewed: 'شوهد مؤخراً', notifyMe: 'أخبرني عند التوفر', addedToCart: 'أُضيف للسلة', quantity: 'الكمية' },
    auth: { signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', email: 'البريد الإلكتروني', password: 'كلمة المرور', forgotPassword: 'نسيت كلمة المرور؟', resetPassword: 'إعادة تعيين كلمة المرور', orContinueWith: 'أو تابع مع', alreadyHaveAccount: 'لديك حساب بالفعل؟', dontHaveAccount: 'ليس لديك حساب؟', fullName: 'الاسم الكامل', phone: 'رقم الهاتف' },
    checkout: { title: 'الدفع', shippingAddress: 'عنوان الشحن', paymentMethod: 'طريقة الدفع', orderSummary: 'ملخص الطلب', placeOrder: 'تقديم الطلب', subtotal: 'المجموع الفرعي', shipping: 'الشحن', tax: 'الضريبة', total: 'الإجمالي', discount: 'الخصم', promoCode: 'رمز الخصم', apply: 'تطبيق' },
    footer: { about: 'من نحن', contact: 'اتصل بنا', faq: 'الأسئلة الشائعة', terms: 'الشروط والأحكام', privacy: 'سياسة الخصوصية', followUs: 'تابعنا' },
    home: { heroTitle: 'حيث تلتقي الفخامة بالابتكار', heroSubtitle: 'اكتشف مجموعات منتقاة من بائعين مميزين', shopNow: 'تسوق الآن', trending: 'الرائج', featured: 'منتجات مميزة', deals: 'أفضل العروض', categories: 'تسوق حسب الفئة', newArrivals: 'وصل حديثاً' },
  },
} as const;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
  languages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('odhra-language');
    return (saved as Language) || 'en';
  });

  // Fetch DB translation overrides for current language
  const { data: dbTranslations } = useQuery({
    queryKey: ['translations-override', language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('translations')
        .select('namespace, key, value')
        .eq('language_code', language);
      if (error) return [];
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build a lookup map from DB overrides
  const dbMap = useMemo(() => {
    const map = new Map<string, string>();
    dbTranslations?.forEach((t: any) => map.set(`${t.namespace}.${t.key}`, t.value));
    return map;
  }, [dbTranslations]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('odhra-language', lang);
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    if (langInfo) {
      document.documentElement.dir = langInfo.dir;
      document.documentElement.lang = lang;
    }
  }, []);

  useEffect(() => {
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);
    if (langInfo) {
      document.documentElement.dir = langInfo.dir;
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback((key: string): string => {
    // DB overrides take priority
    const dbValue = dbMap.get(key);
    if (dbValue) return dbValue;
    
    const langTranslations = translations[language];
    const value = getNestedValue(langTranslations, key);
    if (value !== key) return value;
    // Fallback to English
    return getNestedValue(translations.en, key);
  }, [language, dbMap]);

  const dir = SUPPORTED_LANGUAGES.find(l => l.code === language)?.dir || 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
