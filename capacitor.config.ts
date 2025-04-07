
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8dd0c96b428846989402f030407c6338',
  appName: 'FlitX',
  webDir: 'dist',
  server: {
    url: 'https://8dd0c96b-4288-4698-9402-f030407c6338.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0F56B3",
      showSpinner: true,
      spinnerColor: "#ffffff",
    },
  },
};

export default config;
