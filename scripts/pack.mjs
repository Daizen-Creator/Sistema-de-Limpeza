// Gera o app executavel (pasta desempacotada, pronta pra rodar) sem instalador.
// Usa @electron/packager para evitar as ferramentas de assinatura do electron-builder.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const electronVersion = require(join(root, "node_modules/electron/package.json")).version;

// Saida FORA do OneDrive (evita travar app.asar durante o sync).
const OUT_DIR = join(homedir(), "NexusClean-App");

function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, shell: true });
}

// 1) build completo (backend java + react + electron)
run("npm", ["run", "build"]);

// 1b) gera o icone .ico a partir da foto do criador (se existir)
try {
  const icoSrc = existsSync(join(root, "public/criador.jpeg"))
    ? "public/criador.jpeg"
    : existsSync(join(root, "public/criador.jpg"))
    ? "public/criador.jpg"
    : null;
  if (icoSrc) {
    run("javac", ["-d", "tools", "tools/IcoGen.java"]);
    run("java", ["-cp", "tools", "IcoGen", icoSrc, "build/app.ico"]);
  }
} catch (e) {
  console.warn("Aviso: nao foi possivel gerar o icone .ico:", e.message);
}

// 2) empacota
run("npx", [
  "@electron/packager",
  ".",
  "LimpezaDrivers",
  "--platform=win32",
  "--arch=x64",
  `--out=${OUT_DIR}`,
  "--overwrite",
  `--electron-version=${electronVersion}`,
  ...(existsSync(join(root, "build/app.ico")) ? ["--icon=./build/app.ico"] : []),
  "--extra-resource=./build/backend.jar",
  ...(existsSync(join(root, "build/app.ico")) ? ["--extra-resource=./build/app.ico"] : []),
  "--extra-resource=./electron/auto-update.ps1",
  "--extra-resource=./electron/optimize.ps1",
  "--extra-resource=./electron/hacker-scan.ps1",
  "--extra-resource=./electron/advanced-opt.ps1",
  "--extra-resource=./electron/scheduled-clean.ps1",
  "--extra-resource=./electron/sfc.ps1",
  "--extra-resource=./electron/backup.ps1",
  "--extra-resource=./electron/profile.ps1",
  "--extra-resource=./electron/restore-point.ps1",
  "--extra-resource=./electron/revert.ps1",
  "--extra-resource=./electron/trace.ps1",
  '--ignore="(release|java-backend/out|\\.git)"',
]);

console.log(`\n✅ App pronto em: ${join(OUT_DIR, "LimpezaDrivers-win32-x64", "LimpezaDrivers.exe")}`);
console.log("   Para atualizar drivers: clique com o botao direito -> Executar como administrador.");
