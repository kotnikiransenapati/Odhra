import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send, 
  MessageCircle,
  HelpCircle,
  ShoppingBag,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navbar } from '@/components/layout/Navbar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead, breadcrumbJsonLd } from '@/components/SEOHead';

const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  email: z.string().trim().email('Please enter a valid email').max(255),
  phone: z.string().max(20).optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200, 'Subject is too long'),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000, 'Message is too long'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const contactInfo = [
  {
    icon: Mail,
    title: 'Email',
    value: 'support@odhra.com',
    description: 'We reply within 24 hours',
  },
  {
    icon: Phone,
    title: 'Phone',
    value: '+91 1800 123 4567',
    description: 'Mon-Sat, 9AM-6PM IST',
  },
  {
    icon: MapPin,
    title: 'Office',
    value: 'Mumbai, Maharashtra',
    description: 'India',
  },
  {
    icon: Clock,
    title: 'Hours',
    value: '9:00 AM - 6:00 PM',
    description: 'Monday to Saturday',
  },
];

const quickLinks = [
  { icon: HelpCircle, title: 'FAQs', description: 'Find quick answers', link: '/faq' },
  { icon: ShoppingBag, title: 'Order Issues', description: 'Track or modify orders', link: '/orders' },
  { icon: Store, title: 'Vendor Support', description: 'Help for sellers', link: '/become-vendor' },
];

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          subject: data.subject,
          message: data.message,
          topic: 'other',
        });
      if (error) throw error;
      toast.success('Message sent! We\'ll get back to you soon.');
      reset();
    } catch (err: any) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Contact Us" description="Get in touch with Odhra. We're here to help with orders, vendor support, and more." jsonLd={breadcrumbJsonLd([{ name: 'Home', url: 'https://odhra1.lovable.app/' }, { name: 'Contact Us', url: 'https://odhra1.lovable.app/contact' }])} />
      <Navbar />
      <main className="pt-20">
        {/* Editorial Hero */}
        <section className="border-b border-border/40 bg-gradient-to-br from-accent/[0.04] via-background to-primary/[0.04]">
          <div className="container mx-auto px-4 py-14 md:py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-center gap-2 mb-4 text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
                <span className="inline-block w-8 h-px bg-border" />
                <span className="font-medium">We're Listening</span>
                <span className="inline-block w-8 h-px bg-border" />
              </div>
              <h1 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight mb-4">
                Get in Touch
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
                Have a question or need help? We're here for you — reach out and we'll respond as quickly as we can.
              </p>
            </motion.div>
          </div>
        </section>


        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Contact Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-2"
              >
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-accent" />
                      Send us a Message
                    </CardTitle>
                    <CardDescription>
                      Fill out the form below and we'll get back to you shortly
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" placeholder="John Doe" {...register('name')} />
                          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
                          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone (Optional)</Label>
                          <Input id="phone" type="tel" placeholder="+91 98765 43210" {...register('phone')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="topic">Topic</Label>
                          <Select>
                            <SelectTrigger id="topic">
                              <SelectValue placeholder="Select a topic" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="order">Order Issue</SelectItem>
                              <SelectItem value="product">Product Inquiry</SelectItem>
                              <SelectItem value="vendor">Vendor Support</SelectItem>
                              <SelectItem value="payment">Payment Issue</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" placeholder="How can we help you?" {...register('subject')} />
                        {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          placeholder="Please describe your inquiry in detail..."
                          rows={5}
                          {...register('message')}
                        />
                        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                      </div>

                      <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                        {isSubmitting ? (
                          'Sending...'
                        ) : (
                          <>
                            Send Message
                            <Send className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {contactInfo.map((info) => (
                      <div key={info.title} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <info.icon className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{info.value}</p>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Help</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickLinks.map((link) => (
                      <Link
                        key={link.title}
                        to={link.link}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <link.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{link.title}</p>
                          <p className="text-xs text-muted-foreground">{link.description}</p>
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
