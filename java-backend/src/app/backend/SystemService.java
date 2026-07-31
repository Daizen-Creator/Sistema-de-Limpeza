package app.backend;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.Map;

/** Informacoes gerais da maquina para o painel. */
public class SystemService {

    public String info(boolean elevated) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ok", true);
        m.put("os", System.getProperty("os.name") + " " + System.getProperty("os.version"));
        m.put("user", System.getProperty("user.name"));
        m.put("javaVersion", System.getProperty("java.version"));
        m.put("elevated", elevated);

        File sys = new File(System.getenv("SystemDrive") == null ? "C:\\" : System.getenv("SystemDrive") + "\\");
        m.put("diskTotalBytes", sys.getTotalSpace());
        m.put("diskFreeBytes", sys.getUsableSpace());

        // Nome do computador e RAM via propriedades simples
        Runtime rt = Runtime.getRuntime();
        m.put("computerName", System.getenv("COMPUTERNAME"));
        return Json.obj(m);
    }
}
