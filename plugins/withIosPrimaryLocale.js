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
  plist.CFBundleDevelopmentRegion = PRIMARY_LOCALE;
  plist.CFBundleAllowMixedLocalizations = true;
  plist.CFBundleLocalizations = [PRIMARY_LOCALE];
  return plist;
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
  for (const key of Object.keys(configs)) {
    const item = configs[key];
    if (item?.buildSettings) {
      item.buildSettings.DEVELOPMENT_LANGUAGE = PRIMARY_LOCALE;
    }
  }

  return project;
}

function withIosPrimaryLocale(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults = applyInfoPlist(cfg.modResults);
    return cfg;
  });

  config = withXcodeProject(config, (cfg) => {
    cfg.modResults = applyXcodeProject(cfg.modResults);
    return cfg;
  });

  return config;
}

module.exports = withIosPrimaryLocale;
