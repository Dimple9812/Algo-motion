package dev.algomotion.viz.engine;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class Snapshots {
    private Snapshots() {}

    @SuppressWarnings("unchecked")
    static <T> T deepCopy(T v) {
        if (v instanceof Map<?, ?> m) {
            Map<Object, Object> c = new LinkedHashMap<>();
            m.forEach((k, x) -> c.put(k, deepCopy(x)));
            return (T) c;
        }
        if (v instanceof List<?> l) {
            List<Object> c = new ArrayList<>();
            l.forEach(x -> c.add(deepCopy(x)));
            return (T) c;
        }
        if (v instanceof int[] a) {
            List<Integer> c = new ArrayList<>();
            for (int x : a) c.add(x);
            return (T) c;
        }
        return v;
    }
}
