package app.backend;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Sondagem do sistema em tempo real: hardware, processos e rede.
 * Usa CIM/PowerShell e devolve JSON pronto para o frontend.
 */
public class ProbeService {

    /** Hardware: CPU, GPU, RAM e discos (SSD/HDD). */
    public String hardware() {
        String ps =
            "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1;" +
            "$os  = Get-CimInstance Win32_OperatingSystem;" +
            "$cs  = Get-CimInstance Win32_ComputerSystem;" +
            "$bb  = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1;" +
            // --- GPU: le a VRAM REAL do registro (64 bits); prefere a DEDICADA de maior VRAM ---
            "$gpuName=''; $gpuVram=0; $gpuDriver=''; $gpuDed=$false;" +
            "$cls='HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}';" +
            "Get-ChildItem $cls -ErrorAction SilentlyContinue | ForEach-Object {" +
            "  $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue;" +
            "  if ($p -and $p.DriverDesc -and $p.DriverDesc -notmatch 'Idd|Basic|Remote|Virtual|Meta|Parsec|Mirror|DameWare|Citrix') {" +
            "    $qw = 0; $v = $p.'HardwareInformation.qwMemorySize';" +
            "    if ($v) { if ($v -is [byte[]]) { if ($v.Length -ge 8) { $qw = [System.BitConverter]::ToInt64($v,0) } } else { try { $qw = [int64]$v } catch {} } }" +
            "    if ($qw -le 0) { $m = $p.'HardwareInformation.MemorySize'; if ($m) { if ($m -is [byte[]]) { if ($m.Length -ge 4) { $qw = [int64][System.BitConverter]::ToUInt32($m,0) } } else { try { $qw = [int64]$m } catch {} } } }" +
            "    $ded = ($p.DriverDesc -match 'GeForce|RTX|GTX|Radeon RX|Radeon Pro|Arc|Quadro|Tesla|Titan');" +
            "    $take = $false;" +
            "    if ($gpuName -eq '') { $take = $true }" +
            "    elseif ($ded -and -not $gpuDed) { $take = $true }" +
            "    elseif (($ded -eq $gpuDed) -and ($qw -gt $gpuVram)) { $take = $true };" +
            "    if ($take) { $gpuName = $p.DriverDesc; $gpuDriver = [string]$p.DriverVersion; $gpuVram = $qw; $gpuDed = $ded }" +
            "  } };" +
            "if ($gpuName -eq '') {" +
            "  $g = Get-CimInstance Win32_VideoController | Where-Object { $_.PNPDeviceID -like 'PCI*' } | Sort-Object AdapterRAM -Descending | Select-Object -First 1;" +
            "  if (-not $g) { $g = Get-CimInstance Win32_VideoController | Select-Object -First 1 };" +
            "  if ($g) { $gpuName=[string]$g.Name; $gpuDriver=[string]$g.DriverVersion; $gpuVram=[int64]$g.AdapterRAM } };" +
            "$temp = $null;" +
            "try { $t = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1;" +
            "      if ($t) { $temp = [math]::Round(($t.CurrentTemperature/10)-273.15,0) } } catch {}" +
            "$disks = @();" +
            "try {" +
            "  $disks = Get-PhysicalDisk -ErrorAction Stop | ForEach-Object {" +
            "    [pscustomobject]@{ name=$_.FriendlyName; media=[string]$_.MediaType; sizeBytes=[int64]$_.Size }" +
            "  }" +
            "} catch {" +
            "  $disks = Get-CimInstance Win32_DiskDrive | ForEach-Object {" +
            "    [pscustomobject]@{ name=$_.Model; media='Unspecified'; sizeBytes=[int64]$_.Size } }" +
            "}" +
            "$vols = Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | ForEach-Object {" +
            "  [pscustomobject]@{ drive=$_.DeviceID; totalBytes=[int64]$_.Size; freeBytes=[int64]$_.FreeSpace } };" +
            "$mb = if ($bb) { ((([string]$bb.Manufacturer) + ' ' + ([string]$bb.Product)).Trim()) } else { '' };" +
            "$ramSticks = (Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | Measure-Object -Property Capacity -Sum).Sum;" +
            "$ramTotal = if ($ramSticks) { [int64]$ramSticks } elseif ($cs.TotalPhysicalMemory) { [int64]$cs.TotalPhysicalMemory } else { [int64]($os.TotalVisibleMemorySize*1024) };" +
            "$obj = [pscustomobject]@{" +
            "  cpuName = ($cpu.Name).Trim();" +
            "  cpuCores = [int]$cpu.NumberOfCores;" +
            "  cpuThreads = [int]$cpu.NumberOfLogicalProcessors;" +
            "  cpuClockMhz = [int]$cpu.MaxClockSpeed;" +
            "  cpuLoad = [int]$cpu.LoadPercentage;" +
            "  cpuTempC = $temp;" +
            "  gpuName = $gpuName;" +
            "  gpuDriver = $gpuDriver;" +
            "  gpuVramBytes = [int64]$gpuVram;" +
            "  motherboard = $mb;" +
            "  ramTotalBytes = $ramTotal;" +
            "  ramFreeBytes = [int64]($os.FreePhysicalMemory*1024);" +
            "  disks = @($disks);" +
            "  volumes = @($vols);" +
            "};" +
            "$obj | ConvertTo-Json -Depth 5 -Compress";
        return wrap(ps, 40);
    }

