package app.backend;

/**
 * Sensores de hardware (modulo 17).
 *
 * O Windows expoe pouca coisa nativamente: uso por nucleo (confiavel),
 * clock e, as vezes, temperatura/voltagem. Voltagem detalhada e RPM de
 * ventoinha normalmente exigem o LibreHardwareMonitor (lib externa).
 */
public class SensorService {

    public String sensors() {
        String ps =
            "$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1;" +
            "$cores = Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -ErrorAction SilentlyContinue |" +
            "  Where-Object { $_.Name -ne '_Total' } | Sort-Object { [int]$_.Name } |" +
            "  ForEach-Object { [pscustomobject]@{ core=[int]$_.Name; load=[int]$_.PercentProcessorTime } };" +
            "$temp = -1;" +
            "try { $t = Get-CimInstance -Namespace 'root/wmi' -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | Select-Object -First 1;" +
            "      if ($t) { $temp = [int](($t.CurrentTemperature/10)-273.15) } } catch {}" +
            "$volt = -1;" +
            "if ($cpu.CurrentVoltage -and $cpu.CurrentVoltage -gt 0) { $volt = [math]::Round($cpu.CurrentVoltage/10.0,2) }" +
            "$fans = @();" +
            "try { $fans = Get-CimInstance Win32_Fan -ErrorAction SilentlyContinue |" +
            "  ForEach-Object { [pscustomobject]@{ name=[string]$_.Name; speed=[int]($_.DesiredSpeed) } } } catch {}" +
            "$obj = [pscustomobject]@{" +
            "  cpuName=($cpu.Name).Trim();" +
            "  cpuClock=[int]$cpu.CurrentClockSpeed;" +
            "  cpuMaxClock=[int]$cpu.MaxClockSpeed;" +
            "  cpuLoad=[int]$cpu.LoadPercentage;" +
            "  voltage=$volt;" +
            "  tempC=$temp;" +
            "  cores=@($cores);" +
            "  fans=@($fans)" +
            "};" +
            "$obj | ConvertTo-Json -Depth 4 -Compress";
        Proc.Result r = Proc.powershell(ps, 30);
        String out = r.out.trim();
        if (out.isEmpty() || !out.startsWith("{")) return "{\"ok\":false,\"message\":\"sem dados de sensores\"}";
        return "{\"ok\":true,\"data\":" + out + "}";
    }
}
