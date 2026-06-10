"""Versionamento no formato YYYY.MM.DD com build incremental por dia.

- CFBundleShortVersionString (marketing) = YYYY.MM.DD
- CFBundleVersion (build)               = inteiro que reinicia a cada novo dia

O estado é persistido em build/state.json para que múltiplos builds no mesmo
dia gerem números crescentes (exigência da App Store).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from .utils import BUILD_DIR, ROOT, log

STATE_FILE = BUILD_DIR / "state.json"
APP_JSON = ROOT / "app.json"


@dataclass
class Version:
    marketing: str  # ex.: 2026.06.09
    build: int  # ex.: 3

    @property
    def display(self) -> str:
        return f"{self.marketing} ({self.build})"


def _today() -> str:
    return datetime.now().strftime("%Y.%m.%d")


def _read_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _write_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def next_version(build_override: int | None = None) -> Version:
    """Calcula a próxima versão, reiniciando o build a cada novo dia."""
    today = _today()
    state = _read_state()

    if build_override is not None:
        build = build_override
    elif state.get("date") == today:
        build = int(state.get("build", 0)) + 1
    else:
        build = 1

    return Version(marketing=today, build=build)


def commit_version(version: Version) -> None:
    """Persiste o estado após um build bem-sucedido."""
    _write_state({"date": version.marketing, "build": version.build})


def apply_to_app_json(version: Version, team_id: str | None = None) -> None:
    """Grava version e ios.buildNumber em app.json para o prebuild propagar."""
    data = json.loads(APP_JSON.read_text())
    expo = data.setdefault("expo", {})
    expo["version"] = version.marketing

    ios = expo.setdefault("ios", {})
    ios["buildNumber"] = str(version.build)
    if team_id:
        ios["appleTeamId"] = team_id
    elif "appleTeamId" in ios:
        del ios["appleTeamId"]

    android = expo.setdefault("android", {})
    android["versionCode"] = _android_version_code(version)

    APP_JSON.write_text(json.dumps(data, indent=2) + "\n")
    log(f"app.json atualizado → {version.display}", "ok")


def _android_version_code(version: Version) -> int:
    """Gera um versionCode crescente para Android (YYYYMMDD * 100 + build)."""
    digits = version.marketing.replace(".", "")
    return int(digits) * 100 + version.build
