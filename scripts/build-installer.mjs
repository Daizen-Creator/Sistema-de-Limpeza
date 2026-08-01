// Gera o instalador (Setup.exe) com o icone correto.
// Contorna o bug do winCodeSign no Windows (signAndEditExecutable:false) e
// aplica o icone/metadados no executavel com o rcedit (tools/rcedit.exe).
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(homedir(), "NexusClean-App", "installer");
const unpacked = join(outDir, "win-unpacked", "NexusClean.exe");
const rcedit = join(root, "tools", "rcedit.exe");
const ico = join(root, "build", "app.ico");

const env = { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: "false" };
function run(cmd, args) {
  console.log(`\n> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit", cwd: root, shell: true, env });
}

// 1) build (backend + react + electron) e empacota so a pasta (win-unpacked)
run("npm", ["run", "build"]);
run("npx", ["electron-builder", "--win", "--dir"]);

// 2) aplica icone + metadados no executavel interno (o electron-builder pulou isso)
if (existsSync(rcedit) && existsSync(ico) && existsSync(unpacked)) {
  run(rcedit, [`"${unpacked}"`, "--set-icon", `"${ico}"`]);
  run(rcedit, [`"${unpacked}"`, "--set-version-string", "ProductName", "NexusClean",
    "--set-version-string", "CompanyName", `"Daniel Santos Ciriaco"`,
    "--set-version-string", "FileDescription", `"NexusClean - Otimizador do Windows"`]);
} else {
  console.warn("Aviso: rcedit ou icone nao encontrados; executavel ficara com o icone padrao.");
}

// 3) gera o instalador NSIS a partir da pasta ja corrigida
run("npx", ["electron-builder", "--win", "nsis", "--prepackaged", `"${join(outDir, "win-unpacked")}"`]);

console.log(`\n✅ Instalador pronto em: ${join(outDir, "NexusClean-Setup-1.0.0.exe")}`);
