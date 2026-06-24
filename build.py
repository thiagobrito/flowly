#!/usr/bin/env python3
"""Flowly — automação de build/upload iOS local (sem servidores Expo).

Pipeline: versão (YYYY.MM.DD + build) → testes → prebuild → archive/export → upload.

Exemplos:
    python build.py                # pipeline completo
    python build.py all --no-tests # pula testes
    python build.py test           # só verificações
    python build.py build          # só prebuild + archive/export
    python build.py upload         # só upload do último .ipa
    python build.py version        # mostra a próxima versão e sai
    python build.py config         # mostra a configuração detectada

Requisitos: macOS + Xcode + CocoaPods + conta Apple Developer.
Configuração de credenciais: copie build/.env.example para build/.env.
"""

from __future__ import annotations

import argparse
import sys

from build.checks import run_checks
from build.config import apply_build_environment, load_config, print_summary
from build.ios_build import archive_and_export, prebuild
from build.upload import upload as upload_step
from build.utils import CommandError, log, section
from build.version import apply_to_app_json, commit_version, next_version

_BUILD_COMMANDS = frozenset({"all", "build", "upload", "config"})


def _cmd_version(args: argparse.Namespace) -> int:
    version = next_version(args.build)
    log(f"Próxima versão: {version.display}", "ok")
    return 0


def _cmd_config(_: argparse.Namespace) -> int:
    print_summary(load_config())
    return 0


def _cmd_test(args: argparse.Namespace) -> int:
    run_checks(skip_lint=args.no_lint, skip_tests=False)
    return 0


def _cmd_build(args: argparse.Namespace) -> int:
    cfg = load_config()
    version = next_version(args.build)
    section(f"Versão {version.display}")
    apply_to_app_json(version, cfg.team_id)
    prebuild(clean=args.clean)
    archive_and_export(cfg)
    commit_version(version)
    return 0


def _cmd_upload(_: argparse.Namespace) -> int:
    upload_step(load_config())
    return 0


def _cmd_all(args: argparse.Namespace) -> int:
    cfg = load_config()
    print_summary(cfg)

    version = next_version(args.build)
    section(f"Versão {version.display}")

    if not args.no_tests:
        run_checks(skip_lint=args.no_lint, skip_tests=False)

    apply_to_app_json(version, cfg.team_id)
    prebuild(clean=args.clean)
    ipa = archive_and_export(cfg)

    if args.no_upload:
        log("Upload pulado (--no-upload). IPA pronto para envio manual.", "warn")
        commit_version(version)
        log(f"Concluído: {version.display} → {ipa}", "ok")
        return 0

    upload_step(cfg, ipa)
    commit_version(version)
    log(f"Pipeline concluído: {version.display}", "ok")
    return 0


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="build.py",
        description="Build e upload iOS local do Flowly.",
    )
    parser.add_argument(
        "--build",
        type=int,
        default=None,
        help="Força o número do build em vez de auto-incrementar.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Roda o prebuild com --clean (regenera ios/ do zero).",
    )

    sub = parser.add_subparsers(dest="command")

    p_all = sub.add_parser("all", help="Pipeline completo (padrão).")
    p_all.add_argument("--no-tests", action="store_true", help="Pula as verificações.")
    p_all.add_argument("--no-lint", action="store_true", help="Pula o lint.")
    p_all.add_argument("--no-upload", action="store_true", help="Gera o .ipa sem subir.")
    p_all.set_defaults(func=_cmd_all)

    p_test = sub.add_parser("test", help="Apenas type-check/lint/testes.")
    p_test.add_argument("--no-lint", action="store_true", help="Pula o lint.")
    p_test.set_defaults(func=_cmd_test)

    p_build = sub.add_parser("build", help="Apenas prebuild + archive/export.")
    p_build.set_defaults(func=_cmd_build)

    p_upload = sub.add_parser("upload", help="Apenas upload do último .ipa.")
    p_upload.set_defaults(func=_cmd_upload)

    sub.add_parser("version", help="Mostra a próxima versão.").set_defaults(func=_cmd_version)
    sub.add_parser("config", help="Mostra a configuração detectada.").set_defaults(func=_cmd_config)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if not getattr(args, "command", None):
        # Sem subcomando → pipeline completo com defaults.
        args.command = "all"
        args.func = _cmd_all
        args.no_tests = False
        args.no_lint = False
        args.no_upload = False

    if args.command in _BUILD_COMMANDS:
        apply_build_environment()

    try:
        return args.func(args)
    except CommandError as exc:
        log(str(exc), "err")
        return exc.returncode or 1
    except (RuntimeError, FileNotFoundError) as exc:
        log(str(exc), "err")
        return 1
    except KeyboardInterrupt:
        log("Interrompido pelo usuário.", "warn")
        return 130


if __name__ == "__main__":
    sys.exit(main())
