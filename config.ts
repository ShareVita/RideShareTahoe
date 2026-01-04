interface Config {
  appName: string;
  appDescription: string;
  domainName: string;
  resend: {
    fromNoReply: string;
    fromAdmin: string;
    supportEmail: string;
  };
  auth: {
    loginUrl: string;
    callbackUrl: string;
  };
  crisp?: {
    id: string;
    onlyShowOnRoutes: string[];
  };
  stripe?: {
    plans: string[];
  };
  aws?: {
    bucket: string;
    bucketUrl: string;
    cdn: string;
  };
}

const config: Config = {
  // REQUIRED
  appName: 'RideShareTahoe',
  // REQUIRED: a short description of your app for SEO tags (can be overwritten)
  appDescription:
    'RideShareTahoe - Connecting Bay Area drivers and passengers for community-based ridesharing to Lake Tahoe.',
  // REQUIRED (no https://, not trialing slash at the end, just the naked domain)
  domainName: 'ridesharetahoe.com',
  resend: {
    // REQUIRED — Email 'From' field to be used when sending magic login links (no replies expected)
    fromNoReply: `RideShareTahoe <noreply@ridesharetahoe.com>`,
    // REQUIRED — Email 'From' field for emails that might get replies (forwarded to Gmail)
    fromAdmin: `RideShareTahoe <admin@ridesharetahoe.com>`,
    // Email shown to customer if need support. Leave empty if not needed => if empty, set up Crisp above, otherwise you won't be able to offer customer support."
    supportEmail: 'support@ridesharetahoe.com',
  },
  auth: {
    // REQUIRED — the path to log in users. It's use to protect private routes (like /dashboard). It's used in apiClient (/libs/api.js) upon 401 errors from our API
    loginUrl: '/login',
    // REQUIRED — the path you want to redirect users after successfull login (i.e. /dashboard, /private). This is normally a private page for users to manage their accounts. It's used in apiClient (/libs/api.js) upon 401 errors from our API & in Buttonlogin.js
    callbackUrl: '/community',
  },
};

export default config;
