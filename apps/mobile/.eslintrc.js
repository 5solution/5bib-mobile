/**
 * ESLint config — eslint-config-expo base (RN + Expo + react-hooks rules).
 *
 * NOTE: this file did not exist until 2026-06-11 even though `npm run lint`
 * was in package.json since day 1 — the script errored out unconfigured and
 * nobody noticed because lint was never run locally or in CI. The
 * react-hooks/rules-of-hooks rule below would have caught the
 * hook-after-early-return crash in events/[path].tsx at commit time.
 */
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'ios/', 'android/', '.expo/', 'dist/'],
  rules: {
    // The single most important rule for this codebase — promoted to error.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // eslint-config-expo v7 references this rule, but it was removed in
    // @typescript-eslint v8 (which we're on). Off until expo config catches up.
    '@typescript-eslint/ban-types': 'off',
  },
};
