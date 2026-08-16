/**
 * Garante que o binário iOS declare Português (Brasil) como idioma primário.
 *
 * Só setar `ios.infoPlist` no app.json não basta: o template do Expo nasce com
 * `DEVELOPMENT_LANGUAGE=en` e `knownRegions = (en, Base)`. A App Store lê
 * esses campos (e as pastas `.lproj`) para escrever “Idiomas” na ficha.
 */

const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');

const PRIMARY_LOCALE = 'pt-BR';

function applyInfoPlist(plist) {
  return {
    ...plist,
    CFBundleDevelopmentRegion: PRIMARY_LOCALE,
    CFBundleAllowMixedLocalizations: true,
    CFBundleLocalizations: [PRIMARY_LOCALE],
  };
}

function applyXcodeProject(project) {
  const { uuid } = project.getFirstProject();
  const attributes = project.pbxProjectSection()[uuid];
  if (attributes) {
    attributes.developmentRegion = PRIMARY_LOCALE;
  }

  project.addKnownRegion(PRIMARY_LOCALE);
  if (project.hasKnownRegion('en')) {
    project.removeKnownRegion('en');
  }

  const configs = project.pbxXCBuildConfigurationSection();
  Object.keys(configs).forEach((key) => {
    const item = configs[key];
    if (item && item.buildSettings) {
      item.buildSettings.DEVELOPMENT_LANGUAGE = PRIMARY_LOCALE;
    }
  });

  return project;
}

function withIosPrimaryLocale(config) {
  return withXcodeProject(
    withInfoPlist(config, (cfg) => ({
      ...cfg,
      modResults: applyInfoPlist(cfg.modResults),
    })),
    (cfg) => ({
      ...cfg,
      modResults: applyXcodeProject(cfg.modResults),
    }),
  );
}

module.exports = withIosPrimaryLocale;
