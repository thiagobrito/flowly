"""Testes do classificador do smoke iOS — não precisam de Xcode."""

from __future__ import annotations

import unittest

from build.ios_smoke import (
    classify_logs,
    env_without_meta,
    info_plist_has_facebook,
    maestro_test_cmd,
    prune_stale_swift_caches,
    resolve_java_home,
    xcodebuild_smoke_cmd,
)


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


class MaestroTestCmdTest(unittest.TestCase):
    def test_usa_udid_e_nao_app_id(self) -> None:
        from pathlib import Path

        cmd = maestro_test_cmd("/opt/maestro", "UDID-1", Path("/tmp/smoke.yaml"))

        self.assertEqual(cmd, ["/opt/maestro", "test", "--udid", "UDID-1", "/tmp/smoke.yaml"])
        self.assertNotIn("--app-id", cmd)


class XcodebuildSmokeCmdTest(unittest.TestCase):
    def test_desliga_index_store_e_usa_destino_de_simulador(self) -> None:
        from pathlib import Path

        cmd = xcodebuild_smoke_cmd(Path("/tmp/Flowly.xcworkspace"), "Flowly", Path("/tmp/dd"))

        self.assertIn("COMPILER_INDEX_STORE_ENABLE=NO", cmd)
        self.assertIn("generic/platform=iOS Simulator", cmd)
        self.assertIn("Release", cmd)
        self.assertNotIn("-sdk", cmd)
        self.assertNotIn("Debug", cmd)


class PruneSwiftCachesTest(unittest.TestCase):
    def test_apaga_pcm_e_preserva_objects(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            derived = Path(tmp)
            pcm = derived / "Build" / "Intermediates.noindex" / "ExplicitPrecompiledModules"
            pcm.mkdir(parents=True)
            (pcm / "mod.pcm").write_text("x")
            obj = derived / "Build" / "Intermediates.noindex" / "Pods.build" / "a.o"
            obj.parent.mkdir(parents=True)
            obj.write_text("o")

            prune_stale_swift_caches(derived)

            self.assertFalse(pcm.exists())
            self.assertTrue(obj.exists())


class ResolveJavaHomeTest(unittest.TestCase):
    def test_respeita_java_home_quando_o_binario_existe(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            home = Path(tmp)
            java = home / "bin" / "java"
            java.parent.mkdir()
            java.write_text("")
            found = resolve_java_home({"JAVA_HOME": str(home)})
            self.assertEqual(found, home)

    def test_ignora_java_home_sem_binario(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        with TemporaryDirectory() as tmp:
            found = resolve_java_home({"JAVA_HOME": str(Path(tmp) / "missing")})
            self.assertNotEqual(found, Path(tmp) / "missing")


class RunLoggedTest(unittest.TestCase):
    def test_grava_stdout_no_arquivo(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        from build.utils import run

        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.log"
            run(["/bin/echo", "hello-flowly"], log_file=path)

            self.assertIn("hello-flowly", path.read_text())

    def test_propaga_falha_e_grava_stderr(self) -> None:
        from pathlib import Path
        from tempfile import TemporaryDirectory

        from build.utils import CommandError, run

        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.log"
            with self.assertRaises(CommandError):
                run(["/bin/sh", "-c", "echo boom >&2; exit 7"], log_file=path)
            self.assertIn("boom", path.read_text())


if __name__ == "__main__":
    unittest.main()
