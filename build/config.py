"""Configuração da automação, carregada de build/.env + variáveis de ambiente."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from .utils import BUILD_DIR, ROOT, capture, log

ENV_FILE = BUILD_DIR / ".env"


def _load_env_file(path: Path) -> None:
    """Carrega pares KEY=VALUE de um arquivo .env para os.environ (sem sobrescrever)."""
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _detect_workspace() -> Path | None:
    ios_dir = ROOT / "ios"
    if not ios_dir.exists():
        return None
    matches = sorted(ios_dir.glob("*.xcworkspace"))
    return matches[0] if matches else None


def pick_app_scheme(schemes: list[str], workspace: Path) -> str | None:
    """Escolhe o scheme do app (não de Pods), priorizando o nome do workspace."""
    if not schemes:
        return None
    target = workspace.stem
    if target in schemes:
        return target
    try:
        app_name = _read_app_json().get("expo", {}).get("name")
    except Exception:  # noqa: BLE001
        app_name = None
    if app_name and app_name in schemes:
        return app_name
    return schemes[0]


def _detect_scheme(workspace: Path | None) -> str | None:
    if workspace is None:
        return None
    try:
        raw = capture(["xcodebuild", "-list", "-json", "-workspace", str(workspace)])
        data = json.loads(raw)
        schemes = data.get("workspace", {}).get("schemes", [])
        return pick_app_scheme(schemes, workspace)
    except Exception:  # noqa: BLE001 - detecção é best-effort
        return None


def _read_app_json() -> dict:
    return json.loads((ROOT / "app.json").read_text())


@dataclass
class Config:
    bundle_id: str
    team_id: str | None
    scheme: str | None
    workspace: Path | None
    export_method: str
    asc_key_id: str | None
    asc_issuer_id: str | None
    asc_key_path: str | None

    @property
    def has_asc_credentials(self) -> bool:
        return bool(self.asc_key_id and self.asc_issuer_id and self.asc_key_path)


def load_config() -> Config:
    _load_env_file(ENV_FILE)
    app = _read_app_json()
    ios_cfg = app.get("expo", {}).get("ios", {})
    bundle_id = os.environ.get("BUNDLE_ID") or ios_cfg.get("bundleIdentifier", "")

    workspace = _detect_workspace()
    scheme = os.environ.get("IOS_SCHEME") or _detect_scheme(workspace)

    return Config(
        bundle_id=bundle_id,
        team_id=os.environ.get("APPLE_TEAM_ID"),
        scheme=scheme,
        workspace=workspace,
        export_method=os.environ.get("EXPORT_METHOD", "app-store"),
        asc_key_id=os.environ.get("ASC_KEY_ID"),
        asc_issuer_id=os.environ.get("ASC_ISSUER_ID"),
        asc_key_path=os.environ.get("ASC_KEY_PATH"),
    )


def print_summary(cfg: Config) -> None:
    log(f"Bundle ID: {cfg.bundle_id or '(indefinido)'}", "info")
    log(f"Team ID:   {cfg.team_id or '(use APPLE_TEAM_ID)'}", "info")
    log(f"Scheme:    {cfg.scheme or '(detectado após prebuild)'}", "info")
    log(f"Workspace: {cfg.workspace or '(gerado pelo prebuild)'}", "info")
    log(f"Export:    {cfg.export_method}", "info")
    log(
        "ASC API:   "
        + ("configurada" if cfg.has_asc_credentials else "ausente (upload manual)"),
        "info",
    )
    log(f"API URL:   {os.environ.get('EXPO_PUBLIC_API_URL', '(não definida)')}", "info")
