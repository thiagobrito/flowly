"""Helpers compartilhados: logging colorido e execução de comandos."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path
from typing import Sequence

ROOT = Path(__file__).resolve().parent.parent
BUILD_DIR = ROOT / "build"
OUTPUT_DIR = BUILD_DIR / "output"

_RESET = "\033[0m"
_COLORS = {
    "info": "\033[36m",
    "ok": "\033[32m",
    "warn": "\033[33m",
    "err": "\033[31m",
    "step": "\033[1;35m",
}


def _supports_color() -> bool:
    return sys.stdout.isatty()


def log(message: str, kind: str = "info") -> None:
    prefix = {"info": "•", "ok": "✓", "warn": "!", "err": "✗", "step": "▶"}.get(kind, "•")
    if _supports_color():
        color = _COLORS.get(kind, "")
        print(f"{color}{prefix} {message}{_RESET}", flush=True)
    else:
        print(f"{prefix} {message}", flush=True)


def section(title: str) -> None:
    line = "─" * max(8, len(title) + 4)
    if _supports_color():
        print(f"\n{_COLORS['step']}{line}\n  {title}\n{line}{_RESET}", flush=True)
    else:
        print(f"\n{line}\n  {title}\n{line}", flush=True)


class CommandError(RuntimeError):
    """Erro de um comando externo com código de saída diferente de zero."""

    def __init__(self, cmd: Sequence[str], returncode: int) -> None:
        self.cmd = list(cmd)
        self.returncode = returncode
        super().__init__(f"Comando falhou ({returncode}): {' '.join(self.cmd)}")


def run(cmd: Sequence[str], cwd: Path | None = None, env: dict | None = None) -> None:
    """Executa um comando transmitindo a saída em tempo real.

    Levanta CommandError se o código de saída for diferente de zero.
    """
    printable = " ".join(str(c) for c in cmd)
    log(f"$ {printable}", "info")
    start = time.time()
    process = subprocess.run(cmd, cwd=str(cwd or ROOT), env=env)
    elapsed = time.time() - start
    if process.returncode != 0:
        raise CommandError(cmd, process.returncode)
    log(f"concluído em {elapsed:.1f}s", "ok")


def capture(cmd: Sequence[str], cwd: Path | None = None) -> str:
    """Executa um comando e devolve o stdout como string."""
    result = subprocess.run(
        cmd,
        cwd=str(cwd or ROOT),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise CommandError(cmd, result.returncode)
    return result.stdout
