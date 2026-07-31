package app.backend;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Analise de disco (modulo 14):
 *  - roots():      unidades e pastas rapidas
 *  - tree(path):   tamanho das subpastas/arquivos (analisador de espaco / treemap)
 *  - large(path):  arquivos grandes (>= 1 GB)
 *  - duplicates(): arquivos duplicados por hash
 *  - smart():      saude dos discos (SMART / vida util do SSD)
 *
 * Tudo somente leitura. Nunca apaga nada.
 */
public class DiskService {

    private static final long GB = 1024L * 1024 * 1024;
    private static final long HASH_MAX = 150L * 1024 * 1024; // nao faz hash de arquivos > 150MB

    /** Unidades de disco e pastas de atalho para analisar. */
    public String roots() {
        List<Object> drives = new ArrayList<>();
        for (File r : File.listRoots()) {
            long total = r.getTotalSpace();
            if (total <= 0) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", r.getAbsolutePath());
            m.put("totalBytes", total);
            m.put("freeBytes", r.getUsableSpace());
            drives.add(m);
        }
        List<Object> folders = new ArrayList<>();
        String home = System.getProperty("user.home");
        addFolder(folders, "Usuario", home);
        addFolder(folders, "Downloads", home + "\\Downloads");
        addFolder(folders, "Documentos", home + "\\Documents");
        addFolder(folders, "Area de Trabalho", home + "\\Desktop");
        addFolder(folders, "Imagens", home + "\\Pictures");
        addFolder(folders, "Videos", home + "\\Videos");

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("drives", drives);
        root.put("folders", folders);
        return Json.obj(root);
    }

    private void addFolder(List<Object> list, String label, String path) {
        File f = new File(path);
        if (f.isDirectory()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("label", label);
            m.put("path", f.getAbsolutePath());
            list.add(m);
        }
    }

    /** Tamanho das subpastas e arquivos diretos de 'path' (analisador de espaco). */
    public String tree(String path) {
        File dir = new File(path);
        if (!dir.isDirectory()) return errObj("caminho invalido");

        long deadline = System.currentTimeMillis() + 60_000; // 60s de orcamento
        boolean[] truncated = { false };

        File[] children = dir.listFiles();
        List<Object> items = new ArrayList<>();
        long total = 0;
        if (children != null) {
            for (File c : children) {
                if (System.currentTimeMillis() > deadline) { truncated[0] = true; break; }
                long size;
                boolean isDir = c.isDirectory();
                try {
                    if (Files.isSymbolicLink(c.toPath())) continue;
                    size = isDir ? dirSize(c, deadline, truncated) : c.length();
                } catch (Exception e) { size = 0; }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("name", c.getName());
                m.put("path", c.getAbsolutePath());
                m.put("bytes", size);
                m.put("isDir", isDir);
                items.add(m);
                total += size;
            }
        }
        items.sort((a, b) -> Long.compare(
            (long) ((Map<?, ?>) b).get("bytes"), (long) ((Map<?, ?>) a).get("bytes")));
        if (items.size() > 80) items = items.subList(0, 80);

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("path", dir.getAbsolutePath());
        File parent = dir.getParentFile();
        root.put("parent", parent != null ? parent.getAbsolutePath() : null);
        root.put("totalBytes", total);
        root.put("truncated", truncated[0]);
        root.put("items", items);
        return Json.obj(root);
    }

    /** Arquivos grandes (>= 1 GB) sob 'path'. */
    public String large(String path) {
        File dir = new File(path);
        if (!dir.isDirectory()) return errObj("caminho invalido");
        long deadline = System.currentTimeMillis() + 60_000;
        List<Object> files = new ArrayList<>();
        collectLarge(dir, GB, files, deadline);
        files.sort((a, b) -> Long.compare(
            (long) ((Map<?, ?>) b).get("bytes"), (long) ((Map<?, ?>) a).get("bytes")));
        if (files.size() > 100) files = files.subList(0, 100);
        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("items", files);
        return Json.obj(root);
    }

