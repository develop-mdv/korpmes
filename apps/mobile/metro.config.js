const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
// pnpm places its virtual store at D:/.pnpm-vs (see repo-root .npmrc,
// `virtual-store-dir=D:/.pnpm-vs`) — short path to dodge Windows MAX_PATH
// during the native Android build. But that puts every real package file
// OUTSIDE the monorepo, so Metro won't see them unless we watch that dir too.
const pnpmVirtualStoreRoot = 'D:/.pnpm-vs';
const webrtcPackageDir = path.dirname(
  require.resolve('react-native-webrtc/package.json', { paths: [projectRoot] }),
);
const eventTargetShimEntry = require.resolve('event-target-shim', {
  paths: [webrtcPackageDir],
});

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot, pnpmVirtualStoreRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// Keep hierarchical lookup enabled so that packages installed in pnpm's
// isolated virtual store (`node_modules/.pnpm/<pkg>/node_modules/<dep>`)
// can be resolved relative to the importing file. Disabling it made
// react-native's WebSocket pick up event-target-shim@6 (native class)
// instead of the nested v5 (function-based) and crash on startup with
// "Cannot call a class as a function".

// Resolve @corp/* packages from TypeScript source so that dist/ is not required.
// EAS Build servers get a fresh clone without dist/ (it's in .gitignore), so
// without this the app crashes immediately on startup.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // react-native-webrtc imports an unsupported subpath that Metro can't resolve
  // through pnpm/package exports, so we pin it to the actual package entry.
  if (moduleName === 'event-target-shim/index') {
    return { filePath: eventTargetShimEntry, type: 'sourceFile' };
  }

  if (moduleName.startsWith('@corp/')) {
    const packageName = moduleName.replace('@corp/', '');
    const srcIndex = path.resolve(monorepoRoot, 'packages', packageName, 'src', 'index.ts');
    if (fs.existsSync(srcIndex)) {
      return { filePath: srcIndex, type: 'sourceFile' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
