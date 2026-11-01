package dev.algomotion.viz.algorithms;

import static dev.algomotion.viz.engine.States.*;

import dev.algomotion.viz.engine.Recorder;
import dev.algomotion.viz.engine.Trace;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/** Port of frontend/src/algorithms/sorting.ts (bubble, insertion, merge, quick). */
public final class Sorting {
    private Sorting() {}

    /** Values plus original positions, so stability can be verified. */
    static final class Ctx {
        int[] v;
        int[] order;
        final TreeSet<Integer> sorted = new TreeSet<>();
        final Recorder rec;

        Ctx(int[] values, Recorder rec) {
            this.v = values.clone();
            this.order = new int[values.length];
            for (int i = 0; i < order.length; i++) order[i] = i;
            this.rec = rec;
        }

        Map<String, Object> state(List<Map<String, Object>> hl, List<Map<String, Object>> ptrs) {
            List<Map<String, Object>> all = new ArrayList<>();
            for (int i : sorted) if (hl == null || hl.stream().noneMatch(h -> h.get("index").equals(i))) all.add(hl(i, "sorted"));
            if (hl != null) all.addAll(hl);
            return array(v, all, ptrs);
        }

        void swap(int i, int j) {
            int t = v[i]; v[i] = v[j]; v[j] = t;
            t = order[i]; order[i] = order[j]; order[j] = t;
        }

        Trace finish(String msg) {
            for (int i = 0; i < v.length; i++) sorted.add(i);
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("sorted", toList(v));
            result.put("order", toList(order));
            return rec.finish(result, msg, state(null, null), null);
        }

        static List<Integer> toList(int[] a) {
            List<Integer> l = new ArrayList<>();
            for (int x : a) l.add(x);
            return l;
        }
    }

    public abstract static class Base implements Algorithm {
        public String category() { return "sorting"; }
    }

    public static final class Bubble extends Base {
        public String id() { return "bubble-sort"; }
        public String name() { return "Bubble sort"; }
        public Map<String, String> complexity() { return Map.of("best", "O(n)", "average", "O(n²)", "worst", "O(n²)", "space", "O(1)", "stable", "true"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            Recorder rec = new Recorder(id(), in);
            Ctx c = new Ctx(a, rec);
            int n = a.length;
            rec.snap("INIT", "Start bubble sort.", c.state(null, null), 1, vars("n", n));
            for (int pass = 0; pass < n - 1; pass++) {
                boolean swapped = false;
                for (int i = 0; i < n - pass - 1; i++) {
                    rec.snap("COMPARE", "Compare a[" + i + "] = " + c.v[i] + " and a[" + (i + 1) + "] = " + c.v[i + 1] + ".", c.state(List.of(hl(i, "compare"), hl(i + 1, "compare")), List.of(ptr("i", i))), 4, vars("pass", pass, "i", i, "swapped", swapped));
                    if (c.v[i] > c.v[i + 1]) {
                        c.swap(i, i + 1);
                        swapped = true;
                        rec.snap("SWAP", "Out of order — swap them.", c.state(List.of(hl(i, "swap"), hl(i + 1, "swap")), List.of(ptr("i", i))), 5, vars("pass", pass, "i", i, "swapped", true));
                    }
                }
                c.sorted.add(n - pass - 1);
                rec.snap("MARK_SORTED", c.v[n - pass - 1] + " has reached its final position.", c.state(null, null), 6, vars("pass", pass, "swapped", swapped));
                if (!swapped) {
                    for (int k = 0; k < n; k++) c.sorted.add(k);
                    rec.snap("MARK_SORTED", "No swaps in this pass — the array is already sorted.", c.state(null, null), 7, vars("pass", pass, "swapped", false));
                    break;
                }
            }
            return c.finish("Bubble sort complete.");
        }
    }

