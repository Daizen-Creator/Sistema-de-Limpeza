package app.backend;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Terminal integrado (modulo 20.2): executa comandos PowerShell do proprio
 * usuario, localmente. Usa -EncodedCommand (base64 UTF-16LE) para aceitar
 * qualquer comando (aspas, pipes, etc.) sem problemas de escape.
 */
public class TermService {

    private static final int MAX_OUT = 24000;

    public String run(String command) {
        if (command == null || command.isBlank()) return err("comando vazio");
        // - suprime o stream de progresso (evita lixo CLIXML no stderr)
        // - forca saida UTF-8 (acentos)
        // - roda o comando num bloco, mescla erros (2>&1) e formata como texto
        String script =
            "$ProgressPreference='SilentlyContinue';\n" +
            "$OutputEncoding=[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;\n" +
            "& {\n" + command + "\n} 2>&1 | Out-String";
        String b64 = Base64.getEncoder().encodeToString(script.getBytes(StandardCharsets.UTF_16LE));

        Proc.Result r = Proc.run(60,
            "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-EncodedCommand", b64);

        StringBuilder out = new StringBuilder(r.out);
        if (!r.err.isBlank()) {
            if (out.length() > 0) out.append("\n");
            out.append(r.err);
        }
        String text = out.toString();
        boolean truncated = text.length() > MAX_OUT;
        if (truncated) text = text.substring(0, MAX_OUT) + "\n... (saida truncada)";

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("code", r.code);
        m.put("output", text.isBlank() ? "(sem saida)" : text);
        return Json.obj(m);
    }

    private String err(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("message", msg);
        return Json.obj(m);
    }
}
