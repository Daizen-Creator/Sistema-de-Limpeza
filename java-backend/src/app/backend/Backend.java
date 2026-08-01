package app.backend;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

/**
 * Servidor HTTP local do backend.
 *
 * Seguranca de rede:
 *  - Escuta APENAS em 127.0.0.1 (loopback), nunca exposto na rede.
 *  - Exige o cabecalho X-App-Token com um token gerado pelo Electron a cada
 *    inicializacao. Requisicoes sem o token correto sao rejeitadas (401).
 *
 * Parametros via variaveis de ambiente:
 *  APP_PORT  - porta (padrao 8733)
 *  APP_TOKEN - token de autenticacao obrigatorio
 */
public class Backend {

    private final CleanerService cleaner = new CleanerService();
    private final DriverService drivers = new DriverService();
    private final SystemService system = new SystemService();
    private final ProbeService probe = new ProbeService();
    private final SecurityService security = new SecurityService();
    private final RestoreService restore = new RestoreService();
    private final DiskService disk = new DiskService();
    private final BootService boot = new BootService();
    private final NetService net = new NetService();
    private final TermService term = new TermService();
    private final SensorService sensor = new SensorService();
    private final String token;

    public Backend(String token) { this.token = token; }

    public static void main(String[] args) throws Exception {
        int port = envInt("APP_PORT", 8733);
        String token = System.getenv("APP_TOKEN");
        if (token == null || token.isBlank()) token = "dev-token";

        Backend app = new Backend(token);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.setExecutor(Executors.newFixedThreadPool(10));

        server.createContext("/api/health", app::handleHealth);
        server.createContext("/api/system/info", app.secured(app::handleSystemInfo));
        server.createContext("/api/clean/scan", app.secured(app::handleCleanScan));
        server.createContext("/api/clean/run", app.secured(app::handleCleanRun));
        server.createContext("/api/drivers/list", app.secured(app::handleDriversList));
        server.createContext("/api/drivers/scan", app.secured(app::handleDriversScan));
        server.createContext("/api/drivers/install", app.secured(app::handleDriversInstall));
        server.createContext("/api/hw/info", app.secured(app::handleHwInfo));
        server.createContext("/api/proc/list", app.secured(app::handleProcList));
        server.createContext("/api/proc/kill", app.secured(app::handleProcKill));
        server.createContext("/api/proc/priority", app.secured(app::handleProcPriority));
        server.createContext("/api/net/stats", app.secured(app::handleNetStats));
        server.createContext("/api/sec/status", app.secured(app::handleSecStatus));
        server.createContext("/api/sec/telemetry", app.secured(app::handleSecTelemetry));
        server.createContext("/api/sec/firewall", app.secured(app::handleSecFirewall));
        server.createContext("/api/sec/services", app.secured(app::handleSecServices));
        server.createContext("/api/sec/service-set", app.secured(app::handleSecServiceSet));
        server.createContext("/api/sec/startup", app.secured(app::handleSecStartup));
        server.createContext("/api/restore/points", app.secured(app::handleRestorePoints));
        server.createContext("/api/restore/backups", app.secured(app::handleRestoreBackups));
        server.createContext("/api/disk/roots", app.secured(app::handleDiskRoots));
        server.createContext("/api/disk/tree", app.secured(app::handleDiskTree));
        server.createContext("/api/disk/large", app.secured(app::handleDiskLarge));
        server.createContext("/api/disk/duplicates", app.secured(app::handleDiskDup));
        server.createContext("/api/disk/smart", app.secured(app::handleDiskSmart));
        server.createContext("/api/boot/list", app.secured(app::handleBootList));
        server.createContext("/api/boot/set", app.secured(app::handleBootSet));
        server.createContext("/api/net/processes", app.secured(app::handleNetProcesses));
        server.createContext("/api/net/ping", app.secured(app::handleNetPing));
        server.createContext("/api/term/run", app.secured(app::handleTermRun));
        server.createContext("/api/sensors", app.secured(app::handleSensors));

        server.start();
        System.out.println("BACKEND_READY port=" + port);
    }

    // ----- middleware de autenticacao -----

    private interface Handler { void handle(HttpExchange ex) throws IOException; }

    private com.sun.net.httpserver.HttpHandler secured(Handler h) {
        return ex -> {
            String provided = ex.getRequestHeaders().getFirst("X-App-Token");
            if (provided == null || !constantEquals(provided, token)) {
                send(ex, 401, "{\"ok\":false,\"message\":\"nao autorizado\"}");
                return;
            }
            try {
                h.handle(ex);
            } catch (Exception e) {
                send(ex, 500, "{\"ok\":false,\"message\":" + Json.esc(e.getMessage()) + "}");
            }
        };
    }

    // ----- handlers -----

    private void handleHealth(HttpExchange ex) throws IOException {
        send(ex, 200, "{\"ok\":true,\"service\":\"limpeza-drivers-backend\"}");
    }

    private void handleSystemInfo(HttpExchange ex) throws IOException {
        send(ex, 200, system.info(drivers.isElevated()));
    }

    private void handleCleanScan(HttpExchange ex) throws IOException {
        send(ex, 200, cleaner.scan());
    }

    private void handleCleanRun(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        List<String> ids = parseIds(body);
        send(ex, 200, cleaner.clean(ids));
    }

    private void handleDriversList(HttpExchange ex) throws IOException {
        send(ex, 200, drivers.listInstalled());
    }

