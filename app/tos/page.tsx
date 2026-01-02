import Link from 'next/link';
import { getSEOTags } from '@/libs/seo';
import config from '@/config';
import LEGAL from '@/lib/legal';

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: '/tos',
});

const TOS = () => {
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
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">Terms and Conditions for {config.appName}</h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300 text-sm"
          style={{ fontFamily: 'sans-serif' }}
        >
          {`Last Updated: January 1, 2026

Welcome to RideShareTahoe!

These Terms of Service ("Terms") govern your use of the RideShareTahoe website at https://ridesharetahoe.com ("Website") and the services provided by RideShareTahoe. By using our Website and services, you agree to these Terms.

1. Definitions

${LEGAL.termsDefinitions}

2. Description of RideShareTahoe

RideShareTahoe is a community platform that connects drivers and passengers for rideshare trips between the Bay Area and Lake Tahoe. Our service facilitates cost-sharing and carpooling within the community.

3. User Responsibilities and Safety

3.1 Driver Responsibilities: Drivers are responsible for the safety and operation of their vehicles. All vehicles must be properly insured, registered, and maintained. Drivers must possess a valid driver's license.

3.2 Passenger Responsibilities: Passengers agree to be respectful of the driver's vehicle and rules. Passengers must contribute to shared costs as agreed upon.

3.3 Liability: RideShareTahoe is not responsible for any injuries, damages, or incidents that occur during trips arranged through our platform. We do not verify insurance or driver history.

4. User Conduct and Community Guidelines

4.1 Respectful Behavior: Users must treat all community members with respect and kindness. Harassment, discrimination, or inappropriate behavior will not be tolerated.

4.2 Accurate Information: Users must provide accurate information about themselves, their vehicles, and their trip details.

4.3 Non-Commercial Use: The platform is for cost-sharing carpools, not for commercial taxi or ride-hailing services (like Uber/Lyft). Drivers may not profit from rides, only share costs.

5. User Data and Privacy

We collect and store user data, including name, email, location, and trip information, as necessary to provide our services. For details on how we handle your data, please refer to our Privacy Policy at https://ridesharetahoe.com/privacy-policy.

6. Prohibited Activities

Users may not:
- Use the platform for any illegal activities
- Share inappropriate or offensive content
- Attempt to access other users' accounts
- Use automated systems to interact with the platform
- Violate any applicable laws or regulations

7. Account Termination

We reserve the right to suspend or terminate accounts that violate these Terms or engage in inappropriate behavior.

8. Governing Law

These Terms are governed by the laws of ${LEGAL.contact.jurisdiction}, without regard to conflict of law principles.

9. Informal Dispute Resolution

Before initiating any formal dispute resolution proceeding, you agree to first contact us and attempt to resolve any dispute informally. To initiate this process, you must send a written notice ("Dispute Notice") to ${LEGAL.contact.legal} that includes: (a) your name and contact information; (b) a description of the dispute; and (c) the specific relief you seek. We will attempt to resolve the dispute informally for at least sixty (60) days from the date we receive your Dispute Notice. If the dispute is not resolved within this period, either party may proceed with formal dispute resolution as set forth below. This informal dispute resolution process is a prerequisite to initiating any arbitration or court proceeding.

10. Binding Arbitration Agreement

PLEASE READ THIS SECTION CAREFULLY. IT AFFECTS YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT.

You and RideShareTahoe (operated by ShareVita) agree that any dispute, claim, or controversy arising out of or relating to these Terms, the Website, or our services (collectively, "Disputes") will be resolved exclusively through binding individual arbitration, rather than in court, except as provided in Section 12 below.

Arbitration will be administered by the American Arbitration Association ("AAA") under its Consumer Arbitration Rules then in effect, available at www.adr.org. The arbitration will be conducted by a single arbitrator in the English language. The arbitrator shall have exclusive authority to resolve any dispute relating to the interpretation, applicability, enforceability, or formation of this arbitration agreement, including any claim that all or any part of this agreement is void or voidable.

The arbitration shall take place in ${LEGAL.contact.jurisdiction}, or at another mutually agreed location, or via telephone or video conference if requested by either party. The arbitrator may award any relief that would be available in court, provided that the arbitrator's authority is limited to disputes between you and RideShareTahoe alone. Any judgment on the award rendered by the arbitrator may be entered in any court of competent jurisdiction.

11. Class Action and Jury Trial Waiver

YOU AND RIDESHARETAHOE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE ACTION. Unless both you and RideShareTahoe agree otherwise, the arbitrator may not consolidate more than one person's claims and may not preside over any form of representative, class, or collective proceeding.

TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, YOU AND RIDESHARETAHOE EACH WAIVE THE RIGHT TO A JURY TRIAL FOR ANY DISPUTES NOT SUBJECT TO ARBITRATION UNDER THESE TERMS.

12. Exceptions to Arbitration

Notwithstanding the foregoing, either party may: (a) bring an individual action in small claims court for disputes within that court's jurisdiction; (b) seek injunctive or other equitable relief in a court of competent jurisdiction to prevent the actual or threatened infringement, misappropriation, or violation of intellectual property rights; or (c) seek emergency injunctive relief pending arbitration to prevent irreparable harm.

13. 30-Day Opt-Out Right

You have the right to opt out of this arbitration agreement. To opt out, you must send written notice of your decision to opt out to ${LEGAL.contact.legal} within thirty (30) days of first accepting these Terms. Your notice must include: (a) your name; (b) your email address associated with your RideShareTahoe account; (c) your mailing address; and (d) a clear statement that you wish to opt out of the arbitration agreement. If you opt out, all other provisions of these Terms will continue to apply. Opting out of arbitration will not affect any other aspect of your relationship with RideShareTahoe.

14. Mass Arbitration Procedures

If twenty-five (25) or more similar arbitration demands are filed against RideShareTahoe within a 180-day period by the same law firm or coordinated group ("Mass Arbitration"), the following procedures shall apply:

14.1 Batching: Claims shall be grouped into batches of fifty (50) claims each, organized by the date of filing.

14.2 Bellwether Process: The first batch of ten (10) claims shall proceed as bellwether cases. These bellwether cases shall be individually arbitrated, and the outcomes shall inform potential resolution of the remaining claims. Following the conclusion of the bellwether cases, the parties shall engage in a single, global mediation of all remaining claims for a period of ninety (90) days.

14.3 Sequential Processing: Only one batch of claims may proceed to arbitration at a time. The next batch shall not commence until the prior batch has been resolved through arbitration, settlement, or withdrawal.

14.4 Tolling: All applicable statutes of limitations and filing deadlines shall be tolled during the pendency of the bellwether process and any required mediation period.

14.5 Counsel Coordination: If multiple claimants are represented by the same counsel or coordinated counsel, such counsel shall designate a lead or liaison counsel who shall coordinate all communications with RideShareTahoe regarding the Mass Arbitration.

15. Arbitration Fees

The payment of filing, administration, and arbitrator fees will be governed by the AAA's Consumer Arbitration Rules. To the extent that fees payable by you under those rules exceed the amount you would pay to file a complaint in court, RideShareTahoe will pay the difference. RideShareTahoe will not seek attorneys' fees or costs from you if you act in good faith, unless your claim is found to be frivolous.

16. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL RIDESHARETAHOE, SHAREVITA, OR THEIR OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE WEBSITE OR SERVICES.

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE TOTAL LIABILITY OF RIDESHARETAHOE AND ITS AFFILIATES FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE WEBSITE OR SERVICES SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID TO RIDESHARETAHOE IN THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY; OR (B) ONE HUNDRED DOLLARS ($100).

THESE LIMITATIONS DO NOT APPLY TO LIABILITY ARISING FROM: (A) RIDESHARETAHOE'S GROSS NEGLIGENCE OR WILLFUL MISCONDUCT; (B) DEATH OR PERSONAL INJURY CAUSED BY RIDESHARETAHOE'S NEGLIGENCE; OR (C) ANY OTHER LIABILITY THAT CANNOT BE EXCLUDED UNDER APPLICABLE LAW.

17. Indemnification

You agree to indemnify, defend, and hold harmless RideShareTahoe, ShareVita, and their officers, directors, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Website or services; (b) your violation of these Terms; (c) your violation of any rights of another party; (d) your conduct in connection with any rideshare trip arranged through the platform; or (e) any content you submit to the Website. RideShareTahoe reserves the right, at its own expense, to assume the exclusive defense and control of any matter otherwise subject to indemnification by you, and you agree to cooperate with our defense of any such claims.

18. Warranty Disclaimer

THE WEBSITE AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, RIDESHARETAHOE DISCLAIMS ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

RIDESHARETAHOE DOES NOT WARRANT THAT: (A) THE WEBSITE OR SERVICES WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE; (B) ANY DEFECTS WILL BE CORRECTED; (C) THE WEBSITE IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS; OR (D) THE RESULTS OF USING THE WEBSITE OR SERVICES WILL MEET YOUR REQUIREMENTS.

RIDESHARETAHOE DOES NOT VERIFY THE IDENTITY, BACKGROUND, DRIVING HISTORY, INSURANCE STATUS, OR TRUSTWORTHINESS OF ANY USER. YOU ARE SOLELY RESPONSIBLE FOR YOUR INTERACTIONS WITH OTHER USERS AND YOUR PARTICIPATION IN ANY RIDESHARE TRIPS.

19. Assumption of Risk and Release of Liability

BY USING RIDESHARETAHOE TO ARRANGE OR PARTICIPATE IN RIDESHARE TRIPS, YOU ACKNOWLEDGE AND AGREE THAT:

19.1 Inherent Risks: Ridesharing and carpooling involve inherent risks, including but not limited to: motor vehicle accidents; injuries from vehicle operation; exposure to other passengers or drivers; property damage or loss; delays; and other foreseeable and unforeseeable risks associated with traveling in a motor vehicle.

19.2 Voluntary Participation: Your participation in any rideshare trip arranged through the platform is entirely voluntary. You understand that you are not required to use the service or accept any ride.

19.3 Assumption of Risk: You voluntarily assume all risks, known and unknown, associated with using the platform and participating in rideshare trips, even if such risks arise from the negligence or fault of RideShareTahoe, ShareVita, or other users.

19.4 Release: To the fullest extent permitted by applicable law, you hereby release, waive, and forever discharge RideShareTahoe, ShareVita, and their officers, directors, employees, agents, and affiliates from any and all claims, demands, damages, losses, costs, and expenses (including attorneys' fees) arising out of or related to your use of the platform or participation in any rideshare trip, including claims for personal injury, death, property damage, or any other loss.

19.5 No Agency Relationship: RideShareTahoe is a platform that facilitates connections between users. We are not a transportation company, and drivers are not our employees or agents. We do not control or direct the actions of drivers or passengers.

20. Force Majeure

RideShareTahoe shall not be liable for any failure or delay in performing its obligations under these Terms if such failure or delay results from circumstances beyond our reasonable control, including but not limited to: acts of God; natural disasters; earthquakes; fires; floods; severe weather conditions; epidemics or pandemics; war, terrorism, or civil unrest; government actions, orders, or restrictions; labor disputes or strikes; power outages or telecommunications failures; cyberattacks or system failures; or any other event beyond our reasonable control ("Force Majeure Event"). During a Force Majeure Event, our obligations under these Terms shall be suspended, and we shall not be liable for any resulting delay or failure to perform. We will use reasonable efforts to notify you of any such event and to resume performance as soon as reasonably practicable.

21. User Content License

21.1 Your Content: You may submit content to RideShareTahoe, including but not limited to profile photos, profile information, ride descriptions, reviews, ratings, and communications with other users ("User Content").

21.2 License Grant: By submitting User Content to RideShareTahoe, you grant us a non-exclusive, worldwide, royalty-free, sublicensable, and transferable license to use, reproduce, modify, adapt, publish, translate, distribute, publicly display, and create derivative works from your User Content in connection with operating and promoting the RideShareTahoe platform. This license continues even if you stop using our services, but only for User Content that was shared with other users or incorporated into our platform prior to your account deletion.

21.3 Your Representations: You represent and warrant that: (a) you own or have the necessary rights to submit the User Content; (b) your User Content does not violate the privacy, publicity, intellectual property, or other rights of any third party; (c) your User Content does not contain false, misleading, defamatory, or unlawful material; and (d) your User Content complies with these Terms and all applicable laws.

21.4 No Obligation: We are under no obligation to use, display, or maintain your User Content. We reserve the right to remove or modify any User Content at our sole discretion, without notice, for any reason, including if we believe it violates these Terms or may expose us to liability.

21.5 Feedback: If you provide us with feedback, suggestions, or ideas about our services ("Feedback"), you grant us an unlimited, irrevocable, perpetual, royalty-free license to use such Feedback for any purpose without compensation or attribution to you.

22. Severability of Arbitration Provisions

If any portion of Section 10 (Binding Arbitration Agreement), Section 11 (Class Action and Jury Trial Waiver), or Section 14 (Mass Arbitration Procedures) is found to be unenforceable, the remaining portions shall remain in full force and effect. However, if the Class Action Waiver in Section 11 is found to be unenforceable as to a particular claim or request for relief, then the entire arbitration agreement shall be deemed void as to that claim or request for relief only, and such claim or request for relief shall be decided by a court of competent jurisdiction rather than by an arbitrator.

23. Updates to the Terms

We may update these Terms from time to time. Users will be notified of any changes via email. Your continued use of the Website or services after any such changes constitutes your acceptance of the new Terms.

24. Contact Information

For any questions or concerns regarding these Terms of Service, please contact us at:

Legal/Contact:
RideShareTahoe
Email: ${LEGAL.contact.legal}
Support: ${LEGAL.contact.support}
Jurisdiction: ${LEGAL.contact.jurisdiction}

Thank you for being part of the RideShareTahoe community!`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
