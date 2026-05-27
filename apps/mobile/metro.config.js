/**
 * Metro config — workspace-aware resolution for `@5bib/sdk`.
 *
 * The mobile app lives at `apps/mobile/`. The SDK package lives at `packages/sdk/`
 * (or wherever pnpm workspace places it). Metro by default only watches
 * `apps/mobile/node_modules`, so we add the workspace root to `watchFolders`
 * and let Metro climb up `nodeModulesPaths` for hoisted deps.
 */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
// apps/mobile → ../../ = workspace root
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so changes in packages/sdk hot-reload here.
config.watchFolders = [workspaceRoot];

// Let Metro find hoisted modules at the workspace root in addition to local.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Avoid duplicate React copies which would break hooks / context.
config.resolver.disableHierarchicalLookup = true;

// Workaround: source-map/lib/url.js imports Node 'url' module which doesn't exist
// in React Native. Some transitive deps (Sentry, debug tools) pull source-map at
// runtime. Stub `url` module to an empty object — RN doesn't need source-map for
// production code.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  url: require.resolve('react-native-url-polyfill/auto'),
};

module.exports = config;
