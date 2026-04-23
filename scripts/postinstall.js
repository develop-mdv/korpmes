const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const packagesToBuild = [
  '@corp/shared-types',
  '@corp/shared-validation',
];

function canResolveDependency(pkgDir, dependencyName) {
  try {
    require.resolve(dependencyName, { paths: [pkgDir] });
    return true;
  } catch {
    return false;
  }
}

function getBuildablePackages() {
  return packagesToBuild.filter((packageName) => {
    const packageDir = path.join(rootDir, 'packages', packageName.replace('@corp/', ''));
    const packageJsonPath = path.join(packageDir, 'package.json');
    const srcDir = path.join(packageDir, 'src');

    if (!fs.existsSync(packageJsonPath) || !fs.existsSync(srcDir)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const runtimeDependencies = Object.keys(packageJson.dependencies || {});
    const missingDependency = runtimeDependencies.find(
      (dependencyName) => !canResolveDependency(packageDir, dependencyName),
    );

    if (missingDependency) {
      console.log(
        `[postinstall] Skipping ${packageName}: dependency "${missingDependency}" is not installed in this package-manager context.`,
      );
      return false;
    }

    return true;
  });
}

function getPnpmCommand() {
  const pnpmCheck = spawnSync('pnpm', ['--version'], {
    cwd: rootDir,
    stdio: 'ignore',
    shell: true,
  });
  if (pnpmCheck.status === 0) {
    return { command: 'pnpm', args: [] };
  }

  const corepackCheck = spawnSync('corepack', ['--version'], {
    cwd: rootDir,
    stdio: 'ignore',
    shell: true,
  });
  if (corepackCheck.status === 0) {
    return { command: 'corepack', args: ['pnpm'] };
  }

  return null;
}

function main() {
  const buildablePackages = getBuildablePackages();
  if (buildablePackages.length === 0) {
    console.log('[postinstall] No shared packages need a postinstall build.');
    return;
  }

  const pnpmCommand = getPnpmCommand();
  if (!pnpmCommand) {
    console.log('[postinstall] Skipping shared package builds: pnpm/corepack is unavailable.');
    return;
  }

  for (const packageName of buildablePackages) {
    const result = spawnSync(
      pnpmCommand.command,
      [...pnpmCommand.args, '--filter', packageName, 'build'],
      {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true,
      },
    );

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}

main();
