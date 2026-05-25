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

module.exports = config;
