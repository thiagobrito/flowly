"""Testes do classificador do smoke iOS — não precisam de Xcode."""

from __future__ import annotations

import unittest

from build.ios_smoke import classify_logs, env_without_meta, info_plist_has_facebook


class EnvWithoutMetaTest(unittest.TestCase):
    def test_zera_as_duas_credenciais_e_preserva_o_resto(self) -> None:
        env = env_without_meta({"META_APP_ID": "123", "META_CLIENT_TOKEN": "abc", "PATH": "/bin"})

        self.assertEqual(env["META_APP_ID"], "")
        self.assertEqual(env["META_CLIENT_TOKEN"], "")
        self.assertEqual(env["PATH"], "/bin")

    def test_forca_vazio_quando_as_chaves_estao_ausentes(self) -> None:
        env = env_without_meta({"PATH": "/bin"})

        self.assertEqual(env, {"PATH": "/bin", "META_APP_ID": "", "META_CLIENT_TOKEN": ""})


class ClassifyLogsTest(unittest.TestCase):
    def test_detecta_o_invariant_do_native_event_emitter(self) -> None:
        marker = classify_logs("Fatal: Invariant Violation: `new NativeEventEmitter()` requires a non-null argument.")

        self.assertEqual(marker, "`new NativeEventEmitter()` requires a non-null argument")

    def test_boot_limpo_nao_e_crash(self) -> None:
        self.assertIsNone(classify_logs("Running application Flowly\nRCTLog: started"))


class InfoPlistTest(unittest.TestCase):
    def test_reconhece_facebook_app_id(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            ios = Path(tmp)
            plist = ios / "Flowly" / "Info.plist"
            plist.parent.mkdir()
            plist.write_text("<key>FacebookAppID</key><string>123</string>")

            self.assertTrue(info_plist_has_facebook(ios))

    def test_plist_sem_meta_e_o_cenario_do_smoke(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            ios = Path(tmp)
            plist = ios / "Flowly" / "Info.plist"
            plist.parent.mkdir()
            plist.write_text("<key>CFBundleIdentifier</key><string>com.flowly-v2.app</string>")

            self.assertFalse(info_plist_has_facebook(ios))


if __name__ == "__main__":
    unittest.main()