    /** Lista os processos com maior uso de memoria. */
    public String processes() {
        String ps =
            "$list = Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 70 " +
            "  @{n='pid';e={$_.Id}}, @{n='name';e={$_.ProcessName}}, " +
            "  @{n='ramMB';e={[math]::Round($_.WorkingSet64/1MB,1)}}, " +
            "  @{n='cpuSec';e={ if($_.CPU){[math]::Round($_.CPU,1)}else{0} }};" +
            "if($list){ ConvertTo-Json -Depth 3 -Compress -InputObject @($list) } else { '[]' }";
        return wrapArray(ps, 40);
    }

    /** Encerra um processo pelo PID (com forca). */
    public String killProcess(int pid) {
        if (pid <= 0) return err("PID invalido");
        Proc.Result r = Proc.run(20, "taskkill", "/PID", String.valueOf(pid), "/F", "/T");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", r.ok());
        m.put("message", r.ok() ? "Processo encerrado." : (r.err.isEmpty() ? r.out : r.err).trim());
        return Json.obj(m);
    }

    /** Altera a prioridade de um processo. */
    public String setPriority(int pid, String level) {
        if (pid <= 0) return err("PID invalido");
        String cls;
        switch (level) {
            case "low":      cls = "Idle"; break;
            case "belownormal": cls = "BelowNormal"; break;
            case "normal":   cls = "Normal"; break;
            case "abovenormal": cls = "AboveNormal"; break;
            case "high":     cls = "High"; break;
            case "realtime": cls = "RealTime"; break;
            default: return err("nivel invalido");
        }
        Proc.Result r = Proc.powershell(
            "try { (Get-Process -Id " + pid + ").PriorityClass = '" + cls + "'; 'ok' } catch { $_.Exception.Message }", 20);
        boolean ok = r.out.trim().endsWith("ok");
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", ok);
        m.put("message", ok ? "Prioridade ajustada para " + cls : r.out.trim());
        return Json.obj(m);
    }

    /** Rede: ping (Google/Cloudflare) e bytes acumulados (para calcular taxa no frontend). */
    public String network() {
        String ps =
            "$g = -1; $c = -1;" +
            "try { $g = [int](Test-Connection -ComputerName 8.8.8.8 -Count 1 -ErrorAction Stop).ResponseTime } catch {}" +
            "try { $c = [int](Test-Connection -ComputerName 1.1.1.1 -Count 1 -ErrorAction Stop).ResponseTime } catch {}" +
            "$rx = 0; $tx = 0;" +
            "try { $s = Get-NetAdapterStatistics -ErrorAction Stop;" +
            "      $rx = [int64](($s | Measure-Object -Property ReceivedBytes -Sum).Sum);" +
            "      $tx = [int64](($s | Measure-Object -Property SentBytes -Sum).Sum) } catch {}" +
            "[pscustomobject]@{ pingGoogle=$g; pingCloudflare=$c; rxBytes=$rx; txBytes=$tx } | ConvertTo-Json -Compress";
        return wrap(ps, 25);
    }

    // ----- util -----

    private String err(String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", false);
        m.put("message", msg);
        return Json.obj(m);
    }

    /** PS que emite um objeto JSON -> {"ok":true,"data":{...}} */
    private String wrap(String ps, int timeout) {
        Proc.Result r = Proc.powershell(ps, timeout);
        String out = r.out.trim();
        if (out.isEmpty() || !out.startsWith("{")) return "{\"ok\":false,\"message\":\"sem dados\"}";
        return "{\"ok\":true,\"data\":" + out + "}";
    }

    /** PS que emite um array JSON -> {"ok":true,"data":[...]} */
    private String wrapArray(String ps, int timeout) {
        Proc.Result r = Proc.powershell(ps, timeout);
        String out = r.out.trim();
        if (out.isEmpty()) out = "[]";
        if (out.startsWith("{")) out = "[" + out + "]";
        if (!out.startsWith("[")) out = "[]";
        return "{\"ok\":true,\"data\":" + out + "}";
    }
}
