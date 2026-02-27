import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  CheckCircle,
  Info,
  AlertTriangle,
  Users,
  Shield,
  Edit,
  XCircle,
  Book,
  Mail
} from 'react-feather';

function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Home
        </Link>

        <div className="max-w-4xl mx-auto prose prose-invert">
          <h1 className="text-4xl font-bold mb-8">Terms of Service (TOS)</h1>
          <p className="text-gray-400 mb-8">Effective Date: March 19, 2024</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <CheckCircle className="mr-3" size={24} />
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300">
              By accessing and using the Ctrl, Alt, Stock website (the "Site"), you agree to be bound by these Terms of Service ("TOS"). If you do not agree to these TOS, you may not access or use the Site.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Info className="mr-3" size={24} />
              2. Description of Service
            </h2>
            <p className="text-gray-300">
              Ctrl, Alt, Stock provides alerts and information about the availability of certain technology products, particularly graphics cards (GPUs), primarily through our Discord community. We aim to help users find hard-to-find items.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <AlertTriangle className="mr-3" size={24} />
              3. Disclaimer of Warranty and Limitation of Liability
            </h2>
            <div className="text-gray-300">
              <p className="mb-4"><strong>No Warranty:</strong> The information provided on the Site and through our Discord is provided "as is" and "as available" without any warranties, express or implied. We do not guarantee the accuracy, completeness, reliability, or timeliness of the information, including stock availability alerts.</p>
              
              <p className="mb-4"><strong>No Liability:</strong> Ctrl, Alt, Stock and its affiliates, officers, employees, agents, partners, and licensors shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including, but not limited to, damages for loss of profits, goodwill, use, data, or other intangible losses (even if we have been advised of the possibility of such damages), resulting from:</p>
              
              <ul className="list-disc list-inside mb-4 ml-4">
                <li>The use or the inability to use the Site;</li>
                <li>The cost of procurement of substitute goods and services;</li>
                <li>Unauthorized access to or alteration of your transmissions or data;</li>
                <li>Statements or conduct of any third party on the Site; or</li>
                <li>Any other matter relating to the Site.</li>
              </ul>

              <p className="mb-4"><strong>Stock Availability:</strong> We are not responsible for the availability of stock at any retailers. Our alerts are based on information we gather, but stock levels can change rapidly. We do not guarantee that you will be able to purchase any item based on our alerts.</p>
              
              <p><strong>Third-Party Links:</strong> The Site may contain links to third-party websites. We are not responsible for the content or practices of these websites. Your use of third-party websites is at your own risk.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Users className="mr-3" size={24} />
              4. User Conduct
            </h2>
            <p className="text-gray-300">You agree not to:</p>
            <ul className="list-disc list-inside text-gray-300 ml-4">
              <li>Use the Site for any unlawful purpose.</li>
              <li>Transmit any harmful or offensive content.</li>
              <li>Interfere with the operation of the Site.</li>
              <li>Attempt to gain unauthorized access to the Site or its systems.</li>
              <li>Scrape or otherwise extract data from the Site for commercial purposes without our express written consent.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Shield className="mr-3" size={24} />
              5. Intellectual Property
            </h2>
            <p className="text-gray-300">
              All content on the Site, including text, graphics, logos, and images, is the property of Ctrl, Alt, Stock or its licensors and is protected by copyright and other intellectual property laws. You may not use our content without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Edit className="mr-3" size={24} />
              6. Modifications to TOS
            </h2>
            <p className="text-gray-300">
              We reserve the right to modify these TOS at any time. We will post the updated TOS on the Site. Your continued use of the Site after any such changes constitutes your acceptance of the new TOS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <XCircle className="mr-3" size={24} />
              7. Termination
            </h2>
            <p className="text-gray-300">
              We may terminate your access to the Site at any time, without notice, for any reason, including, but not limited to, a violation of these TOS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Book className="mr-3" size={24} />
              8. Governing Law
            </h2>
            <p className="text-gray-300">
              These TOS shall be governed by and construed in accordance with the laws of California, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
              <Mail className="mr-3" size={24} />
              9. Contact Information
            </h2>
            <p className="text-gray-300">
              If you have any questions about these TOS, please contact us at support@ctrlaltstock.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService; 