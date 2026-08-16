"""Testes do ambiente de build — o archive sempre leva o SDK da Meta."""

from __future__ import annotations

import os
import unittest

from build.config import (
    META_APP_ID,
    META_CLIENT_TOKEN,
    apply_build_environment,
    interpret_meta_app_payload,
)


class ApplyBuildEnvironmentTest(unittest.TestCase):
    def setUp(self) -> None:
        self._previous = {
            key: os.environ.get(key)
            for key in ("META_APP_ID", "META_CLIENT_TOKEN", "EXPO_PUBLIC_API_URL")
        }

    def tearDown(self) -> None:
        for key, value in self._previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_define_meta_mesmo_quando_as_chaves_estao_ausentes(self) -> None:
        os.environ.pop("META_APP_ID", None)
        os.environ.pop("META_CLIENT_TOKEN", None)

        apply_build_environment()

        self.assertEqual(os.environ["META_APP_ID"], META_APP_ID)
        self.assertEqual(os.environ["META_CLIENT_TOKEN"], META_CLIENT_TOKEN)

    def test_sobrescreve_o_app_id_da_ferramenta_ads_mcp(self) -> None:
        os.environ["META_APP_ID"] = "1765357947490690"
        os.environ["META_CLIENT_TOKEN"] = "token-errado"

        apply_build_environment()

        self.assertEqual(os.environ["META_APP_ID"], "1612062970628529")
        self.assertEqual(os.environ["META_CLIENT_TOKEN"], META_CLIENT_TOKEN)


class InterpretMetaAppPayloadTest(unittest.TestCase):
    def test_aceita_o_flowly_tasks_com_url_da_app_store(self) -> None:
        problems = interpret_meta_app_payload(
            {
                "id": "1612062970628529",
                "name": "Flowly Tasks",
                "supported_platforms": ["IPHONE"],
                "object_store_urls": {"itunes": "http://itunes.apple.com/app/id6778602637"},
            }
        )

        self.assertEqual(problems, [])

    def test_rejeita_app_sem_loja_ios(self) -> None:
        problems = interpret_meta_app_payload(
            {
                "id": "1765357947490690",
                "name": "ads_mcp",
                "object_store_urls": {"instant_game": "http://www.facebook.com/gaming/play/1/"},
            }
        )

        self.assertTrue(any("id" in item for item in problems))
        self.assertTrue(any("nome" in item for item in problems))
        self.assertTrue(any("plataforma" in item for item in problems))
        self.assertTrue(any("App Store" in item for item in problems))

    def test_rejeita_token_invalido(self) -> None:
        problems = interpret_meta_app_payload({"error": {"message": "Invalid OAuth access token"}})

        self.assertEqual(len(problems), 1)
        self.assertIn("recusou", problems[0])


if __name__ == "__main__":
    unittest.main()
