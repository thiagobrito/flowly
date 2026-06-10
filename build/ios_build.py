"""Geração do projeto nativo (prebuild) e Archive/Export do .ipa via xcodebuild."""

from __future__ import annotations

import plistlib
from pathlib import Path

from .config import Config, load_config
from .utils import OUTPUT_DIR, ROOT, capture, log, run, section


def prebuild(clean: bool = False) -> None:
    section("Expo prebuild (gera ios/ localmente)")
    cmd = ["npx", "expo", "prebuild", "--platform", "ios", "--non-interactive"]
    if clean:
        cmd.append("--clean")
    run(cmd)


def _resolve_workspace(cfg: Config) -> Path:
    if cfg.workspace and cfg.workspace.exists():
        return cfg.workspace
    matches = sorted((ROOT / "ios").glob("*.xcworkspace"))
    if not matches:
        raise RuntimeError("Nenhum .xcworkspace encontrado em ios/. Rode o prebuild antes.")
    return matches[0]


def _resolve_scheme(cfg: Config, workspace: Path) -> str:
    if cfg.scheme:
        return cfg.scheme
    import json

    from .config import pick_app_scheme

    data = json.loads(capture(["xcodebuild", "-list", "-json", "-workspace", str(workspace)]))
    schemes = data.get("workspace", {}).get("schemes", [])
    scheme = pick_app_scheme(schemes, workspace)
    if not scheme:
        raise RuntimeError("Não foi possível detectar o scheme. Defina IOS_SCHEME no .env.")
    return scheme


def _write_export_options(cfg: Config) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    options: dict = {
        "method": cfg.export_method,
        "signingStyle": "automatic",
        "uploadSymbols": True,
        "destination": "export",
    }
    if cfg.team_id:
        options["teamID"] = cfg.team_id

    path = OUTPUT_DIR / "ExportOptions.plist"
    with path.open("wb") as fh:
        plistlib.dump(options, fh)
    return path


def archive_and_export(cfg: Config | None = None) -> Path:
    """Compila um Archive em Release e exporta o .ipa. Retorna o caminho do .ipa."""
    cfg = cfg or load_config()
    if not cfg.team_id:
        raise RuntimeError(
            "APPLE_TEAM_ID ausente. Copie build/.env.example para build/.env e preencha o Team ID "
            "da sua conta Apple Developer (Membership → Team ID)."
        )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    workspace = _resolve_workspace(cfg)
    scheme = _resolve_scheme(cfg, workspace)
    archive_path = OUTPUT_DIR / f"{scheme}.xcarchive"

    section(f"Archive (Release) — scheme {scheme}")
    archive_cmd = [
        "xcodebuild",
        "-workspace",
        str(workspace),
        "-scheme",
        scheme,
        "-configuration",
        "Release",
        "-destination",
        "generic/platform=iOS",
        "-archivePath",
        str(archive_path),
        "clean",
        "archive",
        "-allowProvisioningUpdates",
    ]
    if cfg.team_id:
        archive_cmd.append(f"DEVELOPMENT_TEAM={cfg.team_id}")
    run(archive_cmd)

    section("Export do .ipa")
    export_options = _write_export_options(cfg)
    export_cmd = [
        "xcodebuild",
        "-exportArchive",
        "-archivePath",
        str(archive_path),
        "-exportPath",
        str(OUTPUT_DIR),
        "-exportOptionsPlist",
        str(export_options),
        "-allowProvisioningUpdates",
    ]
    run(export_cmd)

    ipas = sorted(OUTPUT_DIR.glob("*.ipa"))
    if not ipas:
        raise RuntimeError("Export concluído mas nenhum .ipa foi encontrado em build/output.")
    ipa = ipas[-1]
    log(f"IPA gerado: {ipa}", "ok")
    return ipa
