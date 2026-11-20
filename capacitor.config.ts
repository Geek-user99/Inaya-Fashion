// Capacitor Configuration for Inaya Fashion Admin Android APK
// Wraps your live deployed admin route (e.g., https://demosite.com/admin)
// with native Push/Local Notifications and Bluetooth LE Thermal Printing.

const adminUrl = process.env.CAPACITOR_ADMIN_URL || 'https://demosite.com/admin';

const config = {
  appId: 'com.inayafashion.admin',
  appName: 'Inaya Admin',
  webDir: 'dist',
  server: {
    url: adminUrl,
    cleartext: adminUrl.startsWith('http://'),
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_inaya',
      iconColor: '#9E7B42',
      sound: 'order_chime.wav',
    },
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#121110',
      showSpinner: false,
    },
  },
};

export default config;