    private void collectLarge(File dir, long min, List<Object> out, long deadline) {
        if (System.currentTimeMillis() > deadline || out.size() >= 300) return;
        File[] ch = dir.listFiles();
        if (ch == null) return;
        for (File f : ch) {
            try {
                if (Files.isSymbolicLink(f.toPath())) continue;
                if (f.isDirectory()) collectLarge(f, min, out, deadline);
                else if (f.length() >= min) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", f.getName());
                    m.put("path", f.getAbsolutePath());
                    m.put("bytes", f.length());
                    out.add(m);
                }
            } catch (Exception ignored) {}
        }
    }

    /** Arquivos duplicados por hash (agrupa por tamanho, depois compara MD5). */
    public String duplicates(String path) {
        File dir = new File(path);
        if (!dir.isDirectory()) return errObj("caminho invalido");
        long deadline = System.currentTimeMillis() + 90_000;

        Map<Long, List<File>> bySize = new LinkedHashMap<>();
        collectBySize(dir, bySize, deadline, new int[]{0});

        List<Object> groups = new ArrayList<>();
        long wasted = 0;
        for (Map.Entry<Long, List<File>> e : bySize.entrySet()) {
            if (System.currentTimeMillis() > deadline) break;
            long size = e.getKey();
            if (size <= 0 || e.getValue().size() < 2 || size > HASH_MAX) continue;
            Map<String, List<File>> byHash = new LinkedHashMap<>();
            for (File f : e.getValue()) {
                String h = md5(f);
                if (h == null) continue;
                byHash.computeIfAbsent(h, k -> new ArrayList<>()).add(f);
            }
            for (List<File> dup : byHash.values()) {
                if (dup.size() < 2) continue;
                List<Object> paths = new ArrayList<>();
                for (File f : dup) paths.add(f.getAbsolutePath());
                Map<String, Object> g = new LinkedHashMap<>();
                g.put("bytes", size);
                g.put("count", dup.size());
                g.put("files", paths);
                groups.add(g);
                wasted += size * (dup.size() - 1);
                if (groups.size() >= 80) break;
            }
            if (groups.size() >= 80) break;
        }
        groups.sort((a, b) -> Long.compare(
            (long) ((Map<?, ?>) b).get("bytes") * ((int) ((Map<?, ?>) b).get("count") - 1),
            (long) ((Map<?, ?>) a).get("bytes") * ((int) ((Map<?, ?>) a).get("count") - 1)));

        Map<String, Object> root = new LinkedHashMap<>();
        root.put("ok", true);
        root.put("wastedBytes", wasted);
        root.put("groups", groups);
        return Json.obj(root);
    }

    private void collectBySize(File dir, Map<Long, List<File>> map, long deadline, int[] count) {
        if (System.currentTimeMillis() > deadline || count[0] > 60000) return;
        File[] ch = dir.listFiles();
        if (ch == null) return;
        for (File f : ch) {
            try {
                if (Files.isSymbolicLink(f.toPath())) continue;
                if (f.isDirectory()) collectBySize(f, map, deadline, count);
                else if (f.length() > 0) {
                    map.computeIfAbsent(f.length(), k -> new ArrayList<>()).add(f);
                    count[0]++;
                }
            } catch (Exception ignored) {}
        }
    }

    private String md5(File f) {
        try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(f))) {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) != -1) md.update(buf, 0, n);
            byte[] d = md.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : d) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    /** Saude dos discos (SMART / vida util do SSD). */
    public String smart() {
        String ps =
            "$disks = Get-PhysicalDisk -ErrorAction SilentlyContinue | ForEach-Object {" +
            "  $rc = $_ | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue;" +
            "  [pscustomobject]@{" +
            "    name=$_.FriendlyName; media=[string]$_.MediaType; health=[string]$_.HealthStatus;" +
            "    sizeBytes=[int64]$_.Size;" +
            "    wear= if($rc -and $rc.Wear -ne $null){ [int]$rc.Wear } else { -1 };" +
            "    tempC= if($rc -and $rc.Temperature -ne $null){ [int]$rc.Temperature } else { -1 };" +
            "    powerOnHours= if($rc -and $rc.PowerOnHours -ne $null){ [int]$rc.PowerOnHours } else { -1 }" +
            "  } };" +
            "if($disks){ ConvertTo-Json -Depth 3 -Compress -InputObject @($disks) } else { '[]' }";
        Proc.Result r = Proc.powershell(ps, 40);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (out.startsWith("{")) out = "[" + out + "]";
        if (!out.startsWith("[")) out = "[]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    // ----- util -----

    private long dirSize(File dir, long deadline, boolean[] truncated) {
        if (System.currentTimeMillis() > deadline) { truncated[0] = true; return 0; }
        File[] ch = dir.listFiles();
        if (ch == null) return 0;
        long total = 0;
        for (File f : ch) {
            try {
                if (Files.isSymbolicLink(f.toPath())) continue;
                total += f.isDirectory() ? dirSize(f, deadline, truncated) : f.length();
            } catch (Exception ignored) {}
        }
        return total;
    }

    private String errObj(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("message", msg);
        return Json.obj(m);
    }
}
