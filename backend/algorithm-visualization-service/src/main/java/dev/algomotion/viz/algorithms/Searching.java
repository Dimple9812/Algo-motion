package dev.algomotion.viz.algorithms;

import static dev.algomotion.viz.engine.States.*;

import dev.algomotion.viz.engine.InputException;
import dev.algomotion.viz.engine.Recorder;
import dev.algomotion.viz.engine.Trace;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Port of frontend/src/algorithms/searching.ts — operation sequence and line numbers must stay identical. */
public final class Searching {
    private Searching() {}

    public static final class Linear implements Algorithm {
        public String id() { return "linear-search"; }
        public String name() { return "Linear search"; }
        public String category() { return "searching"; }
        public Map<String, String> complexity() { return Map.of("best", "O(1)", "average", "O(n)", "worst", "O(n)", "space", "O(1)"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            int target = Algorithm.integer(in, "target");
            Recorder rec = new Recorder(id(), in);
            rec.snap("INIT", "Search for " + target + " from the left.", array(a, null, null), 1, vars("target", target));
            for (int i = 0; i < a.length; i++) {
                List<Map<String, Object>> visited = new ArrayList<>();
                for (int k = 0; k < i; k++) visited.add(hl(k, "visited"));
                List<Map<String, Object>> cmp = new ArrayList<>(visited);
                cmp.add(hl(i, "compare"));
                rec.snap("COMPARE", "Compare a[" + i + "] = " + a[i] + " with target " + target + ".", array(a, cmp, List.of(ptr("i", i))), 2, vars("i", i, "current", a[i], "target", target));
                if (a[i] == target) {
                    List<Map<String, Object>> f = new ArrayList<>(visited);
                    f.add(hl(i, "found"));
                    rec.snap("FOUND", "Found " + target + " at index " + i + ".", array(a, f, List.of(ptr("i", i))), 3, vars("i", i, "target", target));
                    return rec.finish(i, "Returned index " + i + ".", array(a, List.of(hl(i, "found")), null), 3);
                }
            }
            List<Map<String, Object>> all = new ArrayList<>();
            for (int k = 0; k < a.length; k++) all.add(hl(k, "visited"));
            rec.snap("NOT_FOUND", target + " is not in the array.", array(a, all, null), 4, vars("target", target));
            return rec.finish(-1, "Returned -1.", array(a, null, null), 4);
        }
    }

    public static final class Binary implements Algorithm {
        public String id() { return "binary-search"; }
        public String name() { return "Binary search"; }
        public String category() { return "searching"; }
        public Map<String, String> complexity() { return Map.of("best", "O(1)", "average", "O(log n)", "worst", "O(log n)", "space", "O(1)"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            int target = Algorithm.integer(in, "target");
            for (int i = 1; i < a.length; i++) if (a[i - 1] > a[i]) throw new InputException("Binary search requires the array to be sorted in ascending order.");
            Recorder rec = new Recorder(id(), in);
            int low = 0, high = a.length - 1;
            rec.snap("INIT", "Search for " + target + " in the whole range [0, " + high + "].", array(a, null, ptrs(low, high, null, a.length)), 1, vars("low", low, "high", high, "target", target));
            while (low <= high) {
                int mid = low + (high - low) / 2;
                rec.snap("POINTER_MOVE", "mid = " + low + " + (" + high + " - " + low + ") / 2 = " + mid + ".", array(a, muted(a.length, low, high, mid, "active"), ptrs(low, high, mid, a.length)), 3, vars("low", low, "high", high, "mid", mid));
                rec.snap("COMPARE", "Compare a[" + mid + "] = " + a[mid] + " with " + target + ".", array(a, muted(a.length, low, high, mid, "compare"), ptrs(low, high, mid, a.length)), 4, vars("low", low, "high", high, "mid", mid));
                if (a[mid] == target) {
                    rec.snap("FOUND", "a[" + mid + "] equals the target.", array(a, muted(a.length, low, high, mid, "found"), ptrs(low, high, mid, a.length)), 4, vars("mid", mid));
                    return rec.finish(mid, "Found " + target + " at index " + mid + ".", array(a, List.of(hl(mid, "found")), List.of(ptr("mid", mid))), 4);
                }
                if (a[mid] < target) {
                    low = mid + 1;
                    rec.snap("POINTER_MOVE", a[mid] + " < " + target + ": discard the left half, low = " + low + ".", array(a, muted(a.length, low, high, -1, null), ptrs(low, high, null, a.length)), 5, vars("low", low, "high", high));
                } else {
                    high = mid - 1;
                    rec.snap("POINTER_MOVE", a[mid] + " > " + target + ": discard the right half, high = " + high + ".", array(a, muted(a.length, low, high, -1, null), ptrs(low, high, null, a.length)), 6, vars("low", low, "high", high));
                }
            }
            List<Map<String, Object>> all = new ArrayList<>();
            for (int k = 0; k < a.length; k++) all.add(hl(k, "muted"));
            rec.snap("NOT_FOUND", "low (" + low + ") > high (" + high + "): the range is empty, so " + target + " is absent.", array(a, all, null), 7, vars("low", low, "high", high));
            return rec.finish(-1, "Returned -1.", array(a, null, null), 7);
        }

        static List<Map<String, Object>> muted(int n, int low, int high, int mid, String role) {
            List<Map<String, Object>> h = new ArrayList<>();
            for (int k = 0; k < n; k++) if (k < low || k > high) h.add(hl(k, "muted"));
            if (mid >= 0) h.add(hl(mid, role));
            return h;
        }

        static List<Map<String, Object>> ptrs(int low, int high, Integer mid, int n) {
            List<Map<String, Object>> p = new ArrayList<>();
            if (low < n) p.add(ptr("low", low));
            if (high >= 0) p.add(ptr("high", high));
            if (mid != null) p.add(ptr("mid", mid));
            return p;
        }
    }
}
