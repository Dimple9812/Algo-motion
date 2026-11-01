"""Shared building blocks for the AlgoMotion problem catalog.

Every problem is original wording written for this project (MIT licensed).
Java programs use a fixed stdin/stdout harness so one runner can test any problem:
the learner edits only the `solve` method; the I/O section parses input and prints output.
"""

PROBLEMS = []

HEADER = """import java.util.*;
import java.io.*;

public class Main {
"""

IO = """
    // ===== I/O harness (do not change) =====
    static List<String> L = new ArrayList<>();
    static String line(int i) { return i < L.size() ? L.get(i).trim() : ""; }
    static int[] ints(String s) {
        s = s.trim();
        if (s.isEmpty()) return new int[0];
        String[] p = s.split("\\\\s+");
        int[] r = new int[p.length];
        for (int i = 0; i < p.length; i++) r[i] = Integer.parseInt(p[i]);
        return r;
    }
    static String join(int[] a) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(' '); sb.append(a[i]); }
        return sb.toString();
    }
    static String joinList(List<?> a) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < a.size(); i++) { if (i > 0) sb.append(' '); sb.append(a.get(i)); }
        return sb.toString();
    }
"""

LIST_NODE = """
    static class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }
    static ListNode build(int[] a) {
        ListNode d = new ListNode(0), t = d;
        for (int x : a) { t.next = new ListNode(x); t = t.next; }
        return d.next;
    }
    static String dump(ListNode h) {
        StringBuilder sb = new StringBuilder();
        for (ListNode c = h; c != null; c = c.next) { if (sb.length() > 0) sb.append(' '); sb.append(c.val); }
        return sb.toString();
    }
"""

TREE_NODE = """
    static class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
    /** Level-order tokens, "null" for gaps. */
    static TreeNode tree(String s) {
        s = s.trim();
        if (s.isEmpty()) return null;
        String[] p = s.split("\\\\s+");
        if (p[0].equals("null")) return null;
        TreeNode root = new TreeNode(Integer.parseInt(p[0]));
        Deque<TreeNode> q = new ArrayDeque<>(); q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < p.length) {
            TreeNode c = q.poll();
            if (i < p.length && !p[i].equals("null")) { c.left = new TreeNode(Integer.parseInt(p[i])); q.add(c.left); } i++;
            if (i < p.length && !p[i].equals("null")) { c.right = new TreeNode(Integer.parseInt(p[i])); q.add(c.right); } i++;
        }
        return root;
    }
"""

MAIN_OPEN = """    public static void main(String[] args) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));
        for (String s; (s = in.readLine()) != null; ) L.add(s);
"""


def program(method: str, main: str, extra: str = "") -> str:
    m = "\n".join("    " + ln if ln.strip() else "" for ln in method.strip("\n").split("\n"))
    body = "\n".join("        " + ln if ln.strip() else "" for ln in main.strip("\n").split("\n"))
    return HEADER + "    // ===== your solution =====\n" + m + "\n" + IO + extra + MAIN_OPEN + body + "\n    }\n}\n"


def problem(slug, title, topic, difficulty, patterns, statement, input_format, output_format,
            constraints, hints, edge_cases, main, starter, brute, opt, tests, extra="",
            examples_n=2, related=(), viz_brute=None, viz_opt=None, explanations=None):
    """brute/opt: dict(title, method, intuition, steps, pseudo, time, space, correct, limits) or None."""
    def approach(kind, a, viz):
        if not a:
            return None
        return {
            "kind": kind, "title": a["title"], "intuition": a["intuition"], "steps": a["steps"],
            "pseudocode": a["pseudo"], "java": program(a["method"], main, extra), "time": a["time"],
            "space": a["space"], "correctness": a["correct"], "limitations": a["limits"],
            "visualization": viz,
        }
    approaches = [x for x in (approach("BRUTE_FORCE", brute, viz_brute), approach("OPTIMIZED", opt, viz_opt)) if x]
    exs = []
    for i, (inp, out) in enumerate(tests[:examples_n]):
        e = {"input": inp, "output": out}
        if explanations and i < len(explanations) and explanations[i]:
            e["explanation"] = explanations[i]
        exs.append(e)
    PROBLEMS.append({
        "slug": slug, "title": title, "topic": topic, "difficulty": difficulty, "patterns": list(patterns),
        "visualizationSupported": bool(viz_brute or viz_opt),
        "statement": statement.strip(), "inputFormat": input_format.strip(), "outputFormat": output_format.strip(),
        "constraints": list(constraints), "examples": exs, "edgeCases": list(edge_cases), "hints": list(hints),
        "approaches": approaches, "tests": [{"input": i, "expected": o} for i, o in tests],
        "related": list(related), "source": "Original AlgoMotion problem statement (MIT).",
        "starterCode": program(starter, main, extra),
    })


def A(title, method, intuition, steps, pseudo, time, space, correct, limits):
    return dict(title=title, method=method, intuition=intuition, steps=steps, pseudo=pseudo,
                time=time, space=space, correct=correct, limits=limits)
