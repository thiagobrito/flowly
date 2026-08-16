"""Smoke nativo iOS: o app precisa abrir sem o SDK da Meta linkado.

O E2E do Playwright exporta para web. Lá `Platform.OS !== 'ios'`, então
`new NativeEventEmitter(null)` é no-op — o crash fatal de produção
(FLOWLY-MOBILE-16) nunca aparece. Este smoke gera o binário de simulador
**sem** `META_APP_ID`/`META_CLIENT_TOKEN` (o plugin fica de fora, como no
release que caiu), lança no iPhone Simulator e falha se o processo morrer
ou se o invariant do `NativeEventEmitter` aparecer no log.

Requer macOS + Xcode. Não roda no CI de PR (Ubuntu).
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import time
from pathlib import Path

from .config import load_config
from .ios_build import _resolve_scheme, _resolve_workspace, prebuild
from .utils import OUTPUT_DIR, ROOT, capture, log, run, section

META_ENV_KEYS = ("META_APP_ID", "META_CLIENT_TOKEN")
CRASH_MARKERS = (
    "`new NativeEventEmitter()` requires a non-null argument",
    "Invariant Violation: `new NativeEventEmitter()`",
)
DERIVED_DATA = OUTPUT_DIR / "DerivedData-smoke"
LOG_PATH = OUTPUT_DIR / "ios-smoke.log"
BOOT_SECONDS = 25
MAESTRO_FLOW = ROOT / "e2e" / "ios" / "smoke.yaml"


def env_without_meta(source: dict[str, str] | None = None) -> dict[str, str]:
    """Copia o ambiente sem as credenciais que puxam o plugin da Meta."""
    env = dict(source if source is not None else os.environ)
    for key in META_ENV_KEYS:
        env.pop(key, None)
    return env


def classify_logs(text: str) -> str | None:
    """Devolve o marcador de crash encontrado, ou None se o boot está limpo."""
    for marker in CRASH_MARKERS:
        if marker in text:
            return marker
    return None


def info_plist_has_facebook(ios_dir: Path) -> bool:
    """True quando o prebuild injetou o App ID da Meta no Info.plist."""
    for plist in ios_dir.glob("*/Info.plist"):
        raw = plist.read_text(errors="ignore")
        if "FacebookAppID" in raw or "FacebookClientToken" in raw:
            return True
    return False


def _require_macos() -> None:
    if platform.system() != "Darwin":
        raise RuntimeError("O smoke nativo iOS precisa de macOS + Xcode. Este host é " f"{platform.system()}.")
    if shutil.which("xcrun") is None or shutil.which("xcodebuild") is None:
        raise RuntimeError("xcrun/xcodebuild ausentes. Instale o Xcode e rode xcode-select --install.")


def _pick_iphone(devices_json: str) -> tuple[str, str]:
    """Escolhe um iPhone disponível. Prefere o 16; nunca pega iPad/Watch."""
    payload = json.loads(devices_json)
    candidates: list[tuple[str, str, str]] = []
    for runtime, devices in payload.get("devices", {}).items():
        if "iOS" not in runtime and "ios" not in runtime:
            continue
        for device in devices:
            name = device.get("name", "")
            if not device.get("isAvailable"):
                continue
            if not name.startswith("iPhone"):
                continue
            candidates.append((name, device["udid"], runtime))

    if not candidates:
        raise RuntimeError("Nenhum iPhone Simulator disponível. Abra o Xcode e instale um runtime de iOS.")

    preferred = [item for item in candidates if "iPhone 16" in item[0]]
    name, udid, _runtime = (preferred or candidates)[0]
    return name, udid


def _boot_simulator(udid: str) -> None:
    state = capture(["xcrun", "simctl", "list", "devices", "-j"])
    payload = json.loads(state)
    current = "unknown"
    for devices in payload.get("devices", {}).values():
        for device in devices:
            if device.get("udid") == udid:
                current = device.get("state", "unknown")
                break

    if current != "Booted":
        log(f"Ligando simulador {udid} (estado: {current})", "info")
        subprocess.run(["xcrun", "simctl", "boot", udid], check=False)
        run(["xcrun", "simctl", "bootstatus", udid, "-b"])
    else:
        log(f"Simulador já ligado: {udid}", "ok")


def _find_app(derived: Path) -> Path:
    apps = sorted(derived.glob("Build/Products/*-iphonesimulator/*.app"))
    apps = [app for app in apps if app.suffix == ".app" and not app.name.endswith("Tests.app")]
    if not apps:
        raise RuntimeError(f"Nenhum .app de simulador em {derived}. O xcodebuild rodou?")
    return apps[-1]


def _pid_alive(udid: str, pid: int) -> bool:
    result = subprocess.run(
        ["xcrun", "simctl", "spawn", udid, "launchctl", "print", f"pid/{pid}"],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def _launch(udid: str, bundle_id: str) -> int:
    subprocess.run(["xcrun", "simctl", "terminate", udid, bundle_id], check=False, capture_output=True)
    raw = capture(["xcrun", "simctl", "launch", udid, bundle_id]).strip()
    # `com.flowly-v2.app: 12345` — o PID é o último token numérico.
    token = raw.split()[-1].rstrip()
    try:
        return int(token)
    except ValueError as exc:
        raise RuntimeError(f"Não consegui ler o PID do launch: {raw!r}") from exc


def _stream_logs(udid: str, log_path: Path) -> subprocess.Popen:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    handle = log_path.open("w", encoding="utf-8")
    predicate = (
        'eventMessage CONTAINS "NativeEventEmitter" OR '
        'eventMessage CONTAINS "Invariant Violation" OR '
        'eventMessage CONTAINS "Running application" OR '
        'processImagePath CONTAINS "Flowly"'
    )
    return subprocess.Popen(
        ["xcrun", "simctl", "spawn", udid, "log", "stream", "--level", "debug", "--style", "compact", "--predicate", predicate],
        stdout=handle,
        stderr=subprocess.STDOUT,
    )


def _run_maestro(bundle_id: str) -> None:
    maestro = shutil.which("maestro")
    if maestro is None:
        home = Path.home() / ".maestro" / "bin" / "maestro"
        maestro = str(home) if home.exists() else None
    if maestro is None:
        log("Maestro ausente: o smoke valida processo + logs. Para afirmar a tela de login, instale https://maestro.mobile.dev", "warn")
        return
    if not MAESTRO_FLOW.exists():
        return

    section("Maestro — login visível após o boot")
    run([maestro, "test", "--app-id", bundle_id, str(MAESTRO_FLOW)])


def run_ios_smoke(*, skip_prebuild: bool = False, skip_build: bool = False) -> None:
    """Gera (se preciso), instala e lança o app sem o native da Meta."""
    _require_macos()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    env = env_without_meta()
    if any(os.environ.get(key) for key in META_ENV_KEYS):
        log("META_APP_ID/META_CLIENT_TOKEN presentes no ambiente — o smoke ignora os dois para reproduzir o binário sem plugin.", "warn")

    if not skip_prebuild:
        prebuild(env=env)
    elif not (ROOT / "ios").exists():
        raise RuntimeError("ios/ ausente. Rode sem --skip-prebuild.")

    if info_plist_has_facebook(ROOT / "ios"):
        raise RuntimeError(
            "ios/*/Info.plist ainda tem FacebookAppID. O prebuild deste smoke precisa rodar "
            "sem META_APP_ID/META_CLIENT_TOKEN — senão o native está linkado e o buraco não é testado."
        )
    log("Info.plist sem FacebookAppID: o native da Meta ficou de fora.", "ok")

    cfg = load_config()
    workspace = _resolve_workspace(cfg)
    scheme = _resolve_scheme(cfg, workspace)

    if not skip_build:
        section(f"xcodebuild (simulador Debug) — scheme {scheme}")
        DERIVED_DATA.mkdir(parents=True, exist_ok=True)
        run(
            [
                "xcodebuild",
                "-workspace",
                str(workspace),
                "-scheme",
                scheme,
                "-configuration",
                "Debug",
                "-sdk",
                "iphonesimulator",
                "-derivedDataPath",
                str(DERIVED_DATA),
                "CODE_SIGNING_ALLOWED=NO",
                "build",
            ]
        )

    app = _find_app(DERIVED_DATA)
    log(f"App: {app}", "info")

    name, udid = _pick_iphone(capture(["xcrun", "simctl", "list", "devices", "available", "-j"]))
    log(f"Simulador: {name} ({udid})", "info")
    _boot_simulator(udid)

    section("Instala e lança")
    run(["xcrun", "simctl", "install", udid, str(app)])

    streamer = _stream_logs(udid, LOG_PATH)
    try:
        time.sleep(1)
        pid = _launch(udid, cfg.bundle_id)
        log(f"Lançado {cfg.bundle_id} pid={pid}", "info")
        time.sleep(BOOT_SECONDS)

        if not _pid_alive(udid, pid):
            logs = LOG_PATH.read_text(errors="ignore") if LOG_PATH.exists() else ""
            marker = classify_logs(logs)
            detail = f" Marcador: {marker}." if marker else f" Veja {LOG_PATH}."
            raise RuntimeError(f"O app morreu em menos de {BOOT_SECONDS}s após o launch.{detail}")

        logs = LOG_PATH.read_text(errors="ignore") if LOG_PATH.exists() else ""
        marker = classify_logs(logs)
        if marker:
            raise RuntimeError(f"Crash de boot no log do simulador: {marker}. Arquivo: {LOG_PATH}")
    finally:
        streamer.terminate()
        streamer.wait(timeout=5)

    log(f"Processo vivo após {BOOT_SECONDS}s, sem NativeEventEmitter no log.", "ok")
    _run_maestro(cfg.bundle_id)
    log("Smoke nativo iOS passou.", "ok")
