/**
 * Configuração dinâmica sobre o `app.json`.
 *
 * O SDK da Meta precisa de um App ID e de um Client Token que nascem no painel
 * de desenvolvedor da Meta e não existem em tempo de código. Enquanto eles não
 * forem definidos, o plugin fica de fora do build: o app compila e roda igual,
 * só sem atribuição de instalação. O contrário — deixar um valor de exemplo
 * fixo na configuração — faria um build sair reportando instalação para outro
 * aplicativo, que é justamente o erro que existe hoje no script da Fase 2.
 */
const APP_ID = process.env.META_APP_ID;
const CLIENT_TOKEN = process.env.META_CLIENT_TOKEN;

module.exports = ({ config }) => {
  if (!APP_ID || !CLIENT_TOKEN) {
    // eslint-disable-next-line no-console -- em arquivo de configuração o console é o único canal de aviso
    console.warn('[flowly] META_APP_ID e/ou META_CLIENT_TOKEN ausentes: build sem o SDK da Meta, sem atribuição de instalação.');
    return config;
  }

  return {
    ...config,
    plugins: [
      ...config.plugins,
      [
        'react-native-fbsdk-next',
        {
          appID: APP_ID,
          clientToken: CLIENT_TOKEN,
          displayName: 'Flowly',
          scheme: `fb${APP_ID}`,
          // A coleta do identificador de anúncio fica ligada aqui, mas o SDK só
          // passa a usá-la depois do consentimento do ATT (ver lib/attribution).
          advertiserIDCollectionEnabled: true,
          autoLogAppEventsEnabled: true,
          isAutoInitEnabled: false,
        },
      ],
    ],
  };
};
