package dev.algomotion.viz.engine;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Builders for visual state maps matching the frontend's discriminated union. */
public final class States {
    private States() {}

    public static Map<String, Object> hl(int index, String role) { return Map.of("index", index, "role", role); }

    public static Map<String, Object> ptr(String name, int at) { return Map.of("name", name, "at", at); }

    public static Map<String, Object> array(int[] values, List<Map<String, Object>> highlights, List<Map<String, Object>> pointers) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("kind", "array");
        List<Integer> v = new ArrayList<>();
        for (int x : values) v.add(x);
        s.put("values", v);
        s.put("highlights", highlights == null ? List.of() : highlights);
        s.put("pointers", pointers == null ? List.of() : pointers);
        return s;
    }

    public static Map<String, Object> vars(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i + 1 < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }
}
