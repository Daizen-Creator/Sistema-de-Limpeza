package app.backend;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Central de seguranca (modulo 6):
 *  - Telemetria do Windows (ligar/desligar)
 *  - Status e controle do Firewall por perfil
 *  - Servicos gerenciaveis (lista curada + parar/iniciar/desabilitar)
 *  - Inicializacao (lista somente leitura)
 *
 * Seguranca: o controle de servicos so age sobre uma LISTA BRANCA curada,
 * para nunca mexer em servicos criticos do sistema.
 */
public class SecurityService {

    /** Servicos que o app permite gerenciar (nao-criticos). */
    private static final List<String> ALLOWED = Arrays.asList(
        "DiagTrack", "dmwappushservice", "SysMain", "WSearch", "Fax",
        "XblAuthManager", "XblGameSave", "XboxNetApiSvc", "XboxGipSvc",
        "MapsBroker", "RetailDemo", "WMPNetworkSvc", "RemoteRegistry"
    );

    /** Visao geral: telemetria + firewall. */
    public String status() {
        String ps =
            "$diag = (Get-Service DiagTrack -ErrorAction SilentlyContinue).Status;" +
            "$telemetryOn = ($diag -eq 'Running');" +
            "$fw = Get-NetFirewallProfile -ErrorAction SilentlyContinue | " +
            "  Select-Object @{n='name';e={$_.Name}}, @{n='enabled';e={[bool]$_.Enabled}};" +
            "$obj = [pscustomobject]@{ telemetryOn=$telemetryOn; firewall=@($fw) };" +
            "$obj | ConvertTo-Json -Depth 4 -Compress";
        return wrap(ps, 25);
    }

    public String setTelemetry(boolean on) {
        String ps = on
            ? "Set-Service DiagTrack -StartupType Automatic -ErrorAction SilentlyContinue;" +
              "Start-Service DiagTrack -ErrorAction SilentlyContinue; 'ok'"
            : "Stop-Service DiagTrack -Force -ErrorAction SilentlyContinue;" +
              "Set-Service DiagTrack -StartupType Disabled -ErrorAction SilentlyContinue;" +
              "Stop-Service dmwappushservice -Force -ErrorAction SilentlyContinue;" +
              "Set-Service dmwappushservice -StartupType Disabled -ErrorAction SilentlyContinue;" +
              "New-Item -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Force | Out-Null;" +
              "Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection' -Name AllowTelemetry -Value 0 -Type DWord -ErrorAction SilentlyContinue; 'ok'";
        return okMsg(Proc.powershell(ps, 30),
            on ? "Telemetria reativada." : "Telemetria desativada.");
    }

    public String firewallSet(String profile, boolean on) {
        String p = profile == null ? "" : profile.replaceAll("[^A-Za-z]", "");
        if (!(p.equals("Domain") || p.equals("Private") || p.equals("Public"))) return err("perfil invalido");
        String ps = "Set-NetFirewallProfile -Profile " + p + " -Enabled " + (on ? "True" : "False") +
                    " -ErrorAction SilentlyContinue; 'ok'";
        return okMsg(Proc.powershell(ps, 20), "Firewall " + p + (on ? " ativado." : " desativado."));
    }

    /** Lista curada de servicos com status atual. */
    public String servicesList() {
        String names = "'" + String.join("','", ALLOWED) + "'";
        String ps =
            "$want = @(" + names + ");" +
            "$list = foreach($n in $want){ $s = Get-Service -Name $n -ErrorAction SilentlyContinue; if($s){ " +
            "  [pscustomobject]@{ name=$s.Name; display=$s.DisplayName; status=[string]$s.Status; startup=[string]$s.StartType } } };" +
            "if($list){ ConvertTo-Json -Depth 3 -Compress -InputObject @($list) } else { '[]' }";
        return wrapArray(ps, 25);
    }

    public String serviceSet(String name, String action) {
        if (!ALLOWED.contains(name)) return err("servico nao permitido");
        String ps;
        switch (action) {
            case "stop":    ps = "Stop-Service -Name '" + name + "' -Force -ErrorAction SilentlyContinue; 'ok'"; break;
            case "start":   ps = "Start-Service -Name '" + name + "' -ErrorAction SilentlyContinue; 'ok'"; break;
            case "disable": ps = "Stop-Service -Name '" + name + "' -Force -ErrorAction SilentlyContinue;" +
                                 "Set-Service -Name '" + name + "' -StartupType Disabled -ErrorAction SilentlyContinue; 'ok'"; break;
            case "manual":  ps = "Set-Service -Name '" + name + "' -StartupType Manual -ErrorAction SilentlyContinue; 'ok'"; break;
            case "auto":    ps = "Set-Service -Name '" + name + "' -StartupType Automatic -ErrorAction SilentlyContinue;" +
                                 "Start-Service -Name '" + name + "' -ErrorAction SilentlyContinue; 'ok'"; break;
            default: return err("acao invalida");
        }
        return okMsg(Proc.powershell(ps, 25), "Servico '" + name + "' -> " + action);
    }

    /** Programas de inicializacao (somente leitura). */
    public String startupList() {
        String ps =
            "$list = Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | " +
            "  Select-Object @{n='name';e={$_.Name}}, @{n='command';e={$_.Command}}, " +
            "    @{n='location';e={$_.Location}}, @{n='user';e={$_.User}};" +
            "if($list){ ConvertTo-Json -Depth 3 -Compress -InputObject @($list) } else { '[]' }";
        return wrapArray(ps, 25);
    }

    // ----- util -----

    private String err(String m) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("ok", false); x.put("message", m);
        return Json.obj(x);
    }

    private String okMsg(Proc.Result r, String msg) {
        boolean ok = r.out.trim().endsWith("ok") || r.ok();
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("ok", ok);
        x.put("message", ok ? msg : (r.err.isEmpty() ? "falha (requer administrador?)" : r.err.trim()));
        return Json.obj(x);
    }

    private String wrap(String ps, int t) {
        Proc.Result r = Proc.powershell(ps, t);
        String out = r.out.trim();
        if (out.isEmpty() || !out.startsWith("{")) return "{\"ok\":false,\"message\":\"sem dados\"}";
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    private String wrapArray(String ps, int t) {
        Proc.Result r = Proc.powershell(ps, t);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (out.startsWith("{")) out = "[" + out + "]";
        if (!out.startsWith("[")) out = "[]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }
}
