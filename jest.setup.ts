// Import Jest Native matchers
import '@testing-library/jest-native/extend-expect';

// AsyncStorage não tem módulo nativo sob Jest. O mock oficial da lib mantém a
// API real (get/set/remove) sobre um objeto em memória, então libs que só
// importam o módulo no topo do arquivo param de estourar na coleta de testes.
/* eslint-disable global-require -- jest.mock factory roda antes dos imports ES. */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// `SafeAreaProvider` é uma view nativa que só renderiza os filhos depois de
// receber os insets do sistema. Sem o mock oficial, toda tela dentro de um
// `ModalScreen` monta vazia sob Jest.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});
/* eslint-enable global-require */
