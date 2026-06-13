/**
 * apps/mobile/app.config.js
 *
 * Dynamic Expo config — switches Firebase project between dev/prod.
 *
 * Strategy (Danny 2026-05-25): kế thừa setup team cũ
 *   - 2 Firebase projects RIÊNG: `5bib` (prod) + `5bib-dev` (dev)
 *   - CÙNG bundle ID iOS + package Android cho cả 2 env (user uninstall+reinstall khi switch env)
 *
 * Picks env from process.env.APP_ENV (set via EAS build profile in eas.json):
 *   - APP_ENV=development  → firebase-configs/*.dev.*  + Firebase project `5bib-dev`
 *   - APP_ENV=production   → firebase-configs/*.prod.* + Firebase project `5bib`
 *   - default              → production (safe fallback)
 *
 * Build flow:
 *   eas build --profile development → APP_ENV=development → dev Firebase project
 *   eas build --profile production  → APP_ENV=production  → prod Firebase project
 */

const APP_ENV = process.env.APP_ENV ?? 'production';
const IS_DEV = APP_ENV === 'development';

// REAL bundle ID / package từ Firebase configs team cũ (confirmed Danny 2026-05-26)
// ⚠️ iOS và Android KHÁC nhau — KHÔNG share string vì legacy app convention
const IOS_BUNDLE_ID = 'vn.5bib.app';
const ANDROID_PACKAGE = 'com.mobile_5bib';

// App Store ID (lấy từ google-services.prod.json) — cho EAS submit + universal link
const APPLE_APP_STORE_ID = '6447956538';

// App display name — distinguishable trên device để dev team biết đang test env nào
const appName = IS_DEV ? '5BIB Dev' : '5BIB';

// Firebase config files — different project per env
// Prod: project `bib-60bff` (đang chạy live, 69 DAU)
// Dev:  project `bib-dev-b4d19`
const googleServiceIos = IS_DEV
  ? './firebase-configs/GoogleService-Info.dev.plist'   // → Firebase project `bib-dev-b4d19`
  : './firebase-configs/GoogleService-Info.prod.plist'; // → Firebase project `bib-60bff`

const googleServiceAndroid = IS_DEV
  ? './firebase-configs/google-services.dev.json'   // → Firebase project `bib-dev-b4d19`
  : './firebase-configs/google-services.prod.json'; // → Firebase project `bib-60bff`

const firebaseProjectId = IS_DEV ? 'bib-dev-b4d19' : 'bib-60bff';

// Google Sign-In needs the iOS OAuth client's REVERSED_CLIENT_ID registered
// as a URL scheme (the OAuth callback target) — otherwise the native sign-in
// dialog opens but never returns. This is the REVERSED_CLIENT_ID from the
// env's GoogleService-Info.plist.
//   PROD `bib-60bff`: present (Google provider enabled for iOS app).
//   DEV  `bib-dev-b4d19`: ⚠️ no iOS OAuth client yet — Google provider not
//     enabled for the iOS app, so the plist has no CLIENT_ID. Once Danny
//     enables it + re-downloads GoogleService-Info.dev.plist, paste the
//     reversed id here and the plugin auto-registers it.
const GOOGLE_IOS_URL_SCHEME = IS_DEV
  ? undefined
  : 'com.googleusercontent.apps.47150553581-gvff8not3telqajbs0ta533qkmsfmqrg';

// Sentry — 2 projects (created Danny 2026-05-26)
// Org slug: 5bib | Org ID: o4511451510079488
//   - prod project ID: 4511454305714176
//   - dev  project ID: 4511454317051904
const sentryDsn = IS_DEV
  ? 'https://31e0233dd1879a493f47e4d1f5f89f45@o4511451510079488.ingest.us.sentry.io/4511454317051904'
  : 'https://dd6dce4439bb5f324faccbb2b2e450f4@o4511451510079488.ingest.us.sentry.io/4511454305714176';

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
      bundleIdentifier: IOS_BUNDLE_ID,
      appStoreUrl: `https://apps.apple.com/app/id${APPLE_APP_STORE_ID}`,
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
      package: ANDROID_PACKAGE,
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
      // Google Sign-In — registers the iOS OAuth callback URL scheme. Only
      // added when a reversed client id exists for this env (prod has it; dev
      // is pending the Firebase iOS Google provider — see GOOGLE_IOS_URL_SCHEME).
      ...(GOOGLE_IOS_URL_SCHEME
        ? [
            [
              '@react-native-google-signin/google-signin',
              { iosUrlScheme: GOOGLE_IOS_URL_SCHEME },
            ],
          ]
        : []),
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
      [
        '@sentry/react-native/expo',
        {
          organization: '5bib',
          project: IS_DEV ? '5bib-mobile-dev' : '5bib-mobile-prod',
          // SENTRY_AUTH_TOKEN via EAS Secret or env var
          url: 'https://sentry.io/',
        },
      ],
    ],
    extra: {
      // EAS project linkage — TODO(Danny): paste real projectId after `eas init`
      eas: {
        projectId: 'TODO_EAS_PROJECT_ID',
      },
      // Runtime env exposed via Constants.expoConfig.extra
      APP_ENV,
      firebaseProjectId, // dynamic: 'bib-60bff' (prod) | 'bib-dev-b4d19' (dev)
      sentryDsn,         // dynamic per env
    },
    updates: {
      url: 'https://u.expo.dev/TODO_EAS_PROJECT_ID',
      fallbackToCacheTimeout: 30000,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    // Sentry sourcemap upload handled by @sentry/react-native/expo plugin (above)
    // sentry-expo postPublish hook deprecated in Expo SDK 50+
  },
};
