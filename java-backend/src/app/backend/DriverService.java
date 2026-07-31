package app.backend;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Atualizacao de drivers com seguranca baseada em certificado.
 *
 * PONTO CENTRAL DE SEGURANCA:
 *  - NAO baixamos drivers de sites de terceiros.
 *  - Toda atualizacao passa pelo Windows Update Agent (COM Microsoft.Update.Session),
 *    que so oferece drivers assinados digitalmente e validados (WHQL) pela Microsoft.
 *    A verificacao de assinatura/certificado e feita pelo proprio Windows.
 *  - Instalacao exige privilegios de administrador.
 */
public class DriverService {

    /** Lista os drivers instalados e seu status de assinatura. */
    public String listInstalled() {
        String ps =
            "$d = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue | " +
            "  Where-Object { $_.DeviceName } | " +
            "  Select-Object @{n='deviceName';e={$_.DeviceName}}, " +
            "    @{n='manufacturer';e={$_.Manufacturer}}, " +
            "    @{n='deviceClass';e={$_.DeviceClass}}, " +
            "    @{n='driverVersion';e={$_.DriverVersion}}, " +
            "    @{n='isSigned';e={[bool]$_.IsSigned}}, " +
            "    @{n='driverDate';e={ if($_.DriverDate){ $_.DriverDate.ToString('yyyy-MM-dd') } else { '' } }} | " +
            "  Sort-Object deviceName -Unique; " +
            "if(-not $d){ '[]' } else { @($d) | ConvertTo-Json -Depth 3 -Compress }";
        return rawArray(ps, 60);
    }

    /** Procura atualizacoes de driver disponiveis no catalogo da Microsoft. */
    public String scanUpdates() {
        String ps =
            "try {" +
            "  $s = New-Object -ComObject Microsoft.Update.Session;" +
            "  $se = $s.CreateUpdateSearcher();" +
            "  $r = $se.Search(\"IsInstalled=0 and Type='Driver'\");" +
            "  $list = @();" +
            "  foreach($u in $r.Updates){" +
            "    $list += [pscustomobject]@{" +
            "      title=$u.Title;" +
            "      manufacturer=$u.DriverManufacturer;" +
            "      model=$u.DriverModel;" +
            "      driverClass=$u.DriverClass;" +
            "      driverDate= if($u.DriverVerDate){ $u.DriverVerDate.ToString('yyyy-MM-dd') } else { '' };" +
            "      sizeBytes=[int64]$u.MaxDownloadSize;" +
            "      signed=$true" +
            "    }" +
            "  };" +
            "  if($list.Count -eq 0){ '[]' } else { ,$list | ConvertTo-Json -Depth 3 -Compress }" +
            "} catch { '[]' }";
        return rawArray(ps, 180);
    }

    /**
     * Instala atualizacoes de driver. Se 'titles' vazio, instala todas as encontradas.
     * Exige administrador.
     */
    public String installUpdates(List<String> titles) {
        if (!isElevated()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ok", false);
            m.put("needsAdmin", true);
            m.put("message", "A instalacao de drivers exige executar o aplicativo como Administrador.");
            return Json.obj(m);
        }

        String filter;
        if (titles == null || titles.isEmpty()) {
            filter = "$true";
        } else {
            filter = "$wanted -contains $u.Title";
        }
        String wantedArray = psStringArray(titles);

        String ps =
            "$wanted = " + wantedArray + ";" +
            "try {" +
            "  $s = New-Object -ComObject Microsoft.Update.Session;" +
            "  $se = $s.CreateUpdateSearcher();" +
            "  $r = $se.Search(\"IsInstalled=0 and Type='Driver'\");" +
            "  $coll = New-Object -ComObject Microsoft.Update.UpdateColl;" +
            "  foreach($u in $r.Updates){ if(" + filter + "){ if($u.EulaAccepted -eq $false){ $u.AcceptEula() }; [void]$coll.Add($u) } };" +
            "  if($coll.Count -eq 0){ '{\"ok\":true,\"installed\":0,\"rebootRequired\":false,\"message\":\"Nenhuma atualizacao selecionada.\"}'; return };" +
            "  $dl = $s.CreateUpdateDownloader(); $dl.Updates = $coll; [void]$dl.Download();" +
            "  $inst = $s.CreateUpdateInstaller(); $inst.Updates = $coll; $res = $inst.Install();" +
            "  $obj = [pscustomobject]@{ ok=$true; installed=$coll.Count; resultCode=[int]$res.ResultCode; rebootRequired=[bool]$res.RebootRequired; message='Concluido pelo Windows Update.' };" +
            "  $obj | ConvertTo-Json -Compress" +
            "} catch {" +
            "  '{\"ok\":false,\"message\":\"Falha na instalacao via Windows Update.\"}'" +
            "}";
        Proc.Result r = Proc.powershell(ps, 900);
        String out = r.out.trim();
        if (out.isEmpty() || !out.startsWith("{")) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ok", false);
            m.put("message", "Falha ao instalar. " + (r.err.isEmpty() ? "" : r.err.trim()));
            return Json.obj(m);
        }
        return out;
    }

    // ----- util -----

    public boolean isElevated() {
        Proc.Result r = Proc.powershell(
            "$id=[Security.Principal.WindowsIdentity]::GetCurrent();" +
            "$p=New-Object Security.Principal.WindowsPrincipal($id);" +
            "if($p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){'1'}else{'0'}", 20);
        return r.out.trim().startsWith("1");
    }

    private String psStringArray(List<String> items) {
        if (items == null || items.isEmpty()) return "@()";
        StringBuilder b = new StringBuilder("@(");
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) b.append(',');
            b.append('\'').append(items.get(i).replace("'", "''")).append('\'');
        }
        return b.append(')').toString();
    }

    /** Executa PS que emite um array JSON e o embute em um envelope. */
    private String rawArray(String ps, int timeout) {
        Proc.Result r = Proc.powershell(ps, timeout);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (!(out.startsWith("[") || out.startsWith("{"))) {
            // PowerShell emite objeto unico sem colchetes quando ha 1 item
            out = "[" + out + "]";
        }
        // objeto unico -> array
        if (out.startsWith("{")) out = "[" + out + "]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }
}
