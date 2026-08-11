const { withNativeWind } = require('nativewind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

config.resolver.sourceExts.push('mjs');

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

// Bundle de E2E (`npm run e2e:bundle`): o `Alert` do react-native-web é um no-op,
// então todo fluxo de confirmação (deletar tarefa, excluir meta, sair) morreria
// no diálogo. O shim renderiza o mesmo diálogo no DOM, com os botões que o app
// pediu. Vale só para o bundle de teste — nunca entra em build de publicação.
if (process.env.E2E_ALERT_SHIM === '1') {
  const path = require('node:path');
  const shimPath = path.resolve(__dirname, 'e2e/support/alertShim.js');
  const alertModule = path.join('react-native-web', 'dist', 'exports', 'Alert');

  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const resolved = context.resolveRequest(context, moduleName, platform);
    if (platform === 'web' && typeof resolved?.filePath === 'string' && resolved.filePath.includes(alertModule)) {
      return { type: 'sourceFile', filePath: shimPath };
    }
    return resolved;
  };
}

module.exports = withNativeWind(config, { input: './global.css' });
