"""Helpers compartilhados: logging colorido e execução de comandos."""

from __future__ import annotations

import os
import subprocess
import sys
import threading
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


def _print_log_tail(path: Path, lines: int = 80) -> None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return
    tail = text.splitlines()[-lines:]
    if not tail:
        return
    sys.stderr.write(f"\n--- últimos {len(tail)} linhas de {path} ---\n")
    sys.stderr.write("\n".join(tail) + "\n")


_HEARTBEAT_SECONDS = 60
_STALL_SECONDS = 20 * 60


def _run_logged(
    cmd: Sequence[str],
    *,
    cwd: str,
    env: dict | None,
    log_path: Path,
    start: float,
) -> int:
    """Drena stdout/stderr para um arquivo.

    Sem isso, o xcodebuild verbose enche o pipe do terminal (Cursor) e o
    processo trava no write() com CPU em 0% — o smoke já ficou 30+ min assim.
    """
    merged = dict(os.environ if env is None else env)
    merged["NSUnbufferedIO"] = "YES"
    log(f"saída em {log_path}", "info")
    with log_path.open("w", encoding="utf-8", errors="replace") as handle:
        process = subprocess.Popen(
            list(cmd),
            cwd=cwd,
            env=merged,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        assert process.stdout is not None
        last_line = [""]
        last_progress = [time.time()]

        def pump() -> None:
            assert process.stdout is not None
            for line in process.stdout:
                handle.write(line)
                handle.flush()
                stripped = line.strip()
                if stripped:
                    last_line[0] = stripped
                    last_progress[0] = time.time()
            process.stdout.close()

        reader = threading.Thread(target=pump, name="run-logged-pump", daemon=True)
        reader.start()
        last_heartbeat = start
        while process.poll() is None:
            time.sleep(1)
            now = time.time()
            if now - last_heartbeat >= _HEARTBEAT_SECONDS:
                preview = last_line[0][:160] if last_line[0] else "(sem saída nova)"
                log(f"ainda em execução ({now - start:.0f}s) — {preview}", "info")
                last_heartbeat = now
            if now - last_progress[0] >= _STALL_SECONDS:
                log(
                    f"sem saída há {_STALL_SECONDS // 60} min — abortando {' '.join(str(c) for c in cmd[:3])}",
                    "err",
                )
                process.terminate()
                try:
                    process.wait(timeout=30)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                reader.join(timeout=5)
                return process.returncode if process.returncode not in (None, 0) else 1
        reader.join(timeout=10)
        return process.wait()


def run(
    cmd: Sequence[str],
    cwd: Path | None = None,
    env: dict | None = None,
    log_file: Path | None = None,
) -> None:
    """Executa um comando transmitindo a saída em tempo real.

    `log_file` redireciona stdout/stderr para disco (evita deadlock de pipe
    em comandos verbosos como xcodebuild). Levanta CommandError se o código
    de saída for diferente de zero.
    """
    printable = " ".join(str(c) for c in cmd)
    log(f"$ {printable}", "info")
    start = time.time()
    if log_file is None:
        process = subprocess.run(cmd, cwd=str(cwd or ROOT), env=env)
        returncode = process.returncode
    else:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        returncode = _run_logged(cmd, cwd=str(cwd or ROOT), env=env, log_path=log_path, start=start)
    elapsed = time.time() - start
    if returncode != 0:
        if log_file is not None:
            _print_log_tail(Path(log_file))
        raise CommandError(cmd, returncode)
    log(f"concluído em {elapsed:.1f}s", "ok")


def capture(cmd: Sequence[str], cwd: Path | None = None, env: dict | None = None) -> str:
    """Executa um comando e devolve o stdout como string."""
    result = subprocess.run(
        cmd,
        cwd=str(cwd or ROOT),
        capture_output=True,
        text=True,
        env=env,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise CommandError(cmd, result.returncode)
    return result.stdout
