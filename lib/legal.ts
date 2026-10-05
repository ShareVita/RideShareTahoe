/**
 * Legal configuration for RideShareTahoe as a program of ShareVita
 * This file centralizes all legal disclosure text to ensure consistency
 * and easy updates when 501(c)(3) status changes.
 */

const LEGAL = {
  umbrellaName: 'ShareVita',
  umbrellaWebsite: 'https://sharevita.org',
  /** IRS Employer Identification Number for ShareVita. */
  ein: '39-4771264',
  founder: 'Kaia Colban',
  /** One-line mission shared by every ShareVita program. */
  umbrellaMission:
    'ShareVita builds free tools that help neighbors share what they already have, so communities get stronger and nobody has to go it alone.',
  /** One-line mission for the RideShareTahoe program. */
  programMission:
    'RideShareTahoe gets people to Lake Tahoe without a car of their own, cuts the traffic and emissions on I-80 and US-50, and connects skiers and riders who want a crew to share the drive with.',
  shortDisclosurePending:
    'RideShareTahoe is a community program of ShareVita, a California nonprofit public benefit corporation (501(c)(3) determination pending).',
  shortDisclosureGranted:
    'RideShareTahoe is a community program of ShareVita, a California 501(c)(3) nonprofit organization.',
  longDisclosure:
    'RideShareTahoe ("we", "our", "us") is a community program of ShareVita, a California 501(c)(3) nonprofit organization. RideShareTahoe remains the product/service brand; ShareVita is the legal entity responsible for governance and compliance.',
  status: 'granted' as 'pending' | 'granted',

  // Contact information
  contact: {
    legal: 'legal@sharevita.org', // Update when final
    support: 'support@ridesharetahoe.com',
    jurisdiction: 'California, USA',
  },

  // Data controller statement
  dataController: 'Data Controller: ShareVita (for the RideShareTahoe program).',

  // Donations/payments disclaimer
  donationsDisclaimer:
    'We do not process payments on this site. If donations become available, they will be receipted by ShareVita, a 501(c)(3) tax-exempt organization.',

  // Terms definitions
  termsDefinitions:
    '"RideShareTahoe", "we", "us", or "our" refers to the RideShareTahoe community program operated by ShareVita, a California nonprofit public benefit corporation. "ShareVita" refers to the legal entity responsible for governance and compliance of the RideShareTahoe program.',

  // FAQ disclosure
  faqDisclosure:
    'RideShareTahoe is a program of ShareVita, a California 501(c)(3) nonprofit (EIN 39-4771264) founded and run by Kaia Colban. It is 100% free and funded by ShareVita and donations.',

  // Get current disclosure based on status
  getCurrentDisclosure: () => {
    return LEGAL.status === 'granted' ? LEGAL.shortDisclosureGranted : LEGAL.shortDisclosurePending;
  },

  // Get current long disclosure
  getCurrentLongDisclosure: () => {
    return LEGAL.longDisclosure;
  },
};

export default LEGAL;
