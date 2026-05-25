/**
 * apps/mobile/app.config.js
 *
 * Dynamic Expo config — switches between dev/prod Firebase configs + bundle IDs.
 *
 * Picks env from process.env.APP_ENV (set via EAS build profile):
 *   - APP_ENV=development  → bundle .dev + firebase-configs/*.dev.*
 *   - APP_ENV=production   → bundle prod + firebase-configs/*.prod.*
 *   - default              → production
 *
 * EAS profiles in eas.json should set APP_ENV per channel.
 */

const APP_ENV = process.env.APP_ENV ?? 'production';
const IS_DEV = APP_ENV === 'development';

// TODO(Danny): replace with REAL bundle IDs từ Firebase Console (Step 1 của guide)
const PROD_BUNDLE_ID = 'com.fivebib.mobile';   // ← thay bằng bundle ID app cũ thật
const DEV_BUNDLE_ID = `${PROD_BUNDLE_ID}.dev`; // suffix .dev cho app dev

const bundleId = IS_DEV ? DEV_BUNDLE_ID : PROD_BUNDLE_ID;
const appName = IS_DEV ? '5BIB Dev' : '5BIB';

const googleServiceIos = IS_DEV
  ? './firebase-configs/GoogleService-Info.dev.plist'
  : './firebase-configs/GoogleService-Info.prod.plist';

const googleServiceAndroid = IS_DEV
  ? './firebase-configs/google-services.dev.json'
  : './firebase-configs/google-services.prod.json';

module.exports = {
  expo: {
    name: appName,
    slug: '5bib-mobile',
    scheme: 'bib5',
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      bundleIdentifier: bundleId,
      supportsTablet: false,
      associatedDomains: ['applinks:5bib.com', 'applinks:www.5bib.com'],
      googleServicesFile: googleServiceIos, // ← Firebase iOS config
      infoPlist: {
        NSCameraUsageDescription:
          '5BIB cần truy cập camera để quét QR check-in BIB và chụp ảnh hồ sơ.',
        NSPhotoLibraryUsageDescription:
          '5BIB cần truy cập thư viện ảnh để bạn chọn ảnh đại diện.',
        NSPhotoLibraryAddUsageDescription:
          '5BIB cần quyền lưu QR / ảnh kết quả vào thư viện của bạn.',
        NSMicrophoneUsageDescription:
          '5BIB không sử dụng micro trực tiếp — quyền này yêu cầu bởi expo-camera.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: bundleId,
      googleServicesFile: googleServiceAndroid, // ← Firebase Android config
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'POST_NOTIFICATIONS',
        'VIBRATE',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            { scheme: 'https', host: '5bib.com' },
            { scheme: 'https', host: 'www.5bib.com' },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      // Firebase native modules (added 2026-05-25 — reuse project 5BIB hiện tại)
      '@react-native-firebase/app',
      '@react-native-firebase/crashlytics',
      '@react-native-firebase/messaging',
      [
        'expo-build-properties',
        {
          ios: { useFrameworks: 'static' }, // required for @react-native-firebase
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: '5BIB cần camera để quét QR và chụp ảnh hồ sơ.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#000000',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: '5BIB cần quyền truy cập ảnh để bạn chọn avatar.',
        },
      ],
      'sentry-expo',
    ],
    extra: {
      // EAS project linkage — TODO(Danny): paste real projectId after `eas init`
      eas: {
        projectId: 'TODO_EAS_PROJECT_ID',
      },
      // Runtime env exposed via Constants.expoConfig.extra
      APP_ENV,
      firebaseProjectId: '5bib', // ← Firebase Project ID hiện tại (verify lại trong Console)
    },
    updates: {
      url: 'https://u.expo.dev/TODO_EAS_PROJECT_ID',
      fallbackToCacheTimeout: 30000,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    hooks: {
      postPublish: [
        {
          file: 'sentry-expo/upload-sourcemaps',
          config: {
            organization: 'TODO_SENTRY_ORG',
            project: '5bib-mobile',
          },
        },
      ],
    },
  },
};
