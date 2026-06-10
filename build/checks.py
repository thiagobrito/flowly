"""Etapa de testes: type-check, lint e testes unitários."""

from __future__ import annotations

from .utils import run, section


def run_checks(skip_lint: bool = False, skip_tests: bool = False) -> None:
    section("Verificações (types / lint / testes)")

    run(["npm", "run", "check-types"])

    if not skip_lint:
        run(["npm", "run", "lint"])

    if not skip_tests:
        run(["npm", "test", "--", "--ci", "--silent"])
