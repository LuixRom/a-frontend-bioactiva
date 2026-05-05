import { Configuration, PublicClientApplication } from '@azure/msal-browser';

export const msalConfig: Configuration = {
  auth: {
    clientId: '0528c66c-3449-403a-b2e2-950fe1e9cae4',
    authority: 'https://login.microsoftonline.com/321e311e-66a6-43e3-8aa2-360be70945cd',
    redirectUri: 'http://localhost:3000',
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage to share sessions across tabs
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Calendars.ReadWrite', 'OnlineMeetings.ReadWrite'],
  prompt: 'select_account'
};

export const msalInstance = new PublicClientApplication(msalConfig);

// Wrapper to ensure initialization
let isInitialized = false;

export const getMsalInstance = async () => {
  if (!isInitialized) {
    await msalInstance.initialize();
    isInitialized = true;
    try {
      await msalInstance.handleRedirectPromise();
    } catch (e) {
      console.warn('MSAL initialization handleRedirectPromise failed:', e);
    }
  }
  return msalInstance;
};
