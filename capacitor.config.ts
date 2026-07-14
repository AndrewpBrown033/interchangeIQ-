import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.interchangeiq.app',
  appName: 'InterchangeIQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
