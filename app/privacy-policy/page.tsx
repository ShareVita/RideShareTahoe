import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import config from '@/config';
import LEGAL from '@/lib/legal';

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: '/privacy-policy',
});

const PrivacyPolicy = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>{' '}
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">Privacy Policy for {config.appName}</h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 text-sm"
          style={{ fontFamily: 'sans-serif' }}
        >
          {`Last Updated: January 1, 2026

Thank you for visiting RideShareTahoe ("we," "us," or "our"). This Privacy Policy outlines how we collect, use, and protect your personal and non-personal information when you use our website located at https://ridesharetahoe.com (the "Website").

${LEGAL.getCurrentLongDisclosure()}

By accessing or using the Website, you agree to the terms of this Privacy Policy. If you do not agree with the practices described in this policy, please do not use the Website.

1. Information We Collect

1.1 Personal Data

We collect the following personal information from you:

Name: We collect your name to personalize your experience and facilitate community connections.
Email: We collect your email address to send you important updates, notifications about rides, and community communications.
Location: We collect your general location to help you connect with nearby drivers/passengers.
Phone Number: We may collect your phone number for verification and coordination purposes.
Profile Photos: We collect photos of you to help community members recognize each other and build trust.

1.2 Trip Information

We collect information about your trips including:
- Origin and destination
- Date and time of travel
- Vehicle details (for drivers)
- Luggage/gear requirements

1.3 Non-Personal Data

We may use web cookies, analytics, and similar technologies to collect non-personal information such as your IP address, browser type, device information, browsing patterns, and app usage statistics. This information helps us to enhance your experience, analyze trends, and improve our services.

2. Purpose of Data Collection

We collect and use your personal data for the following purposes:
- Facilitating connections between drivers and passengers
- Organizing and managing rideshare trips
- Providing a safe and trusted community platform
- Sending important updates and notifications
- Improving our services and user experience
- Ensuring community safety and compliance with our terms

3. Data Sharing

3.1 Community Sharing: Your profile information (name, photo, general location) is shared with other community members to facilitate connections.

3.2 Limited Third-Party Sharing: We do not sell, trade, or rent your personal information to third parties. We may share information only as required for:
- Legal compliance and law enforcement
- Service providers who assist in operating our platform (with strict confidentiality agreements)
- Emergency situations where safety is at risk

4. Data Security

We implement appropriate security measures to protect your personal information, including:
- Encryption of sensitive data
- Secure authentication systems
- Regular security audits and updates
- Limited access to personal information by our team

5. Children's Privacy

RideShareTahoe is not intended for children under the age of 18. We do not knowingly collect personal information from children. If you are a parent or guardian and believe that your child has provided us with personal information, please contact us immediately.

6. Data Retention

We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.

7. Your Rights

You have the right to:
- Access and review your personal information
- Update or correct your information
- Request deletion of your account and data
- Opt out of certain communications
- Export your data

8. California Consumer Privacy Act (CCPA) Disclosures

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):

8.1 Categories of Personal Information Collected: In the preceding 12 months, we have collected the following categories of personal information: (a) Identifiers (name, email, phone number, IP address); (b) Personal information under California Civil Code Section 1798.80 (name, address, phone number); (c) Geolocation data (general location for matching purposes); (d) Internet or network activity (browsing history, interactions with our Website); (e) Professional or employment-related information (if voluntarily provided); (f) Inferences drawn from the above to create a profile.

8.2 Categories of Sources: We collect personal information from: (a) you directly when you register or use our services; (b) automatically through cookies and similar technologies; (c) third-party authentication providers (e.g., Google Sign-In).

8.3 Business Purpose for Collection: We collect personal information for the purposes described in Section 2 of this Privacy Policy, including facilitating rideshare connections, improving our services, and ensuring community safety.

8.4 Sale of Personal Information: WE DO NOT SELL YOUR PERSONAL INFORMATION. We have not sold personal information in the preceding 12 months and do not intend to sell personal information in the future.

8.5 Your CCPA Rights: As a California resident, you have the right to: (a) know what personal information we collect, use, disclose, and sell; (b) request deletion of your personal information; (c) opt-out of the sale of your personal information (though we do not sell your data); (d) non-discrimination for exercising your CCPA rights.

8.6 Exercising Your Rights: To exercise your CCPA rights, contact us at ${LEGAL.contact.legal}. We will verify your identity before processing your request. You may designate an authorized agent to make a request on your behalf.

8.7 Financial Incentives: We do not offer financial incentives for the collection or sale of personal information.

9. Marketing Communications

9.1 Types of Communications: We may send you: (a) transactional emails related to your account and trips; (b) marketing emails about community updates, features, and promotions; (c) SMS messages for trip notifications and, if you opt in, marketing messages.

9.2 Your Choices: You may opt out of marketing communications at any time by: (a) clicking the "unsubscribe" link in any marketing email; (b) replying "STOP" to any marketing SMS; (c) updating your communication preferences in your account settings; (d) contacting us at ${LEGAL.contact.support}.

9.3 Transactional Communications: Even if you opt out of marketing communications, we may still send you transactional messages related to your account, trips, and important service updates.

9.4 SMS Consent: By providing your phone number and opting in to SMS notifications, you consent to receive text messages from RideShareTahoe. Message and data rates may apply. Message frequency varies. Text HELP for help or STOP to cancel.

10. Updates to the Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any updates will be posted on this page, and we may notify you via email about significant changes.

11. Data Controller

${LEGAL.dataController}
Contact: ${LEGAL.contact.legal}

12. Dispute Resolution

Any disputes arising out of or relating to this Privacy Policy or the collection, use, or handling of your personal information shall be resolved in accordance with the dispute resolution provisions set forth in our Terms of Service at https://ridesharetahoe.com/tos, including the binding arbitration agreement and class action waiver contained therein.

13. Contact Information

If you have any questions, concerns, or requests related to this Privacy Policy, you can contact us at:

Legal: ${LEGAL.contact.legal}
Support: ${LEGAL.contact.support}

For all other inquiries, please visit our Contact Us page on the Website.

By using RideShareTahoe, you consent to the terms of this Privacy Policy.`}
        </pre>
      </div>
    </main>
  );
};

export default PrivacyPolicy;
