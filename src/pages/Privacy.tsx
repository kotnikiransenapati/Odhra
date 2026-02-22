import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Calendar } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { SEOHead } from '@/components/SEOHead';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Privacy Policy" description="Learn how Odhra protects your privacy and handles your personal data." />
      <Navbar />

      <main className="pt-20">
        <section className="py-16 bg-gradient-to-br from-accent/5 via-transparent to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Shield className="w-12 h-12 text-accent mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Last updated: January 1, 2024</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
              <h2>1. Introduction</h2>
              <p>
                At Odhra, we are committed to protecting your privacy. This Privacy Policy 
                explains how we collect, use, disclose, and safeguard your information when 
                you use our marketplace platform.
              </p>

              <h2>2. Information We Collect</h2>
              
              <h3>Personal Information</h3>
              <p>We collect information you provide directly, including:</p>
              <ul>
                <li>Name, email address, and phone number</li>
                <li>Shipping and billing addresses</li>
                <li>Payment information (processed securely by our payment partners)</li>
                <li>Account credentials</li>
                <li>Communication preferences</li>
              </ul>

              <h3>Automatically Collected Information</h3>
              <p>When you use our platform, we automatically collect:</p>
              <ul>
                <li>Device information (type, operating system, browser)</li>
                <li>IP address and location data</li>
                <li>Usage data (pages visited, time spent, clicks)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul>
                <li>Process and fulfill orders</li>
                <li>Communicate about your account and transactions</li>
                <li>Send promotional messages (with your consent)</li>
                <li>Improve our platform and services</li>
                <li>Detect and prevent fraud</li>
                <li>Comply with legal obligations</li>
              </ul>

              <h2>4. Information Sharing</h2>
              <p>We share your information with:</p>
              <ul>
                <li><strong>Vendors:</strong> To fulfill your orders (shipping details only)</li>
                <li><strong>Payment Processors:</strong> To process transactions securely</li>
                <li><strong>Shipping Partners:</strong> To deliver your orders</li>
                <li><strong>Service Providers:</strong> Who help us operate the platform</li>
                <li><strong>Legal Authorities:</strong> When required by law</li>
              </ul>
              <p>
                We do not sell your personal information to third parties for marketing purposes.
              </p>

              <h2>5. Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your information:
              </p>
              <ul>
                <li>SSL/TLS encryption for all data transmission</li>
                <li>Secure payment processing through certified gateways</li>
                <li>Regular security audits and monitoring</li>
                <li>Access controls and authentication measures</li>
              </ul>

              <h2>6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Opt-out of marketing communications</li>
                <li>Export your data</li>
                <li>Object to certain processing activities</li>
              </ul>

              <h2>7. Cookies</h2>
              <p>
                We use cookies and similar technologies to enhance your experience. 
                You can control cookies through your browser settings, but disabling 
                certain cookies may affect platform functionality.
              </p>
              <p>Types of cookies we use:</p>
              <ul>
                <li><strong>Essential:</strong> Required for basic functionality</li>
                <li><strong>Performance:</strong> Help us understand platform usage</li>
                <li><strong>Functional:</strong> Remember your preferences</li>
                <li><strong>Marketing:</strong> Used for relevant advertising</li>
              </ul>

              <h2>8. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as needed 
                to provide services. After account deletion, we may retain certain data 
                for legal, tax, or regulatory purposes for up to 7 years.
              </p>

              <h2>9. Children's Privacy</h2>
              <p>
                Our platform is not intended for children under 18. We do not knowingly 
                collect information from children. If you believe a child has provided us 
                with personal information, please contact us immediately.
              </p>

              <h2>10. International Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other 
                than India. We ensure appropriate safeguards are in place for such transfers 
                in compliance with applicable data protection laws.
              </p>

              <h2>11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of 
                significant changes via email or platform notification. Your continued 
                use after changes constitutes acceptance of the updated policy.
              </p>

              <h2>12. Contact Us</h2>
              <p>
                For privacy-related inquiries or to exercise your rights, contact us at:
              </p>
              <p>
                Email: privacy@odhra.com<br />
                Data Protection Officer<br />
                Odhra Technologies Pvt. Ltd.<br />
                Mumbai, Maharashtra, India
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
