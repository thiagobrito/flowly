"""Etapa de testes: type-check, lint, testes unitários e E2E."""

from __future__ import annotations

import contextlib
import os
import subprocess
import time
import urllib.error
import urllib.request
from typing import Iterator

from .utils import ROOT, log, run, section

# O repo da API é irmão do repo do app; nem toda máquina tem os dois.
WEB_ROOT = ROOT.parent / "web"
API_PORT = 3100
API_URL = f"http://127.0.0.1:{API_PORT}/api/v1"
API_BOOT_TIMEOUT = 180
API_STOP_TIMEOUT = 20


def run_checks(skip_lint: bool = False, skip_tests: bool = False, skip_e2e: bool = False) -> None:
    section("Verificações (types / lint / testes)")

    run(["npm", "run", "check-types"])

    if not skip_lint:
        run(["npm", "run", "lint"])

    if not skip_tests:
        run(["npm", "test", "--", "--ci", "--silent"])

    if not skip_e2e:
        run_e2e()


def run_e2e() -> None:
    """Suíte E2E do app: primeiro com fixtures, depois contra a API real."""
    section("E2E do app (Playwright sobre react-native-web)")
    run(["npm", "run", "e2e:ci"])
    _run_against_real_api()


def _run_against_real_api() -> None:
    """Passada de contrato contra o backend de verdade, com Mongo efêmero.

    A suíte acima roda sobre fixtures. Se a API mudar a forma de uma resposta, a
    fixture continua devolvendo o formato antigo e tudo passa — até o app quebrar
    em produção. Esta passada é a única que pega essa divergência, e é por isso que
    ela está no caminho da publicação e não no CI de PR (que não tem o outro repo).
    """
    if not (WEB_ROOT / "package.json").exists():
        log(f"E2E de contrato pulado: {WEB_ROOT} não encontrado.", "warn")
        return

    if not (WEB_ROOT / "node_modules").is_dir():
        log(f"E2E de contrato pulado: rode npm ci em {WEB_ROOT}.", "warn")
        return

    section("E2E de contrato (app + API real)")
    # O `next start` serve o build; sem rebuildar, o teste avaliaria a API de ontem.
    run(["npm", "run", "build"], cwd=WEB_ROOT)

    with _ephemeral_api():
        run(
            ["npx", "playwright", "test", "--project=integration"],
            env={**os.environ, "E2E_API_URL": API_URL},
        )


@contextlib.contextmanager
def _ephemeral_api() -> Iterator[None]:
    """Sobe MongoDB em memória + `next start` do repo da API, e derruba no fim."""
    log(f"$ node e2e/support/start-server.mjs (porta {API_PORT})", "info")
    process = subprocess.Popen(
        ["node", "e2e/support/start-server.mjs"],
        cwd=str(WEB_ROOT),
        env={**os.environ, "E2E_PORT": str(API_PORT)},
    )

    try:
        _wait_for_api(process)
        yield
    finally:
        process.terminate()
        try:
            process.wait(timeout=API_STOP_TIMEOUT)
        except subprocess.TimeoutExpired:
            process.kill()
        log("API efêmera encerrada.", "info")


def _wait_for_api(process: subprocess.Popen) -> None:
    deadline = time.time() + API_BOOT_TIMEOUT

    while time.time() < deadline:
        if process.poll() is not None:
            raise RuntimeError("A API efêmera saiu antes de responder. Veja a saída acima.")

        # `feature-flags` é público: responde 200 sem token e não toca no banco.
        with contextlib.suppress(urllib.error.URLError, OSError):
            with urllib.request.urlopen(f"{API_URL}/feature-flags", timeout=2) as response:
                if response.status == 200:
                    log("API efêmera pronta.", "ok")
                    return

        time.sleep(1)

    raise RuntimeError(f"A API efêmera não respondeu em {API_BOOT_TIMEOUT}s.")
