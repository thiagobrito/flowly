# Build iOS local + upload automatizado

Automação em Python para **testar, buildar e enviar** o Flowly à App Store
diretamente do seu Mac, **sem usar os servidores de build da Expo**. A Expo é
usada só como CLI local (`expo prebuild`); a compilação é feita pelo Xcode
(`xcodebuild`) e o envio pelo `xcrun altool`.

## Versionamento

Cada build recebe a versão no formato **`YYYY.MM.DD (build)`**:

- `CFBundleShortVersionString` (versão de marketing) = `YYYY.MM.DD`
- `CFBundleVersion` (build) = inteiro que **reinicia a cada novo dia** e
  incrementa a cada build no mesmo dia (ex.: `2026.06.09 (1)`, `(2)`, ...).

O estado fica em `build/state.json`. Os valores são gravados em `app.json`
(`expo.version`, `expo.ios.buildNumber`, `expo.android.versionCode`) antes do
prebuild, então o projeto nativo nasce já com a versão correta.

## Pré-requisitos

1. macOS com **Xcode** instalado (`xcode-select --install` + Xcode da App Store)
2. **CocoaPods**: `sudo gem install cocoapods`
3. Conta **Apple Developer** e o app criado no App Store Connect com o
   bundle ID `com.flowly-v2.app`
4. Capability **HealthKit** habilitada no App ID (o app usa `react-native-health`)
5. **App Store Connect API Key** (`.p8`) para upload automatizado

## Configuração

```bash
cp build/.env.example build/.env
# edite build/.env com APPLE_TEAM_ID e as credenciais da API
```

Para gerar a API Key: App Store Connect → Users and Access → Integrations →
App Store Connect API → gerar chave com papel **App Manager**. Baixe o `.p8`
(só é possível baixar uma vez) e aponte `ASC_KEY_PATH` para ele.

## Uso

```bash
python build.py            # pipeline completo: testes → build → upload
python build.py all --no-tests     # pula as verificações
python build.py all --no-upload    # gera o .ipa sem enviar
python build.py all --clean        # prebuild --clean (regenera ios/)

python build.py test       # só type-check + lint + testes
python build.py build      # só prebuild + archive/export
python build.py upload     # só upload do último .ipa
python build.py version    # mostra a próxima versão
python build.py config     # mostra a configuração detectada

python build.py --build 7 all   # força um número de build específico
```

## O que cada etapa faz

| Etapa    | Comando por baixo |
|----------|-------------------|
| testes   | `npm run check-types`, `npm run lint`, `npm test` |
| versão   | escreve em `app.json` + `build/state.json` |
| prebuild | `npx expo prebuild --platform ios` |
| archive  | `xcodebuild ... archive` (Release, assinatura automática) |
| export   | `xcodebuild -exportArchive` → `.ipa` em `build/output/` |
| upload   | `xcrun altool --upload-app` com a API Key |

## Saídas

Os artefatos vão para `build/output/` (`.xcarchive`, `.ipa`,
`ExportOptions.plist`). Essa pasta é ignorada pelo Git.

## Solução de problemas

- **Scheme não detectado**: rode `python build.py build` após o primeiro
  prebuild, ou defina `IOS_SCHEME` no `.env`.
- **Falha de assinatura**: confirme `APPLE_TEAM_ID` e que o dispositivo/perfil
  permite *Automatically manage signing*. O `-allowProvisioningUpdates` deixa o
  Xcode criar perfis sob demanda.
- **Upload rejeitado por build duplicado**: a App Store exige `CFBundleVersion`
  crescente — rode novamente (o build incrementa) ou use `--build N`.
- **Sem credenciais da API**: use `all --no-upload` e envie o `.ipa` pelo app
  Transporter manualmente.
