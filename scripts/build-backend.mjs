// Compila o backend Java (JDK puro, sem Maven) e gera build/backend.jar
import { execFileSync } from "node:child_process";
import { readdirSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "java-backend", "src", "app", "backend");
const outDir = join(root, "java-backend", "out");
const buildDir = join(root, "build");
const jar = join(buildDir, "backend.jar");

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { stdio: "inherit" });
}

try {
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  mkdirSync(buildDir, { recursive: true });

  const sources = readdirSync(srcDir)
    .filter((f) => f.endsWith(".java"))
    .map((f) => join(srcDir, f));

  run("javac", ["-encoding", "UTF-8", "-d", outDir, ...sources]);
  run("jar", ["--create", "--file", jar, "--main-class", "app.backend.Backend", "-C", outDir, "."]);

  console.log("\n✅ Backend compilado em build/backend.jar");
} catch (err) {
  console.error("\n❌ Falha ao compilar o backend Java.");
  console.error("   Verifique se o JDK (java/javac) esta instalado e no PATH.");
  console.error(err.message);
  process.exit(1);
}
