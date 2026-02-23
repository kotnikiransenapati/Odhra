import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, HelpCircle, ShoppingBag, Truck, CreditCard, RefreshCw, Store, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/layout/Navbar';
import { SEOHead, faqJsonLd } from '@/components/SEOHead';

const categories = [
  { id: 'orders', icon: ShoppingBag, label: 'Orders' },
  { id: 'shipping', icon: Truck, label: 'Shipping' },
  { id: 'payments', icon: CreditCard, label: 'Payments' },
  { id: 'returns', icon: RefreshCw, label: 'Returns' },
  { id: 'vendors', icon: Store, label: 'For Vendors' },
];

const faqs = [
  {
    category: 'orders',
    question: 'How do I track my order?',
    answer: 'You can track your order by going to "My Orders" in your account. Each order has a tracking link that shows real-time status updates. You\'ll also receive email notifications at each stage of delivery.',
  },
  {
    category: 'orders',
    question: 'Can I modify or cancel my order?',
    answer: 'You can modify or cancel your order within 1 hour of placing it, as long as it hasn\'t been shipped yet. Go to "My Orders", select the order, and click "Modify" or "Cancel". Once shipped, modifications are not possible.',
  },
  {
    category: 'orders',
    question: 'What if I receive a damaged product?',
    answer: 'If your product arrives damaged, please contact us within 48 hours with photos of the damage. We\'ll arrange a free replacement or full refund. Go to "My Orders" → Select the order → "Report Issue".',
  },
  {
    category: 'shipping',
    question: 'How long does delivery take?',
    answer: 'Standard delivery takes 3-7 business days within India. Express delivery (available in select cities) takes 1-2 business days. International shipping takes 7-14 business days depending on the destination.',
  },
  {
    category: 'shipping',
    question: 'Do you ship internationally?',
    answer: 'Yes! We ship to most countries worldwide. International shipping rates and delivery times vary by destination. You\'ll see the exact shipping cost at checkout before completing your purchase.',
  },
  {
    category: 'shipping',
    question: 'Is there free shipping?',
    answer: 'Yes, we offer free standard shipping on orders above ₹999. Express shipping is available at a flat rate of ₹149. Free shipping is also available with certain promotional codes.',
  },
  {
    category: 'payments',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit/debit cards, UPI, net banking, wallets (PayTM, PhonePe, Google Pay), and COD (Cash on Delivery) for orders under ₹10,000. International cards are also accepted.',
  },
  {
    category: 'payments',
    question: 'Is my payment information secure?',
    answer: 'Absolutely. We use industry-standard SSL encryption and partner with trusted payment gateways (Razorpay & Stripe). We never store your full card details on our servers.',
  },
  {
    category: 'payments',
    question: 'When will I be charged for my order?',
    answer: 'For online payments, you\'re charged immediately when you place the order. For COD orders, you pay when the product is delivered. If an order is cancelled, refunds are processed within 5-7 business days.',
  },
  {
    category: 'returns',
    question: 'What is your return policy?',
    answer: 'We offer a 7-day return window for most products starting from the delivery date. Products must be unused, in original packaging, with all tags attached. Some items like innerwear and personalized products are non-returnable.',
  },
  {
    category: 'returns',
    question: 'How do I initiate a return?',
    answer: 'Go to "My Orders" → Select the order → Click "Return Item". Choose your reason and schedule a pickup. Our delivery partner will collect the item from your doorstep at no extra cost.',
  },
  {
    category: 'returns',
    question: 'How long do refunds take?',
    answer: 'Once we receive and verify the returned item, refunds are processed within 2-3 business days. The amount will be credited to your original payment method within 5-7 business days depending on your bank.',
  },
  {
    category: 'vendors',
    question: 'How do I become a vendor on Odhra?',
    answer: 'Click on "Become a Seller" and fill out the application form with your business details. Our team reviews applications within 3-5 business days. Once approved, you can start listing your products immediately.',
  },
  {
    category: 'vendors',
    question: 'What are the seller fees?',
    answer: 'We charge a commission of 10-15% per sale depending on the category. There are no listing fees or monthly charges. You only pay when you make a sale. Detailed fee structure is provided during onboarding.',
  },
  {
    category: 'vendors',
    question: 'How do I get paid as a vendor?',
    answer: 'Payments are processed weekly every Monday for the previous week\'s delivered orders. You can request instant payouts for a small fee. All payments are made directly to your registered bank account.',
  },
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Frequently Asked Questions" description="Find answers to common questions about Odhra marketplace - orders, shipping, payments, returns, and more." jsonLd={faqJsonLd(faqs)} />
      <Navbar />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-gradient-to-br from-accent/5 via-transparent to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <HelpCircle className="w-12 h-12 text-accent mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
                Find answers to common questions about orders, shipping, payments, and more
              </p>
              
              {/* Search */}
              <div className="max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* Category Filters */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <Button
                variant={activeCategory === null ? 'default' : 'outline'}
                onClick={() => setActiveCategory(null)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(cat.id)}
                  className="gap-2"
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* FAQ Accordion */}
            <div className="max-w-3xl mx-auto">
              {filteredFaqs.length > 0 ? (
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFaqs.map((faq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AccordionItem value={`item-${index}`} className="border rounded-xl px-6">
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No results found</h3>
                    <p className="text-muted-foreground text-sm">
                      Try a different search term or browse by category
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Contact CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto mt-16 text-center"
            >
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <MessageCircle className="w-5 h-5 text-accent" />
                    Still have questions?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Can't find what you're looking for? Our support team is here to help.
                  </p>
                  <Button asChild>
                    <Link to="/contact">Contact Support</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
