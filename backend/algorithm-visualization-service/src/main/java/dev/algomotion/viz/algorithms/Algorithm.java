package dev.algomotion.viz.algorithms;

import dev.algomotion.viz.engine.InputException;
import dev.algomotion.viz.engine.Trace;
import java.util.List;
import java.util.Map;

public interface Algorithm {
    String id();
    String name();
    String category();
    Map<String, String> complexity();
    Trace run(Map<String, Object> input);

    static int[] ints(Map<String, Object> in, String key, int max) {
        Object v = in.get(key);
        if (!(v instanceof List<?> l)) throw new InputException(key + " must be a list of numbers");
        if (l.size() > max) throw new InputException(key + " can have at most " + max + " values");
        int[] a = new int[l.size()];
        for (int i = 0; i < a.length; i++) {
            if (!(l.get(i) instanceof Number n) || n.doubleValue() != Math.rint(n.doubleValue()) || Math.abs(n.doubleValue()) > 9999)
                throw new InputException(key + " must contain whole numbers between -9999 and 9999");
            a[i] = n.intValue();
        }
        return a;
    }

    static int integer(Map<String, Object> in, String key) {
        if (!(in.get(key) instanceof Number n) || n.doubleValue() != Math.rint(n.doubleValue())) throw new InputException(key + " must be a whole number");
        return n.intValue();
    }
}