    public static final class Insertion extends Base {
        public String id() { return "insertion-sort"; }
        public String name() { return "Insertion sort"; }
        public Map<String, String> complexity() { return Map.of("best", "O(n)", "average", "O(n²)", "worst", "O(n²)", "space", "O(1)", "stable", "true"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            Recorder rec = new Recorder(id(), in);
            Ctx c = new Ctx(a, rec);
            int n = a.length;
            rec.snap("INIT", "a[0] alone is a sorted prefix.", c.state(prefix(Math.min(1, n)), null), 1, null);
            for (int i = 1; i < n; i++) {
                int key = c.v[i], keyId = c.order[i], j = i - 1;
                List<Map<String, Object>> h = prefix(i);
                h.add(hl(i, "active"));
                rec.snap("READ", "Pick key = " + key + ".", c.state(h, List.of(ptr("i", i))), 2, vars("i", i, "j", j, "key", key));
                while (j >= 0) {
                    List<Map<String, Object>> hc = prefix(i + 1);
                    hc.add(hl(j, "compare"));
                    hc.add(hl(j + 1, "active"));
                    rec.snap("COMPARE", "Is a[" + j + "] = " + c.v[j] + " > key " + key + "?", c.state(hc, List.of(ptr("j", j))), 3, vars("i", i, "j", j, "key", key));
                    if (c.v[j] <= key) break;
                    c.v[j + 1] = c.v[j];
                    c.order[j + 1] = c.order[j];
                    c.v[j] = key;
                    c.order[j] = keyId;
                    List<Map<String, Object>> hs = prefix(i + 1);
                    hs.add(hl(j + 1, "write"));
                    hs.add(hl(j, "active"));
                    rec.snap("SHIFT", "Shift " + c.v[j + 1] + " right.", c.state(hs, List.of(ptr("j", j))), 4, vars("i", i, "j", j, "key", key));
                    j--;
                }
                List<Map<String, Object>> hw = prefix(i + 1);
                hw.add(hl(j + 1, "found"));
                rec.snap("WRITE", "Key " + key + " lands at index " + (j + 1) + ".", c.state(hw, null), 5, vars("i", i, "j", j, "key", key));
            }
            return c.finish("Insertion sort complete.");
        }

        static List<Map<String, Object>> prefix(int k) {
            List<Map<String, Object>> l = new ArrayList<>();
            for (int x = 0; x < k; x++) l.add(hl(x, "visited"));
            return l;
        }
    }

    public static final class Merge extends Base {
        public String id() { return "merge-sort"; }
        public String name() { return "Merge sort"; }
        public Map<String, String> complexity() { return Map.of("best", "O(n log n)", "average", "O(n log n)", "worst", "O(n log n)", "space", "O(n)", "stable", "true"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            Recorder rec = new Recorder(id(), in);
            Ctx c = new Ctx(a, rec);
            rec.snap("INIT", "Start merge sort on the whole array.", c.state(null, null), 1, null);
            sort(c, 0, a.length - 1, 0);
            return c.finish("Merge sort complete.");
        }

        void sort(Ctx c, int lo, int hi, int depth) {
            if (lo >= hi) return;
            int mid = (lo + hi) / 2;
            c.rec.snap("PARTITION", "Split [" + lo + ".." + hi + "] into [" + lo + ".." + mid + "] and [" + (mid + 1) + ".." + hi + "] (depth " + depth + ").", c.state(null, null), 3, vars("lo", lo, "mid", mid, "hi", hi, "depth", depth));
            sort(c, lo, mid, depth + 1);
            sort(c, mid + 1, hi, depth + 1);
            int[] buf = java.util.Arrays.copyOfRange(c.v, lo, hi + 1);
            int[] ids = java.util.Arrays.copyOfRange(c.order, lo, hi + 1);
            c.rec.snap("READ", "Copy [" + lo + ".." + hi + "] into the merge buffer.", c.state(null, null), 5, vars("lo", lo, "mid", mid, "hi", hi));
            int i = 0, j = mid - lo + 1, k = lo, le = mid - lo, re = hi - lo;
            while (i <= le && j <= re) {
                c.rec.snap("COMPARE", "Compare left " + buf[i] + " with right " + buf[j] + ".", c.state(List.of(hl(k, "active")), List.of(ptr("k", k))), 6, vars("i", i, "j", j, "k", k));
                if (buf[i] <= buf[j]) { c.v[k] = buf[i]; c.order[k] = ids[i]; i++; } else { c.v[k] = buf[j]; c.order[k] = ids[j]; j++; }
                c.rec.snap("WRITE", "Write " + c.v[k] + " to index " + k + ".", c.state(List.of(hl(k, "write")), List.of(ptr("k", k))), 6, vars("i", i, "j", j, "k", k));
                k++;
            }
            while (i <= le) {
                c.v[k] = buf[i]; c.order[k] = ids[i]; i++;
                c.rec.snap("WRITE", "Copy remaining left value " + c.v[k] + " to index " + k + ".", c.state(List.of(hl(k, "write")), List.of(ptr("k", k))), 6, vars("i", i, "j", j, "k", k));
                k++;
            }
            while (j <= re) {
                c.v[k] = buf[j]; c.order[k] = ids[j]; j++;
                c.rec.snap("WRITE", "Copy remaining right value " + c.v[k] + " to index " + k + ".", c.state(List.of(hl(k, "write")), List.of(ptr("k", k))), 6, vars("i", i, "j", j, "k", k));
                k++;
            }
            List<Map<String, Object>> v = new ArrayList<>();
            for (int x = lo; x <= hi; x++) v.add(hl(x, "visited"));
            c.rec.snap("MERGE", "[" + lo + ".." + hi + "] is now sorted.", c.state(v, null), 6, vars("lo", lo, "hi", hi));
        }
    }

