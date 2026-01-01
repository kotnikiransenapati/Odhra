import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        <section className="py-16 bg-gradient-to-br from-accent/5 via-transparent to-primary/5">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FileText className="w-12 h-12 text-accent mx-auto mb-4" />
              <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
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
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using Odhra ("the Platform"), you agree to be bound by these 
                Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Odhra is an online marketplace that connects buyers with verified vendors. 
                We provide the platform for transactions but are not directly involved in the 
                sale of products between vendors and buyers.
              </p>

              <h2>3. User Accounts</h2>
              <p>
                To use certain features of the Platform, you must register for an account. You agree to:
              </p>
              <ul>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>

              <h2>4. Buyer Terms</h2>
              <p>As a buyer on Odhra, you agree to:</p>
              <ul>
                <li>Pay for purchases in full using approved payment methods</li>
                <li>Provide accurate shipping information</li>
                <li>Accept delivery of purchased items</li>
                <li>Report any issues within the specified timeframes</li>
              </ul>

              <h2>5. Vendor Terms</h2>
              <p>As a vendor on Odhra, you agree to:</p>
              <ul>
                <li>Provide accurate product descriptions and images</li>
                <li>Ship products within the stated timeframes</li>
                <li>Honor all listed prices and promotions</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Maintain appropriate business licenses and permits</li>
              </ul>

              <h2>6. Prohibited Activities</h2>
              <p>Users are prohibited from:</p>
              <ul>
                <li>Selling counterfeit, illegal, or prohibited items</li>
                <li>Engaging in fraudulent activities</li>
                <li>Manipulating reviews or ratings</li>
                <li>Circumventing platform fees</li>
                <li>Harassing other users</li>
                <li>Violating intellectual property rights</li>
              </ul>

              <h2>7. Payments and Fees</h2>
              <p>
                All transactions are processed through our secure payment system. Vendors 
                are charged a commission on each sale as outlined in the Vendor Agreement. 
                Buyers may be charged shipping fees based on the delivery location.
              </p>

              <h2>8. Returns and Refunds</h2>
              <p>
                Our return policy allows returns within 7 days of delivery for most products. 
                Refunds are processed within 5-7 business days after the returned item is 
                received and verified. Some items are non-returnable as specified in the product listing.
              </p>

              <h2>9. Intellectual Property</h2>
              <p>
                All content on the Platform, including logos, text, graphics, and software, 
                is the property of Odhra or its licensors and is protected by copyright and 
                trademark laws. Users may not use our intellectual property without written permission.
              </p>

              <h2>10. Limitation of Liability</h2>
              <p>
                Odhra is not liable for any indirect, incidental, special, or consequential 
                damages arising from your use of the Platform. Our total liability shall not 
                exceed the amount you paid for the specific transaction in question.
              </p>

              <h2>11. Dispute Resolution</h2>
              <p>
                Any disputes between users should first be resolved through our support system. 
                If a resolution cannot be reached, disputes will be settled through binding 
                arbitration in accordance with Indian law, with Mumbai as the seat of arbitration.
              </p>

              <h2>12. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Users will be notified 
                of significant changes via email or platform notification. Continued use of the 
                Platform after changes constitutes acceptance of the new terms.
              </p>

              <h2>13. Contact Information</h2>
              <p>
                For questions about these Terms of Service, please contact us at:
              </p>
              <p>
                Email: legal@odhra.com<br />
                Address: Odhra Technologies Pvt. Ltd., Mumbai, Maharashtra, India
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
