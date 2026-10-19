/**
 * Adota o UIScene lifecycle exigido pelo SDK do iOS 27 (Xcode 27).
 *
 * Sem o manifesto + SceneDelegate o app cai no launch com
 * `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
 * No SDK 54 o ExpoDevLauncher ainda exige a window em
 * `didFinishLaunching`, então o AppDelegate continua criando a window e o
 * SceneDelegate só a adota — não mover `startReactNative` para a scene.
 *
 * Remover quando o projeto subir para Expo SDK 58 (prebuild já gera isso).
 */

const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

const MARKER = '// with-ios-scene-delegate';

const SCENE_DELEGATE = `
${MARKER}
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }

    let window = appDelegate.window ?? UIWindow(frame: windowScene.coordinateSpace.bounds)
    window.windowScene = windowScene
    self.window = window
    appDelegate.window = window
    window.makeKeyAndVisible()

    for context in connectionOptions.urlContexts {
      SceneDelegate.deliver(url: context.url, options: context.options)
    }
    for activity in connectionOptions.userActivities {
      SceneDelegate.deliver(userActivity: activity)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      SceneDelegate.deliver(url: context.url, options: context.options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    SceneDelegate.deliver(userActivity: userActivity)
  }

  private static func deliver(url: URL, options sceneOptions: UIScene.OpenURLOptions) {
    guard let delegate = UIApplication.shared.delegate else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [
      .openInPlace: sceneOptions.openInPlace
    ]
    if let sourceApplication = sceneOptions.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    if let annotation = sceneOptions.annotation {
      options[.annotation] = annotation
    }
    _ = delegate.application?(UIApplication.shared, open: url, options: options)
  }

  private static func deliver(userActivity: NSUserActivity) {
    guard let delegate = UIApplication.shared.delegate else { return }
    _ = delegate.application?(
      UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

function transformAppDelegate(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }
  if (!/class AppDelegate\s*:\s*ExpoAppDelegate/.test(contents)) {
    throw new Error('withIosSceneDelegate: AppDelegate.swift não herda ExpoAppDelegate.');
  }
  return contents + SCENE_DELEGATE;
}

function withIosSceneDelegate(config) {
  return withInfoPlist(
    withAppDelegate(config, (cfg) => {
      if (cfg.modResults.language && cfg.modResults.language !== 'swift') {
        throw new Error('withIosSceneDelegate espera AppDelegate em Swift.');
      }
      return {
        ...cfg,
        modResults: {
          ...cfg.modResults,
          contents: transformAppDelegate(cfg.modResults.contents),
        },
      };
    }),
    (cfg) => ({
      ...cfg,
      modResults: {
        ...cfg.modResults,
        UIApplicationSceneManifest: SCENE_MANIFEST,
      },
    }),
  );
}

module.exports = withIosSceneDelegate;
module.exports.transformAppDelegate = transformAppDelegate;
module.exports.SCENE_MANIFEST = SCENE_MANIFEST;
