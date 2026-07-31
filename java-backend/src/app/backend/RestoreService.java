package app.backend;

/**
 * Backup e restauracao (modulo 13):
 *  - lista pontos de restauracao do sistema
 *  - lista os backups criados pelo app
 */
public class RestoreService {

    /** Pontos de restauracao existentes (requer admin para ler em geral). */
    public String points() {
        String ps =
            "$pts = Get-ComputerRestorePoint -ErrorAction SilentlyContinue | ForEach-Object {" +
            "  [pscustomobject]@{" +
            "    seq=[int]$_.SequenceNumber;" +
            "    description=$_.Description;" +
            "    date= try { $_.ConvertToDateTime($_.CreationTime).ToString('yyyy-MM-dd HH:mm') } catch { '' };" +
            "    type=[string]$_.RestorePointType" +
            "  } };" +
            "if($pts){ ConvertTo-Json -Depth 3 -Compress -InputObject @($pts) } else { '[]' }";
        return wrapArray(ps, 40);
    }

    /** Backups criados pelo app em Documentos\\NexusClean-Backup. */
    public String backups() {
        String ps =
            "$dir = Join-Path $env:USERPROFILE 'Documents\\NexusClean-Backup';" +
            "if(Test-Path $dir){" +
            "  $list = Get-ChildItem $dir -Directory | Sort-Object CreationTime -Descending | ForEach-Object {" +
            "    $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum;" +
            "    [pscustomobject]@{ name=$_.Name; date=$_.CreationTime.ToString('yyyy-MM-dd HH:mm'); sizeBytes=[int64]$size } };" +
            "  if($list){ ConvertTo-Json -Depth 3 -Compress -InputObject @($list) } else { '[]' }" +
            "} else { '[]' }";
        return wrapArray(ps, 30);
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
