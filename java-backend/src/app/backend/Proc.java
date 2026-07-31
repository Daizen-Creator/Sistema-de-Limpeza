package app.backend;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Execucao segura de processos externos.
 *
 * Regras de seguranca:
 *  - Sempre executamos binarios do sistema por caminho/nome fixo (powershell, pnputil, cmd).
 *  - Argumentos sao passados como lista (nunca concatenacao de string em shell),
 *    evitando injecao de comando.
 *  - Ha timeout para nao travar o app.
 */
public final class Proc {

    private Proc() {}

    public static class Result {
        public final int code;
        public final String out;
        public final String err;
        public Result(int code, String out, String err) {
            this.code = code; this.out = out; this.err = err;
        }
        public boolean ok() { return code == 0; }
    }

    /** Executa um comando do PowerShell de forma nao-interativa.
     *  Forca a saida em UTF-8 para os acentos nao virarem lixo ao ler no Java. */
    public static Result powershell(String script, int timeoutSeconds) {
        String utf8 = "$OutputEncoding=[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ";
        return run(timeoutSeconds,
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy", "Bypass",
                "-Command", utf8 + script);
    }

    public static Result run(int timeoutSeconds, String... command) {
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(false);
            Process p = pb.start();

            StringBuilder out = new StringBuilder();
            StringBuilder err = new StringBuilder();
            Thread tOut = pump(p.getInputStream(), out);
            Thread tErr = pump(p.getErrorStream(), err);

            boolean finished = p.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                p.destroyForcibly();
                return new Result(-1, out.toString(), "Tempo limite excedido.");
            }
            tOut.join(2000);
            tErr.join(2000);
            return new Result(p.exitValue(), out.toString(), err.toString());
        } catch (Exception e) {
            return new Result(-1, "", "Falha ao executar: " + e.getMessage());
        }
    }

    private static Thread pump(java.io.InputStream in, StringBuilder sink) {
        Thread t = new Thread(() -> {
            try (BufferedReader r = new BufferedReader(
                    new InputStreamReader(in, StandardCharsets.UTF_8))) {
                String line;
                while ((line = r.readLine()) != null) {
                    sink.append(line).append('\n');
                }
            } catch (Exception ignored) {}
        });
        t.setDaemon(true);
        t.start();
        return t;
    }

    public static List<String> lines(String s) {
        List<String> list = new ArrayList<>();
        if (s == null) return list;
        for (String l : s.split("\\R")) {
            if (!l.trim().isEmpty()) list.add(l.trim());
        }
        return list;
    }
}
