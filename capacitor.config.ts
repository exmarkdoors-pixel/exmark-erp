import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.exmark.erp',
  appName: 'EXMARK ERP',
  webDir: 'public',
  server: {
    url: 'https://exmark-erp-staging.onrender.com',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
