/**
 * `Alert` do RN Web, mas visível.
 *
 * O `Alert.alert` do react-native-web é `static alert() {}` — um no-op. Como o
 * app usa Alert para toda confirmação destrutiva e para reportar erro, sem isto
 * metade dos fluxos de escrita ficaria fora do alcance dos testes: o clique
 * acontece, o diálogo não, e nada mais é chamado.
 *
 * O shim monta o diálogo no DOM com um `<button>` por ação, então o teste clica
 * no rótulo que o próprio app definiu ("Deletar", "Cancelar") e o `onPress`
 * original roda. É trocado por resolução do Metro apenas no bundle de E2E
 * (`E2E_ALERT_SHIM=1`, ver `metro.config.js`).
 */

const OVERLAY_STYLE = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4)';
const BOX_STYLE = 'min-width:260px;max-width:80%;padding:16px;border-radius:12px;background:#fff;color:#18181b;font-family:system-ui;display:flex;flex-direction:column;gap:8px';

class Alert {
  static alert(title, message, buttons) {
    const actions = Array.isArray(buttons) && buttons.length > 0 ? buttons : [{ text: 'OK' }];

    const overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title ?? 'Alerta');
    overlay.setAttribute('data-testid', 'e2e-alert');
    overlay.setAttribute('style', OVERLAY_STYLE);

    const box = document.createElement('div');
    box.setAttribute('style', BOX_STYLE);

    if (title) {
      const heading = document.createElement('strong');
      heading.textContent = title;
      box.appendChild(heading);
    }

    if (message) {
      const body = document.createElement('span');
      body.textContent = message;
      box.appendChild(body);
    }

    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.text ?? 'OK';
      button.addEventListener('click', () => {
        overlay.remove();
        action.onPress?.();
      });
      box.appendChild(button);
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
}

export default Alert;