    private void handleDriversScan(HttpExchange ex) throws IOException {
        send(ex, 200, drivers.scanUpdates());
    }

    private void handleDriversInstall(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        List<String> titles = parseStringList(body, "titles");
        send(ex, 200, drivers.installUpdates(titles));
    }

    private void handleHwInfo(HttpExchange ex) throws IOException {
        send(ex, 200, probe.hardware());
    }

    private void handleProcList(HttpExchange ex) throws IOException {
        send(ex, 200, probe.processes());
    }

    private void handleProcKill(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, probe.killProcess(parseInt(body, "pid")));
    }

    private void handleProcPriority(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, probe.setPriority(parseInt(body, "pid"), parseString(body, "level")));
    }

    private void handleNetStats(HttpExchange ex) throws IOException {
        send(ex, 200, probe.network());
    }

    private void handleSecStatus(HttpExchange ex) throws IOException {
        send(ex, 200, security.status());
    }

    private void handleSecTelemetry(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, security.setTelemetry(parseBool(body, "on")));
    }

    private void handleSecFirewall(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, security.firewallSet(parseString(body, "profile"), parseBool(body, "on")));
    }

    private void handleSecServices(HttpExchange ex) throws IOException {
        send(ex, 200, security.servicesList());
    }

    private void handleSecServiceSet(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, security.serviceSet(parseString(body, "name"), parseString(body, "action")));
    }

    private void handleSecStartup(HttpExchange ex) throws IOException {
        send(ex, 200, security.startupList());
    }

    private void handleRestorePoints(HttpExchange ex) throws IOException {
        send(ex, 200, restore.points());
    }

    private void handleRestoreBackups(HttpExchange ex) throws IOException {
        send(ex, 200, restore.backups());
    }

    private void handleDiskRoots(HttpExchange ex) throws IOException {
        send(ex, 200, disk.roots());
    }

    private void handleDiskTree(HttpExchange ex) throws IOException {
        send(ex, 200, disk.tree(parseString(readBody(ex), "path")));
    }

    private void handleDiskLarge(HttpExchange ex) throws IOException {
        send(ex, 200, disk.large(parseString(readBody(ex), "path")));
    }

    private void handleDiskDup(HttpExchange ex) throws IOException {
        send(ex, 200, disk.duplicates(parseString(readBody(ex), "path")));
    }

    private void handleDiskSmart(HttpExchange ex) throws IOException {
        send(ex, 200, disk.smart());
    }

    private void handleBootList(HttpExchange ex) throws IOException {
        send(ex, 200, boot.listStartup());
    }

    private void handleBootSet(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, boot.setStartup(
            parseString(body, "name"), parseString(body, "kind"),
            parseString(body, "scope"), parseBool(body, "enable")));
    }

    private void handleNetProcesses(HttpExchange ex) throws IOException {
        send(ex, 200, net.processes());
    }

    private void handleNetPing(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, net.ping(parseString(body, "host"), parseInt(body, "count")));
    }

    private void handleTermRun(HttpExchange ex) throws IOException {
        String body = readBody(ex);
        send(ex, 200, term.run(parseString(body, "command")));
    }

    private void handleSensors(HttpExchange ex) throws IOException {
        send(ex, 200, sensor.sensors());
    }

    // ----- utilidades HTTP/parse -----

    private String readBody(HttpExchange ex) throws IOException {
        return new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    /** Extrai lista de ids de {"ids":["a","b"]} sem lib de JSON. */
    private List<String> parseIds(String body) { return parseStringList(body, "ids"); }

    private List<String> parseStringList(String body, String key) {
        List<String> list = new ArrayList<>();
        if (body == null) return list;
        int k = body.indexOf("\"" + key + "\"");
        if (k < 0) return list;
        int start = body.indexOf('[', k);
        int end = body.indexOf(']', start);
        if (start < 0 || end < 0) return list;
        String inner = body.substring(start + 1, end);
        for (String part : inner.split(",")) {
            String v = part.trim();
            if (v.startsWith("\"") && v.endsWith("\"") && v.length() >= 2) {
                list.add(v.substring(1, v.length() - 1).replace("\\\"", "\""));
            }
        }
        return list;
    }

    /** Extrai um inteiro de {"key":123}. */
    private int parseInt(String body, String key) {
        if (body == null) return -1;
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("\"" + key + "\"\\s*:\\s*(\\d+)").matcher(body);
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    /** Extrai um booleano de {"key":true}. */
    private boolean parseBool(String body, String key) {
        if (body == null) return false;
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("\"" + key + "\"\\s*:\\s*(true|false)").matcher(body);
        return m.find() && m.group(1).equals("true");
    }

    /** Extrai uma string de {"key":"valor"}, desescapando \\ e \". */
    private String parseString(String body, String key) {
        if (body == null) return "";
        java.util.regex.Matcher m =
            java.util.regex.Pattern.compile("\"" + key + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"").matcher(body);
        if (!m.find()) return "";
        return m.group(1).replace("\\\\", "\\").replace("\\\"", "\"");
    }

    private void send(HttpExchange ex, int code, String json) throws IOException {
        byte[] b = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(code, b.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(b); }
    }

    private static int envInt(String name, int def) {
        try { return Integer.parseInt(System.getenv(name)); }
        catch (Exception e) { return def; }
    }

    private static boolean constantEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int r = 0;
        for (int i = 0; i < a.length(); i++) r |= a.charAt(i) ^ b.charAt(i);
        return r == 0;
    }
}
