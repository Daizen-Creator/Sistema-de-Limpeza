package app.backend;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Boot Manager (modulo 11): gerencia os programas que iniciam com o Windows.
 *  - listStartup(): itens do registro (Run) e das pastas de Inicializacao,
 *    com status ativado/desativado e impacto estimado no boot.
 *  - setStartup(): ativa/desativa de forma reversivel usando as chaves
 *    "StartupApproved" (mesma tecnica do Gerenciador de Tarefas do Windows).
 *
 * Itens de usuario (HKCU) funcionam sem admin; itens de sistema (HKLM) exigem admin.
 */
public class BootService {

    public String listStartup() {
        String ps =
            "function Imp($n,$c){ $s=($n + ' ' + $c).ToLower();" +
            "  if($s -match 'teams|docker|adobe|creative cloud|epicgames|epic games|steam|discord|spotify|dropbox|onedrive|skype'){return 'Alto'};" +
            "  if($s -match 'nvidia|razer|msi|corsair|logitech|realtek|java|icloud|googleupdate|google update|update'){return 'Medio'};" +
            "  return 'Baixo' };" +
            "function Enabled($key,$name){ $ap=Get-ItemProperty -Path $key -Name $name -ErrorAction SilentlyContinue;" +
            "  if($ap){ $b=$ap.$name; if($b -and $b[0] -ne 2){ return $false } }; return $true };" +
            "$items=@();" +
            "$runs=@(" +
            " @{P='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';S='usuario';A='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'}," +
            " @{P='HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run';S='sistema';A='HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run'});" +
            "foreach($r in $runs){ $p=Get-ItemProperty -Path $r.P -ErrorAction SilentlyContinue; if($p){" +
            "  $p.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object {" +
            "    $items+=[pscustomobject]@{ name=$_.Name; command=[string]$_.Value; scope=$r.S; kind='registry';" +
            "      enabled=(Enabled $r.A $_.Name); impact=(Imp $_.Name $_.Value) } } } };" +
            "$folders=@(" +
            " @{P=[Environment]::GetFolderPath('Startup');S='usuario';A='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'}," +
            " @{P=[Environment]::GetFolderPath('CommonStartup');S='sistema';A='HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder'});" +
            "foreach($f in $folders){ Get-ChildItem $f.P -Filter *.lnk -ErrorAction SilentlyContinue | ForEach-Object {" +
            "  $items+=[pscustomobject]@{ name=$_.Name; command=$_.FullName; scope=$f.S; kind='folder';" +
            "    enabled=(Enabled $f.A $_.Name); impact=(Imp $_.Name $_.FullName) } } };" +
            "if($items){ ConvertTo-Json -Depth 3 -Compress -InputObject @($items) } else { '[]' }";
        Proc.Result r = Proc.powershell(ps, 40);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (out.startsWith("{")) out = "[" + out + "]";
        if (!out.startsWith("[")) out = "[]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    /** Ativa/desativa um item de inicializacao (reversivel via StartupApproved). */
    public String setStartup(String name, String kind, String scope, boolean enable) {
        if (name == null || name.isBlank()) return err("nome invalido");
        boolean folder = "folder".equals(kind);
        boolean reg = "registry".equals(kind);
        if (!folder && !reg) return err("tipo invalido");
        boolean sys = "sistema".equals(scope);
        boolean usr = "usuario".equals(scope);
        if (!sys && !usr) return err("escopo invalido");

        String hive = sys ? "HKLM:\\SOFTWARE" : "HKCU:\\Software";
        String leaf = folder ? "StartupFolder" : "Run";
        String key = hive + "\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\" + leaf;
        String safe = name.replace("'", "''");
        String bytes = enable
            ? "[byte[]](2,0,0,0,0,0,0,0,0,0,0,0)"
            : "[byte[]](3,0,0,0,0,0,0,0,0,0,0,0)";

        String ps =
            "try { New-Item -Path '" + key + "' -Force | Out-Null;" +
            " Set-ItemProperty -Path '" + key + "' -Name '" + safe + "' -Value " + bytes + " -Type Binary -ErrorAction Stop; 'ok' }" +
            " catch { $_.Exception.Message }";
        Proc.Result r = Proc.powershell(ps, 20);
        boolean ok = r.out.trim().endsWith("ok");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", ok);
        m.put("message", ok
            ? (enable ? "Ativado na inicializacao." : "Desativado da inicializacao.")
            : (sys ? "Falha (item de sistema exige administrador)." : r.out.trim()));
        return Json.obj(m);
    }

    private String err(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("message", msg);
        return Json.obj(m);
    }
}
