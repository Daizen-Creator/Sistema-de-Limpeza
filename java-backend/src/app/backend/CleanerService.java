package app.backend;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Limpeza de arquivos temporarios.
 *
 * Principio de seguranca: SO removemos locais conhecidamente descartaveis
 * (pastas Temp, cache do Windows Update, lixeira). Nunca tocamos em
 * arquivos de programa, documentos do usuario ou pastas do sistema.
 * Arquivos em uso/bloqueados sao simplesmente ignorados.
 */
public class CleanerService {

    /** Definicao de um alvo de limpeza. */
    static class Target {
        final String id, label, description;
        final boolean requiresAdmin;
        final Runnable nothing = () -> {};
        Target(String id, String label, String description, boolean requiresAdmin) {
            this.id = id; this.label = label; this.description = description;
            this.requiresAdmin = requiresAdmin;
        }
    }

    private final List<Target> targets = new ArrayList<>();

    public CleanerService() {
        targets.add(new Target("temp_user",
                "Arquivos temporarios do usuario",
                "Pasta %TEMP% da sua conta.", false));
        targets.add(new Target("temp_windows",
                "Arquivos temporarios do Windows",
                "Pasta C:\\Windows\\Temp.", true));
        targets.add(new Target("recycle_bin",
                "Lixeira",
                "Esvazia a Lixeira do Windows.", false));
        targets.add(new Target("windows_update_cache",
                "Cache do Windows Update",
                "Instaladores ja aplicados em SoftwareDistribution\\Download.", true));
        targets.add(new Target("delivery_optimization",
                "Cache de Otimizacao de Entrega",
                "Arquivos de distribuicao de updates ja usados.", true));
    }

    private String userTemp() {
        String t = System.getenv("TEMP");
        if (t == null || t.isBlank()) t = System.getProperty("java.io.tmpdir");
        return t;
    }

    private String winDir() {
        String w = System.getenv("SystemRoot");
        return (w == null || w.isBlank()) ? "C:\\Windows" : w;
    }

    /** Analisa quanto espaco cada alvo ocupa. */
    public String scan() {
        List<Object> items = new ArrayList<>();
        for (Target t : targets) {
            long size;
            switch (t.id) {
                case "temp_user":            size = dirSize(new File(userTemp())); break;
                case "temp_windows":         size = dirSize(new File(winDir(), "Temp")); break;
                case "windows_update_cache": size = dirSize(new File(winDir(), "SoftwareDistribution\\Download")); break;
                case "delivery_optimization":size = dirSize(new File(winDir(), "SoftwareDistribution\\DeliveryOptimization")); break;
                case "recycle_bin":          size = recycleBinSize(); break;
                default:                     size = 0;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", t.id);
            m.put("label", t.label);
            m.put("description", t.description);
            m.put("requiresAdmin", t.requiresAdmin);
            m.put("bytes", size);
            items.add(m);
        }
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("items", items);
        return Json.obj(root);
    }

    /** Executa a limpeza dos ids selecionados. */
    public String clean(List<String> ids) {
        long freed = 0;
        List<Object> results = new ArrayList<>();
        for (String id : ids) {
            long before = 0, after = 0;
            String note = "ok";
            try {
                switch (id) {
                    case "temp_user": {
                        File d = new File(userTemp());
                        before = dirSize(d); deleteContents(d); after = dirSize(d);
                        break;
                    }
                    case "temp_windows": {
                        File d = new File(winDir(), "Temp");
                        before = dirSize(d); deleteContents(d); after = dirSize(d);
                        break;
                    }
                    case "windows_update_cache": {
                        before = dirSize(new File(winDir(), "SoftwareDistribution\\Download"));
                        Proc.Result r = Proc.powershell(
                            "Stop-Service -Name wuauserv -Force -ErrorAction SilentlyContinue; " +
                            "Remove-Item -Path \"$env:SystemRoot\\SoftwareDistribution\\Download\\*\" " +
                            "-Recurse -Force -ErrorAction SilentlyContinue; " +
                            "Start-Service -Name wuauserv -ErrorAction SilentlyContinue", 120);
                        after = dirSize(new File(winDir(), "SoftwareDistribution\\Download"));
                        if (!r.ok()) note = "parcial (precisa de administrador)";
                        break;
                    }
                    case "delivery_optimization": {
                        File d = new File(winDir(), "SoftwareDistribution\\DeliveryOptimization");
                        before = dirSize(d); deleteContents(d); after = dirSize(d);
                        break;
                    }
                    case "recycle_bin": {
                        before = recycleBinSize();
                        Proc.powershell("Clear-RecycleBin -Force -ErrorAction SilentlyContinue", 60);
                        after = recycleBinSize();
                        break;
                    }
                    default:
                        note = "id desconhecido";
                }
            } catch (Exception e) {
                note = "erro: " + e.getMessage();
            }
            long delta = Math.max(0, before - after);
            freed += delta;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("freedBytes", delta);
            m.put("note", note);
            results.add(m);
        }
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("totalFreedBytes", freed);
        root.put("results", results);
        return Json.obj(root);
    }

    // ----- utilidades de sistema de arquivos -----

    private long dirSize(File dir) {
        if (dir == null || !dir.exists() || !dir.isDirectory()) return 0;
        long total = 0;
        File[] children = dir.listFiles();
        if (children == null) return 0;
        for (File f : children) {
            try {
                if (Files.isSymbolicLink(f.toPath())) continue; // nao segue links
                if (f.isDirectory()) total += dirSize(f);
                else total += f.length();
            } catch (Exception ignored) {}
        }
        return total;
    }

    /** Apaga o CONTEUDO da pasta (nao a pasta em si). Ignora bloqueados. */
    private void deleteContents(File dir) {
        if (dir == null || !dir.isDirectory()) return;
        File[] children = dir.listFiles();
        if (children == null) return;
        for (File f : children) {
            deleteRecursive(f);
        }
    }

    private void deleteRecursive(File f) {
        try {
            Path p = f.toPath();
            if (Files.isSymbolicLink(p)) { f.delete(); return; }
            if (f.isDirectory()) {
                File[] children = f.listFiles();
                if (children != null) for (File c : children) deleteRecursive(c);
            }
            f.delete(); // best-effort; arquivos em uso permanecem
        } catch (Exception ignored) {}
    }

    private long recycleBinSize() {
        try {
            Proc.Result r = Proc.powershell(
                "$s=(New-Object -ComObject Shell.Application).NameSpace(0x0a); " +
                "$sum=0; if($s){ foreach($i in $s.Items()){ $sum += $i.Size } }; $sum", 30);
            String out = r.out.trim();
            if (out.isEmpty()) return 0;
            return Long.parseLong(out.split("\\R")[0].trim());
        } catch (Exception e) {
            return 0;
        }
    }
}