    public static final class Quick extends Base {
        public String id() { return "quick-sort"; }
        public String name() { return "Quick sort (Lomuto)"; }
        public Map<String, String> complexity() { return Map.of("best", "O(n log n)", "average", "O(n log n)", "worst", "O(n²)", "space", "O(log n)", "stable", "false"); }

        public Trace run(Map<String, Object> in) {
            int[] a = Algorithm.ints(in, "values", 24);
            Recorder rec = new Recorder(id(), in);
            Ctx c = new Ctx(a, rec);
            rec.snap("INIT", "Start quick sort.", c.state(null, null), 1, null);
            qs(c, 0, a.length - 1);
            return c.finish("Quick sort complete.");
        }

        void qs(Ctx c, int lo, int hi) {
            if (lo > hi) return;
            if (lo == hi) {
                c.sorted.add(lo);
                c.rec.snap("MARK_SORTED", "Single element a[" + lo + "] is in place.", c.state(null, null), 2, vars("lo", lo, "hi", hi));
                return;
            }
            int pivot = c.v[hi], i = lo;
            c.rec.snap("PARTITION", "Partition [" + lo + ".." + hi + "] around pivot " + pivot + ".", c.state(List.of(hl(hi, "pivot")), List.of(ptr("i", i))), 3, vars("lo", lo, "hi", hi, "pivot", pivot, "i", i));
            for (int j = lo; j < hi; j++) {
                c.rec.snap("COMPARE", "Is a[" + j + "] = " + c.v[j] + " < pivot " + pivot + "?", c.state(List.of(hl(hi, "pivot"), hl(j, "compare")), List.of(ptr("i", i), ptr("j", j))), 5, vars("i", i, "j", j, "pivot", pivot));
                if (c.v[j] < pivot) {
                    if (i != j) {
                        c.swap(i, j);
                        c.rec.snap("SWAP", "Yes — swap a[" + i + "] and a[" + j + "].", c.state(List.of(hl(hi, "pivot"), hl(i, "swap"), hl(j, "swap")), List.of(ptr("i", i), ptr("j", j))), 5, vars("i", i, "j", j, "pivot", pivot));
                    }
                    i++;
                    c.rec.snap("POINTER_MOVE", "Advance i to " + i + ".", c.state(List.of(hl(hi, "pivot")), List.of(ptr("i", i), ptr("j", j))), 5, vars("i", i, "j", j, "pivot", pivot));
                }
            }
            if (i != hi) c.swap(i, hi);
            c.sorted.add(i);
            c.rec.snap("SWAP", "Place pivot " + pivot + " at its final index " + i + ".", c.state(List.of(hl(i, "pivot")), List.of(ptr("i", i))), 6, vars("i", i, "pivot", pivot));
            qs(c, lo, i - 1);
            qs(c, i + 1, hi);
        }
    }
}
