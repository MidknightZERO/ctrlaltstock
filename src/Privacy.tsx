import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function Privacy() {
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
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Effective Date: March 19, 2024</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <div className="text-gray-300">
              <p className="mb-4"><strong>Automatically Collected Information:</strong></p>
              <ul className="list-disc list-inside mb-4 ml-4">
                <li><strong>Log Data:</strong> We may collect information about your use of the Site, such as your IP address, browser type, operating system, referring URL, pages visited, and the dates and times of your visits.</li>
                <li><strong>Cookies:</strong> We may use cookies to collect information about your browsing activity. You can control cookies through your browser settings.</li>
              </ul>

              <p className="mb-4"><strong>Information You Provide:</strong></p>
              <ul className="list-disc list-inside mb-4 ml-4">
                <li><strong>Contact Information:</strong> If you contact us via email, we will collect your email address and any information you provide in your message.</li>
                <li><strong>Discord Information:</strong> As a main component of our service, we may receive basic information about your Discord account (e.g., username, avatar) to assist with integrations or support requests, only if you explicitly authorize this.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-300">We use your information to:</p>
            <ul className="list-disc list-inside text-gray-300 ml-4">
              <li>Provide and improve the Site and our services.</li>
              <li>Respond to your inquiries.</li>
              <li>Analyze trends and usage patterns.</li>
              <li>Prevent fraud and abuse.</li>
              <li>Communicate with you about updates or changes to the Site (only if you opt-in to such communications).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Sharing Your Information</h2>
            <p className="text-gray-300">We may share your information with:</p>
            <ul className="list-disc list-inside text-gray-300 ml-4">
              <li><strong>Service Providers:</strong> We may share your information with third-party service providers who assist us with website hosting, data analytics, email marketing, and other services. These service providers are contractually obligated to protect your information.</li>
              <li><strong>Legal Compliance:</strong> We may disclose your information if required to do so by law or in response to a valid legal request.</li>
              <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred to the acquiring entity.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-gray-300">
              We take reasonable measures to protect your information from unauthorized access, use, or disclosure. However, no method of transmission over the Internet or method of electronic storage is 100% secure. Therefore, we cannot guarantee the absolute security of your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p className="text-gray-300">
              You may have certain rights regarding your personal information, including the right to access, correct, or delete your information. To exercise these rights, please contact us at support@ctrlaltstock.com.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Children's Privacy</h2>
            <p className="text-gray-300">
              The Site is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Changes to Privacy Policy</h2>
            <p className="text-gray-300">
              We reserve the right to modify this Privacy Policy at any time. We will post the updated Privacy Policy on the Site. Your continued use of the Site after any such changes constitutes your acceptance of the new Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Contact Information</h2>
            <p className="text-gray-300">
              If you have any questions about this Privacy Policy, please contact us at support@ctrlaltstock.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Privacy;