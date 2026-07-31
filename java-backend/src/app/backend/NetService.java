package app.backend;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Rede avancada (modulo 9):
 *  - processes(): apps com atividade de rede (conexoes TCP ativas por processo)
 *  - ping(host, count): teste de ping continuo com perda de pacotes
 *
 * Obs: Windows nao expoe largura de banda exata por processo sem ETW, entao
 * mostramos a atividade por numero de conexoes (honesto e util).
 */
public class NetService {

    /** Apps com conexoes de rede ativas, ordenados por numero de conexoes. */
    public String processes() {
        String ps =
            "$conns = Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue;" +
            "$grp = $conns | Group-Object OwningProcess | ForEach-Object {" +
            "  $procId=$_.Name;" +
            "  $pname=(Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName;" +
            "  $remotes=($_.Group | Select-Object -First 3 | ForEach-Object { $_.RemoteAddress + ':' + $_.RemotePort }) -join ', ';" +
            "  [pscustomobject]@{ pid=[int]$procId; name=$pname; connections=$_.Count; remotes=$remotes }" +
            "} | Where-Object { $_.name } | Sort-Object connections -Descending | Select-Object -First 30;" +
            "if($grp){ ConvertTo-Json -Depth 3 -Compress -InputObject @($grp) } else { '[]' }";
        Proc.Result r = Proc.powershell(ps, 30);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (out.startsWith("{")) out = "[" + out + "]";
        if (!out.startsWith("[")) out = "[]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    /** Ping continuo com estatisticas (perda, min/avg/max). */
    public String ping(String host, int count) {
        if (host == null || !host.matches("[A-Za-z0-9.\\-]{1,120}")) return err("host invalido");
        int c = Math.max(1, Math.min(count, 10));
        String ps =
            "$c=" + c + "; $h='" + host + "';" +
            "$r = Test-Connection -ComputerName $h -Count $c -ErrorAction SilentlyContinue;" +
            "$recv = ($r | Measure-Object).Count;" +
            "$times = @($r | ForEach-Object { [int]$_.ResponseTime });" +
            "$min = if($times.Count){ ($times | Measure-Object -Minimum).Minimum } else { -1 };" +
            "$max = if($times.Count){ ($times | Measure-Object -Maximum).Maximum } else { -1 };" +
            "$avg = if($times.Count){ [int](($times | Measure-Object -Average).Average) } else { -1 };" +
            "$loss = [int]((($c-$recv)/$c)*100);" +
            "[pscustomobject]@{ host=$h; sent=$c; received=$recv; lossPct=$loss; minMs=$min; avgMs=$avg; maxMs=$max } | ConvertTo-Json -Compress";
        Proc.Result r = Proc.powershell(ps, 30);
        String out = r.out.trim();
        if (out.isEmpty() || !out.startsWith("{")) return err("sem resposta");
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    private String err(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("message", msg);
        return Json.obj(m);
    }
}
