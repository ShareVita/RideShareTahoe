/**
 * Legal configuration for RideShareTahoe as a program of ShareVita
 * This file centralizes all legal disclosure text to ensure consistency
 * and easy updates when 501(c)(3) status changes.
 */

const LEGAL = {
  umbrellaName: 'ShareVita',
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
    'RideShareTahoe is a program of ShareVita, a California 501(c)(3) nonprofit organization.',

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
