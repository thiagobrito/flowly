/**
 * Config plugin: workarounds para builds iOS no Xcode 26+.
 *
 * - Força toolchain padrão do Xcode (evita conflito Metal/SwiftUICore)
 * - Patch do fmt quando RN compila from source (consteval + Apple Clang 21)
 *
 * Requer `ios.buildReactNativeFromSource: true` em expo-build-properties para
 * corrigir símbolos ausentes do expo-dev-launcher com React-Core-prebuilt.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TOOLCHAIN_LINE = 'export TOOLCHAINS=com.apple.dt.toolchain.XcodeDefault';
const XCODE_ENV_MARKER = '# Xcode 26+: evita conflito com Metal toolchain';
const PODFILE_SNIPPET = `
    # Xcode 26+: evita link error com SwiftUICore (Metal toolchain)
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['TOOLCHAINS'] = 'com.apple.dt.toolchain.XcodeDefault'
    end
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['TOOLCHAINS'] = 'com.apple.dt.toolchain.XcodeDefault'
      end
    end
    installer.aggregate_targets.each do |aggregate_target|
      aggregate_target.user_project.native_targets.each do |target|
        target.build_configurations.each do |config|
          config.build_settings['TOOLCHAINS'] = 'com.apple.dt.toolchain.XcodeDefault'
        end
      end
      aggregate_target.user_project.save
    end

    # Xcode 26: fmt 11.0.2 falha com consteval strictness do Apple Clang 21 (RN from source)
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('Xcode 26 workaround')
        patched = content.gsub(/#\\s*define FMT_USE_CONSTEVAL 1/, '#define FMT_USE_CONSTEVAL 0 // Xcode 26 workaround')
        if patched != content
          File.chmod(0o644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end`;

function ensureXcodeEnvToolchain(platformRoot) {
  const xcodeEnvPath = path.join(platformRoot, '.xcode.env');
  if (!fs.existsSync(xcodeEnvPath)) return;

  const contents = fs.readFileSync(xcodeEnvPath, 'utf8');
  if (contents.includes('TOOLCHAINS=')) return;

  fs.writeFileSync(xcodeEnvPath, `${contents.trimEnd()}\n\n${XCODE_ENV_MARKER}\n${TOOLCHAIN_LINE}\n`);
}

function ensurePodfileWorkarounds(platformRoot) {
  const podfilePath = path.join(platformRoot, 'Podfile');
  if (!fs.existsSync(podfilePath)) return;

  const contents = fs.readFileSync(podfilePath, 'utf8');
  if (contents.includes('Xcode 26 workaround')) return;

  const marker = 'react_native_post_install(';
  const index = contents.indexOf(marker);
  if (index === -1) return;

  const closeIndex = contents.indexOf(')', index);
  if (closeIndex === -1) return;

  const updated = `${contents.slice(0, closeIndex + 1)}${PODFILE_SNIPPET}${contents.slice(closeIndex + 1)}`;
  fs.writeFileSync(podfilePath, updated);
}

function withXcodeDefaultToolchain(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const { platformProjectRoot } = cfg.modRequest;
      ensureXcodeEnvToolchain(platformProjectRoot);
      ensurePodfileWorkarounds(platformProjectRoot);
      return cfg;
    },
  ]);
}

module.exports = withXcodeDefaultToolchain;
