### Getting started

You can run locally in development mode with live reload:

```shell
npm run dev:ios
# Or
npm run dev:android
```

This will open the app in the iOS simulator or Android emulator.

### Testing

Testing is an important part of the development process and often the neglected one. This starter code comes up with Jest and React Testing Library for unit testing and Detox for E2E testing.

#### Unit Testing

To run the unit tests, run the following command (for example, in [Warp](https://go.warp.dev/nextjs-bp)):

```shell
npm run test
```

#### E2E Testing

To run the E2E tests, you first need to run the following command:

```shell
npm run e2e:prepare # Only need to run once
```

Then, you can run the following command to run the E2E tests:

```shell
npm run e2e:ios
# Or
npm run e2e:android
```

### VSCode information (optional)

If you are VSCode users, you can have a better integration with VSCode by installing the suggested extension in `.vscode/extension.json`. The starter code comes up with Settings for a seamless integration with VSCode. The Debug configuration is also provided for frontend and backend debugging experience.

With the plugins installed on your VSCode, ESLint and Prettier can automatically fix the code and show you the errors. Same goes for testing, you can install VSCode Jest extension to automatically run your tests and it also show the code coverage in context.

Pro tips: if you need a project wide type checking with TypeScript, you can run a build with <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> on Mac.

### Integração com Google Calendar

O app importa eventos do Google Calendar como tarefas do Flowly (pull). A
autenticação é feita no dispositivo via OAuth (`expo-auth-session`) e a leitura
usa a Google Calendar API (escopo somente leitura). A infraestrutura fica em
`src/lib/googleCalendar` (veja o README da lib) e a ativação acontece em
Configurações → Integrações.

> A sincronização requer um dev/standalone build (não funciona no Expo Go, pois
> depende do redirect nativo de OAuth).

#### 1. Criar as credenciais no Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e crie (ou
   selecione) um projeto.
2. Em **APIs & Services → Library**, habilite a **Google Calendar API**.
3. Em **APIs & Services → OAuth consent screen**, configure a tela de consentimento
   (tipo "External"), adicione o escopo
   `https://www.googleapis.com/auth/calendar.readonly` e cadastre seu e-mail como
   usuário de teste enquanto o app estiver em modo de teste.
4. Em **APIs & Services → Credentials → Create Credentials → OAuth client ID**,
   crie um client para cada plataforma usada:
   - **iOS** — Bundle ID: `com.flowly-v2.app`
   - **Android** — Package name: `com.flowly-v2.app` + a SHA-1 da sua keystore
     (debug e/ou release)
   - **Web** — usado no Expo (Expo Go/proxy e web)

#### 2. Preencher o `.env`

Copie os Client IDs gerados para o `.env` na raiz do projeto:

```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
```

Variáveis com prefixo `EXPO_PUBLIC_` são embutidas no bundle pelo Expo. Após
alterá-las, reinicie o bundler (`npm start`). O scheme de redirect (`myapp`) já
está definido em `app.json`.

#### 3. Usar

Abra **Configurações → Integrações**, ative "Sincronizar com Google Calendar" e
conclua o login do Google. Os eventos da janela atual (próximos 30 dias) viram
tarefas; use "Sincronizar agora" para reimportar novos eventos.

### Contributions

Everyone is welcome to contribute to this project. Feel free to open an issue if you have question or found a bug. Totally open to any suggestions and improvements.

### License

Licensed under the MIT License, Copyright © 2023

See [LICENSE](LICENSE) for more information.

## Sponsors

<table width="100%">
  <tr height="187px">
    <td align="center" width="33%">
      <a href="https://go.clerk.com/zGlzydF">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/SaaS-Boilerplate/assets/1328388/6fb61971-3bf1-4580-98a0-10bd3f1040a2">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/SaaS-Boilerplate/assets/1328388/f80a8bb5-66da-4772-ad36-5fabc5b02c60">
          <img alt="Clerk – Authentication & User Management for Next.js" src="https://github.com/ixartz/SaaS-Boilerplate/assets/1328388/f80a8bb5-66da-4772-ad36-5fabc5b02c60">
        </picture>
      </a>
    </td>
    <td align="center" width="33%">
      <a href="https://www.coderabbit.ai?utm_source=next_js_starter&utm_medium=github&utm_campaign=next_js_starter_oss_2025">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/coderabbit-logo-dark.svg?raw=true">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/coderabbit-logo-light.svg?raw=true">
          <img alt="CodeRabbit" src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/coderabbit-logo-light.svg?raw=true">
        </picture>
      </a>
    </td>
    <td align="center" width="33%">
      <a href="https://sentry.io/for/nextjs/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/sentry-white.png?raw=true">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/sentry-dark.png?raw=true">
          <img alt="Sentry" src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/sentry-dark.png?raw=true">
        </picture>
      </a>
      <a href="https://about.codecov.io/codecov-free-trial/?utm_source=github&utm_medium=paid-community&utm_campaign=general-fy25q1-nextjs&utm_content=github-banner-nextjsboilerplate-logo">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/codecov-white.svg?raw=true">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/codecov-dark.svg?raw=true">
          <img alt="Codecov" src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/codecov-dark.svg?raw=true">
        </picture>
      </a>
    </td>
  </tr>
  <tr height="187px">
    <td align="center" width="33%">
      <a href="https://launch.arcjet.com/Q6eLbRE">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/arcjet-dark.svg?raw=true">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/arcjet-light.svg?raw=true">
          <img alt="Arcjet" src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/arcjet-light.svg?raw=true">
        </picture>
      </a>
    </td>
    <td align="center" width="33%">
      <a href="https://l.crowdin.com/next-js">
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/crowdin-white.png?raw=true">
          <source media="(prefers-color-scheme: light)" srcset="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/crowdin-dark.png?raw=true">
          <img alt="Crowdin" src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/crowdin-dark.png?raw=true">
        </picture>
      </a>
    </td>
    <td align="center" style=width="33%">
      <a href="https://nextjs-boilerplate.com/pro-saas-starter-kit">
        <img src="https://github.com/ixartz/Next-JS-Landing-Page-Starter-Template/raw/master/public/assets/images/nextjs-boilerplate-saas.png?raw=true" alt="Next.js SaaS Boilerplate with React" />
      </a>
    </td>
  </tr>
  <tr height="187px">
    <td align="center" width="33%">
      <a href="mailto:contact@creativedesignsguru.com">
        Add your logo here
      </a>
    </td>
  </tr>
</table>

---

Made with ♥ by [CreativeDesignsGuru](https://creativedesignsguru.com) [![Twitter](https://img.shields.io/twitter/url/https/twitter.com/cloudposse.svg?style=social&label=Follow%20%40Ixartz)](https://twitter.com/ixartz)

[![React SaaS Boilerplate](https://creativedesignsguru.com/assets/images/themes/next-js-saas-starter-kit.jpg)](https://nextlessjs.com)
