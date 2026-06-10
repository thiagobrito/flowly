"""Upload do .ipa para a App Store Connect via `xcrun altool` + API Key (.p8)."""

from __future__ import annotations

import shutil
from pathlib import Path

from .config import Config, load_config
from .utils import OUTPUT_DIR, log, run, section

# altool procura a chave nestes diretórios, no formato AuthKey_<KEYID>.p8
_KEY_DEST_DIR = Path.home() / ".appstoreconnect" / "private_keys"


def _ensure_api_key(cfg: Config) -> None:
    """Copia a .p8 para o diretório padrão do altool, se necessário."""
    src = Path(cfg.asc_key_path).expanduser()
    if not src.exists():
        raise RuntimeError(f"Chave da API não encontrada: {src}")

    _KEY_DEST_DIR.mkdir(parents=True, exist_ok=True)
    dest = _KEY_DEST_DIR / f"AuthKey_{cfg.asc_key_id}.p8"
    if not dest.exists():
        shutil.copy2(src, dest)
        log(f"Chave copiada para {dest}", "info")


def _latest_ipa() -> Path:
    ipas = sorted(OUTPUT_DIR.glob("*.ipa"))
    if not ipas:
        raise RuntimeError("Nenhum .ipa em build/output. Rode o build antes do upload.")
    return ipas[-1]


def upload(cfg: Config | None = None, ipa: Path | None = None) -> None:
    cfg = cfg or load_config()
    section("Upload para App Store Connect")

    if not cfg.has_asc_credentials:
        log(
            "Credenciais da API ausentes (ASC_KEY_ID/ASC_ISSUER_ID/ASC_KEY_PATH).",
            "err",
        )
        log("Configure build/.env ou suba o .ipa manualmente pelo Transporter.", "warn")
        raise RuntimeError("Upload abortado: sem credenciais da App Store Connect.")

    _ensure_api_key(cfg)
    target = ipa or _latest_ipa()

    run(
        [
            "xcrun",
            "altool",
            "--upload-app",
            "--type",
            "ios",
            "--file",
            str(target),
            "--apiKey",
            cfg.asc_key_id,
            "--apiIssuer",
            cfg.asc_issuer_id,
        ]
    )
    log("Upload enviado. Acompanhe o processamento no App Store Connect.", "ok")
