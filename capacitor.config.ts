import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.exmark.erp',
  appName: 'EXMARK Staff',
  webDir: 'public',
  server: {
    url: 'http://192.168.1.10:4000/mobile',
    cleartext: true,
    errorPath: 'index.html',
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    preferredContentMode: 'mobile',
  },
};

export default config;
