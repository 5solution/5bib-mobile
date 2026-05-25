/**
 * Babel config for 5BIB Mobile (Expo SDK 51 + Tamagui + Reanimated).
 *
 * Plugin order matters:
 *   1. babel-preset-expo — base
 *   2. @tamagui/babel-plugin — extracts Tamagui styles (BEFORE reanimated)
 *   3. react-native-reanimated/plugin — MUST be LAST (Reanimated requirement)
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './src/theme/tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
      // Reanimated MUST be the last plugin in the chain.
      'react-native-reanimated/plugin',
    ],
  };
};
