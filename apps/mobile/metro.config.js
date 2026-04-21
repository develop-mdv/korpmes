const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const webrtcPackageDir = path.dirname(
  require.resolve('react-native-webrtc/package.json', { paths: [projectRoot] }),
);
const eventTargetShimEntry = require.resolve('event-target-shim', {
  paths: [webrtcPackageDir],
});

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

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
