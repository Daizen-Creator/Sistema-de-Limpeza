package app.backend;

import java.util.List;
import java.util.Map;

/**
 * Gerador de JSON minimalista, sem dependencias externas.
 * Suficiente para as respostas simples deste backend.
 */
public final class Json {

    private Json() {}

    public static String esc(String s) {
        if (s == null) return "null";
        StringBuilder b = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n");  break;
                case '\r': b.append("\\r");  break;
                case '\t': b.append("\\t");  break;
                default:
                    if (c < 0x20) b.append(String.format("\\u%04x", (int) c));
                    else b.append(c);
            }
        }
        return b.append('"').toString();
    }

    public static String obj(Map<String, Object> map) {
        StringBuilder b = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> e : map.entrySet()) {
            if (!first) b.append(',');
            first = false;
            b.append(esc(e.getKey())).append(':').append(val(e.getValue()));
        }
        return b.append('}').toString();
    }

    @SuppressWarnings("unchecked")
    public static String val(Object v) {
        if (v == null) return "null";
        if (v instanceof String) return esc((String) v);
        if (v instanceof Boolean || v instanceof Number) return v.toString();
        if (v instanceof Map) return obj((Map<String, Object>) v);
        if (v instanceof List) {
            StringBuilder b = new StringBuilder("[");
            List<Object> list = (List<Object>) v;
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) b.append(',');
                b.append(val(list.get(i)));
            }
            return b.append(']').toString();
        }
        return esc(v.toString());
    }
}
