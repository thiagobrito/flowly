// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// lucide-react-native@1.x expõe o entry "react-native" como .mjs;
// Metro (Expo SDK 49) não resolve .mjs sem isso.
config.resolver.sourceExts.push('mjs');

// Permite importar arquivos .svg como componentes React.
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts.push('svg');

module.exports = config;
