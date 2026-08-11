/**
 * Reconhecimento de fala falso, injetado antes do boot.
 *
 * O `expo-speech-recognition` no web instancia `webkitSpeechRecognition` do
 * `window` a cada `start()`. Em Chromium headless a API existe mas depende do
 * serviço de fala do Google, o que deixaria o assistente de voz — a única tela
 * que cria tarefa sem formulário — sem teste nenhum.
 *
 * Trocando a classe global por esta, o teste "fala" chamando
 * `window.__e2eSpeak(texto)` e o app recebe o mesmo evento `result` que
 * receberia do reconhecedor de verdade.
 */

/** Executado no contexto da página, antes de qualquer script do app. */
export function installFakeSpeech(): void {
  class FakeSpeechRecognition extends EventTarget {
    lang = '';

    interimResults = false;

    maxAlternatives = 1;

    continuous = false;

    start() {
      (window as unknown as { __e2eListening?: EventTarget }).__e2eListening = this;
      this.dispatchEvent(new Event('start'));
    }

    stop() {
      this.finish();
    }

    abort() {
      this.finish();
    }

    finish() {
      const globals = window as unknown as { __e2eListening?: EventTarget };
      if (globals.__e2eListening === this) delete globals.__e2eListening;
      this.dispatchEvent(new Event('end'));
    }
  }

  Object.assign(window, {
    webkitSpeechRecognition: FakeSpeechRecognition,
    SpeechRecognition: FakeSpeechRecognition,

    /** Entrega um resultado final e encerra a sessão, como faz um ditado real. */
    __e2eSpeak(text: string) {
      const recognizer = (window as unknown as { __e2eListening?: FakeSpeechRecognition }).__e2eListening;
      if (!recognizer) throw new Error('Nenhuma sessão de escuta ativa para "falar".');

      const alternative = { transcript: text, confidence: 1 };
      const result = Object.assign([alternative], { isFinal: true, length: 1 });
      const event = Object.assign(new Event('result'), { results: Object.assign([result], { length: 1 }), resultIndex: 0 });

      recognizer.dispatchEvent(event);
      recognizer.finish();
    },
  });
}
