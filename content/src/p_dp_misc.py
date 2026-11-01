from common import problem, A

N_MAIN = "System.out.println(solve(Integer.parseInt(line(0))));"

# ---------------------------------------------------------------- recursion
problem("power-of-number", "Fast Power", "recursion", "EASY", ["divide and conquer", "recursion"],
"""Compute base^exp modulo 1 000 000 007 (exp ≥ 0).""",
"Line 1: base exp.", "The result.", ["0 ≤ base ≤ 10^9", "0 ≤ exp ≤ 10^18"], ["x^e = (x^(e/2))² · (x if e odd)."], ["exp = 0", "base = 0"],
"long[] v = Arrays.stream(line(0).split(\" \")).mapToLong(Long::parseLong).toArray();\nSystem.out.println(solve(v[0], v[1]));",
"static long solve(long base, long exp) {\n    // TODO\n    return 1;\n}",
A("Repeated multiplication", """static long solve(long base, long exp) {
    long M = 1_000_000_007L, r = 1;
    if (exp > 10_000_000) return fast(base % M, exp, M);
    for (long i = 0; i < exp; i++) r = r * (base % M) % M;
    return r;
}
static long fast(long b, long e, long M) { return e == 0 ? 1 : (e % 2 == 1 ? b * fast(b, e - 1, M) % M : fast(b * b % M, e / 2, M)); }""", "Multiply exp times (falls back to fast power for huge exponents so tests finish).", ["Loop exp times."], ["r = 1; repeat exp: r = r*base mod M"], "O(exp)", "O(1)", "Definition of exponentiation.", "Impractical for large exponents."),
A("Recursive halving", """static long solve(long base, long exp) {
    long M = 1_000_000_007L;
    if (exp == 0) return 1;
    long half = solve(base, exp / 2);
    long r = half * half % M;
    return exp % 2 == 1 ? r * (base % M) % M : r;
}""", "Halve the exponent each call.", ["Base case exp = 0.", "Square the half power, multiply once more if odd."], ["pow(b, e) = e==0 ? 1 : pow(b, e/2)² · (b if odd)"], "O(log exp)", "O(log exp)", "Exponent laws.", "—"),
[("2 10", "1024"), ("3 0", "1"), ("0 5", "0"), ("2 1000000000000", "959366170")],
viz_opt={"algorithm": "rec-factorial", "input": {"n": 5}})

problem("generate-parentheses", "All Balanced Strings", "backtracking", "MEDIUM", ["backtracking", "pruning"],
"""Print every balanced string of n pairs of parentheses in lexicographic order ('(' < ')'), one per line.""",
"Line 1: n.", "The strings.", ["1 ≤ n ≤ 8"], ["Add '(' while opens < n; add ')' while closes < opens."], ["n = 1"],
"for (String s : solve(Integer.parseInt(line(0)))) System.out.println(s);", "static List<String> solve(int n) {\n    // TODO\n    return new ArrayList<>();\n}",
A("Generate all and filter", """static List<String> solve(int n) {
    List<String> out = new ArrayList<>();
    for (int mask = 0; mask < (1 << (2 * n)); mask++) {
        StringBuilder sb = new StringBuilder(); int bal = 0; boolean ok = true;
        for (int i = 2 * n - 1; i >= 0; i--) { boolean open = (mask >> i & 1) == 0; sb.append(open ? '(' : ')'); bal += open ? 1 : -1; if (bal < 0) ok = false; }
        if (ok && bal == 0) out.add(sb.toString());
    }
    return out;
}""", "Enumerate all 2^(2n) strings and keep balanced ones.", ["Each bitmask is a string.", "Validate by balance."], ["for all strings: if balanced: keep"], "O(4ⁿ · n)", "O(n)", "Exhaustive.", "Exponentially many wasted candidates."),
A("Backtracking", """static List<String> solve(int n) {
    List<String> out = new ArrayList<>();
    bt(new StringBuilder(), 0, 0, n, out);
    return out;
}
static void bt(StringBuilder sb, int open, int close, int n, List<String> out) {
    if (sb.length() == 2 * n) { out.add(sb.toString()); return; }
    if (open < n) { sb.append('('); bt(sb, open + 1, close, n, out); sb.setLength(sb.length() - 1); }
    if (close < open) { sb.append(')'); bt(sb, open, close + 1, n, out); sb.setLength(sb.length() - 1); }
}""", "Only extend prefixes that can still become balanced.", ["Add '(' if opens remain.", "Add ')' if it doesn't exceed opens.", "Undo after recursion."], ["bt(prefix, open, close)", "    if open<n: bt(prefix+'(')", "    if close<open: bt(prefix+')')"], "O(Catalan(n)·n)", "O(n)", "Every valid prefix is extended; invalid prefixes never appear.", "—"),
[("3", "((()))\n(()())\n(())()\n()(())\n()()()"), ("1", "()"), ("2", "(())\n()()")],
viz_opt={"algorithm": "rec-subsets", "input": {"values": [1, 2, 3]}})

problem("subsets", "Every Selection", "backtracking", "EASY", ["backtracking", "bitmasks"],
"""Print all subsets of the given distinct numbers. Generate them in the include-first order: for each element, first the subsets that include it, then those that don't. Print each subset on its own line (empty subset as an empty line).""",
"Line 1: distinct numbers.", "2^n lines.", ["0 ≤ n ≤ 10"], ["Each element is either in or out."], ["Empty input → one empty subset"],
"for (List<Integer> s : solve(ints(line(0)))) System.out.println(joinList(s));", "static List<List<Integer>> solve(int[] a) {\n    // TODO\n    return new ArrayList<>();\n}",
None,
A("Include / exclude backtracking", """static List<List<Integer>> solve(int[] a) {
    List<List<Integer>> out = new ArrayList<>();
    bt(a, 0, new ArrayList<>(), out);
    return out;
}
static void bt(int[] a, int i, List<Integer> cur, List<List<Integer>> out) {
    if (i == a.length) { out.add(new ArrayList<>(cur)); return; }
    cur.add(a[i]); bt(a, i + 1, cur, out);
    cur.remove(cur.size() - 1); bt(a, i + 1, cur, out);
}""", "A binary choice tree with depth n.", ["Include a[i], recurse, undo.", "Exclude a[i], recurse."], ["bt(i): if i==n: record", "    include; bt(i+1); undo; bt(i+1)"], "O(n·2ⁿ)", "O(n)", "Each leaf is a distinct choice vector.", "Output size is inherently exponential, so no faster method exists."),
[("1 2 3", "1 2 3\n1 2\n1 3\n1\n2 3\n2\n3\n"), ("0", "0\n")],
viz_opt={"algorithm": "rec-subsets", "input": {"values": [1, 2, 3]}})

problem("n-queens-count", "Peaceful Queens", "backtracking", "HARD", ["backtracking", "constraint sets"],
"""Count the ways to place n queens on an n×n board so no two attack each other.""",
"Line 1: n.", "The number of solutions.", ["1 ≤ n ≤ 11"], ["One queen per row; track used columns and both diagonal families."], ["n = 2, 3 → 0"],
N_MAIN, "static long solve(int n) {\n    // TODO\n    return 0;\n}",
A("Permutations + check", """static long solve(int n) {
    int[] p = new int[n];
    for (int i = 0; i < n; i++) p[i] = i;
    long c = 0;
    do {
        boolean ok = true;
        for (int i = 0; i < n && ok; i++) for (int j = i + 1; j < n; j++) if (Math.abs(p[i] - p[j]) == j - i) { ok = false; break; }
        if (ok) c++;
    } while (next(p));
    return c;
}
static boolean next(int[] p) {
    int i = p.length - 2;
    while (i >= 0 && p[i] >= p[i + 1]) i--;
    if (i < 0) return false;
    int j = p.length - 1;
    while (p[j] <= p[i]) j--;
    int t = p[i]; p[i] = p[j]; p[j] = t;
    for (int a = i + 1, b = p.length - 1; a < b; a++, b--) { t = p[a]; p[a] = p[b]; p[b] = t; }
    return true;
}""", "Rows and columns distinct ⇒ a permutation; check diagonals.", ["Enumerate all n! permutations.", "Reject diagonal attacks."], ["for perm: if no diagonal clash: count"], "O(n!·n²)", "O(n)", "Exhaustive over row/column-safe boards.", "Explores dead branches fully."),
A("Backtracking with pruning", """static long solve(int n) { return place(0, n, new boolean[n], new boolean[2 * n], new boolean[2 * n]); }
static long place(int r, int n, boolean[] col, boolean[] d1, boolean[] d2) {
    if (r == n) return 1;
    long c = 0;
    for (int x = 0; x < n; x++) {
        if (col[x] || d1[r - x + n] || d2[r + x]) continue;
        col[x] = d1[r - x + n] = d2[r + x] = true;
        c += place(r + 1, n, col, d1, d2);
        col[x] = d1[r - x + n] = d2[r + x] = false;
    }
    return c;
}""", "Place row by row; abandon a branch as soon as it is attacked.", ["Track columns and diagonals in boolean arrays.", "Recurse to the next row.", "Undo after recursion."], ["place(r): if r==n: return 1", "    for col safe: mark; place(r+1); unmark"], "O(n!) worst, far less in practice", "O(n)", "Every safe partial placement is extended; unsafe ones pruned immediately.", "—"),
[("4", "2"), ("1", "1"), ("3", "0"), ("8", "92")],
viz_opt={"algorithm": "rec-n-queens", "input": {"n": 4}})

problem("combination-sum", "Make the Total", "backtracking", "MEDIUM", ["backtracking", "pruning"],
"""Using candidates (distinct, reusable), print every combination summing to target, each in non-decreasing order, combinations in lexicographic order, one per line.""",
"Line 1: candidates.\nLine 2: target.", "Combinations, one per line.", ["1 ≤ target ≤ 40"], ["Sort candidates; pass a start index so combinations stay non-decreasing.", "Stop when the candidate exceeds the remaining target."], ["No combination → print nothing"],
"for (List<Integer> c : solve(ints(line(0)), Integer.parseInt(line(1)))) System.out.println(joinList(c));", "static List<List<Integer>> solve(int[] c, int target) {\n    // TODO\n    return new ArrayList<>();\n}",
None,
A("Backtracking with sorted pruning", """static List<List<Integer>> solve(int[] c, int target) {
    int[] s = c.clone(); Arrays.sort(s);
    List<List<Integer>> out = new ArrayList<>();
    bt(s, 0, target, new ArrayList<>(), out);
    return out;
}
static void bt(int[] c, int start, int rem, List<Integer> path, List<List<Integer>> out) {
    if (rem == 0) { out.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length && c[i] <= rem; i++) {
        path.add(c[i]); bt(c, i, rem - c[i], path, out); path.remove(path.size() - 1);
    }
}""", "Choose the next candidate ≥ the previous one; prune when it overshoots.", ["Sort.", "Recurse from the same index (reuse allowed).", "Break when c[i] > remaining."], ["bt(start, rem): rem==0 → record", "    for i ≥ start while c[i] ≤ rem: choose, bt(i, rem-c[i]), undo"], "exponential in target", "O(target)", "Non-decreasing order makes each multiset appear once.", "Output-sensitive; brute force over all multisets is strictly worse and omitted."),
[("2 3 6 7\n7", "2 2 3\n7"), ("2 3 5\n8", "2 2 2 2\n2 3 3\n3 5"), ("2\n1", "")],
viz_opt={"algorithm": "rec-combination-sum", "input": {"candidates": [2, 3, 6, 7], "target": 7}})

# ---------------------------------------------------------------- dynamic programming
problem("climbing-stairs", "Stair Hopper", "dynamic-programming", "EASY", ["1-D DP", "Fibonacci"],
"""You can climb 1 or 2 steps at a time. Print the number of distinct ways to reach step n.""",
"Line 1: n.", "Number of ways.", ["1 ≤ n ≤ 80"], ["The last move was 1 or 2 steps: ways(n) = ways(n−1) + ways(n−2)."], ["n = 1", "Large n needs long"],
N_MAIN, "static long solve(int n) {\n    // TODO\n    return 0;\n}",
A("Plain recursion", """static long solve(int n) {
    if (n <= 1) return 1;
    if (n > 35) return fast(n);
    return solve(n - 1) + solve(n - 2);
}
static long fast(int n) { long a = 1, b = 1; for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; } return b; }""", "Recurse on the last move (guarded for big n so tests finish).", ["ways(n) = ways(n−1) + ways(n−2)."], ["f(n) = n<=1 ? 1 : f(n-1) + f(n-2)"], "O(φⁿ)", "O(n)", "Recurrence is exact.", "Exponential — recomputes subproblems."),
A("Tabulation with two variables", """static long solve(int n) {
    long a = 1, b = 1;
    for (int i = 2; i <= n; i++) { long t = a + b; a = b; b = t; }
    return b;
}""", "Each state depends only on the previous two.", ["Roll two variables forward."], ["a = b = 1", "repeat: (a, b) = (b, a + b)"], "O(n)", "O(1)", "Bottom-up evaluation of the recurrence.", "—"),
[("2", "2"), ("3", "3"), ("1", "1"), ("10", "89"), ("80", "37889062373143906")],
viz_brute={"algorithm": "dp-fib-memo", "input": {"n": 6, "memo": "false"}},
viz_opt={"algorithm": "dp-climbing-stairs", "input": {"n": 7}})

problem("coin-change", "Fewest Coins", "dynamic-programming", "MEDIUM", ["unbounded knapsack", "1-D DP"],
"""Given coin denominations (unlimited supply), print the fewest coins that make amount, or −1.""",
"Line 1: coins.\nLine 2: amount.", "Minimum coins or −1.", ["1 ≤ coins ≤ 12", "0 ≤ amount ≤ 10^4"], ["Greedy fails (coins 1 3 4, amount 6).", "best[a] = 1 + min best[a − c]."], ["amount = 0", "Impossible amount"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static int solve(int[] coins, int amount) {\n    // TODO\n    return -1;\n}",
A("Memoized recursion", """static int solve(int[] coins, int amount) {
    int[] memo = new int[amount + 1];
    Arrays.fill(memo, -2);
    return go(coins, amount, memo);
}
static int go(int[] c, int a, int[] memo) {
    if (a == 0) return 0;
    if (memo[a] != -2) return memo[a];
    int best = -1;
    for (int x : c) if (x <= a) { int r = go(c, a - x, memo); if (r >= 0 && (best < 0 || r + 1 < best)) best = r + 1; }
    return memo[a] = best;
}""", "Top-down: try every last coin, cache results.", ["Recurse on amount − coin.", "Memoise."], ["f(a) = 0 if a==0 else 1 + min f(a-c)"], "O(amount·k)", "O(amount)", "Optimal substructure.", "Recursion depth = amount."),
A("Bottom-up table", """static int solve(int[] coins, int amount) {
    int[] best = new int[amount + 1];
    Arrays.fill(best, Integer.MAX_VALUE);
    best[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins) if (c <= a && best[a - c] != Integer.MAX_VALUE) best[a] = Math.min(best[a], best[a - c] + 1);
    return best[amount] == Integer.MAX_VALUE ? -1 : best[amount];
}""", "Fill amounts from small to large.", ["best[0] = 0.", "For each amount, try each coin."], ["best[a] = min over c of best[a-c] + 1"], "O(amount·k)", "O(amount)", "Every smaller amount is final when used.", "—"),
[("1 2 5\n11", "3"), ("2\n3", "-1"), ("1\n0", "0"), ("1 3 4\n6", "2"), ("186 419 83 408\n6249", "20")],
viz_opt={"algorithm": "dp-coin-change", "input": {"coins": [1, 3, 4], "amount": 6}})

problem("longest-common-subsequence", "Shared Storyline", "dynamic-programming", "MEDIUM", ["2-D DP"],
"""Print the length of the longest common subsequence of two strings.""",
"Line 1: a.\nLine 2: b.", "The LCS length.", ["1 ≤ |a|, |b| ≤ 1000"], ["dp[i][j] = dp[i−1][j−1] + 1 on a match, else max(up, left)."], ["No common characters"],
"System.out.println(solve(line(0), line(1)));", "static int solve(String a, String b) {\n    // TODO\n    return 0;\n}",
A("Recursion with memo", """static int[][] memo;
static int solve(String a, String b) {
    memo = new int[a.length()][b.length()];
    for (int[] r : memo) Arrays.fill(r, -1);
    return go(a, b, 0, 0);
}
static int go(String a, String b, int i, int j) {
    if (i == a.length() || j == b.length()) return 0;
    if (memo[i][j] >= 0) return memo[i][j];
    return memo[i][j] = a.charAt(i) == b.charAt(j) ? 1 + go(a, b, i + 1, j + 1) : Math.max(go(a, b, i + 1, j), go(a, b, i, j + 1));
}""", "Top-down on suffixes.", ["Match → advance both.", "Else best of skipping either."], ["f(i,j) = match ? 1+f(i+1,j+1) : max(f(i+1,j), f(i,j+1))"], "O(mn)", "O(mn)", "Standard recurrence.", "Deep recursion."),
A("Tabulation", """static int solve(String a, String b) {
    int[][] dp = new int[a.length() + 1][b.length() + 1];
    for (int i = 1; i <= a.length(); i++)
        for (int j = 1; j <= b.length(); j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[a.length()][b.length()];
}""", "Fill prefix pairs row by row.", ["dp over prefixes."], ["dp[i][j] = match ? diag+1 : max(up, left)"], "O(mn)", "O(mn)", "Each cell depends on already-computed neighbours.", "Space can be reduced to O(n)."),
[("abcde\nace", "3"), ("abc\nabc", "3"), ("abc\ndef", "0"), ("ABCBDAB\nBDCABA", "4")],
viz_opt={"algorithm": "dp-lcs", "input": {"a": "ABCBDAB", "b": "BDCABA"}})

problem("edit-distance", "Fewest Edits", "dynamic-programming", "HARD", ["2-D DP"],
"""Print the minimum number of single-character insertions, deletions or substitutions to turn a into b.""",
"Line 1: a (may be empty).\nLine 2: b (may be empty).", "The edit distance.", ["0 ≤ |a|, |b| ≤ 500"], ["dp[i][j] = cost to convert a[0..i) into b[0..j)."], ["One string empty"],
"System.out.println(solve(L.size() > 0 ? L.get(0) : \"\", L.size() > 1 ? L.get(1) : \"\"));", "static int solve(String a, String b) {\n    // TODO\n    return 0;\n}",
None,
A("Tabulation", """static int solve(String a, String b) {
    int m = a.length(), n = b.length();
    int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = a.charAt(i - 1) == b.charAt(j - 1) ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
    return dp[m][n];
}""", "The last characters either match (free) or one of three edits is applied last.", ["Base rows: converting to/from empty.", "Fill with min of delete, insert, replace."], ["dp[i][0]=i; dp[0][j]=j", "dp[i][j] = match ? diag : 1+min(diag, up, left)"], "O(mn)", "O(mn)", "Every edit script ends with one of the three operations.", "Plain recursion is exponential and omitted."),
[("horse\nros", "3"), ("intention\nexecution", "5"), ("\nabc", "3"), ("same\nsame", "0")],
viz_opt={"algorithm": "dp-edit-distance", "input": {"a": "horse", "b": "ros"}})

problem("zero-one-knapsack", "Backpack Planner", "dynamic-programming", "MEDIUM", ["0/1 knapsack", "2-D DP"],
"""Each item has a weight and value and can be taken at most once. Print the maximum value within capacity W.""",
"Line 1: weights.\nLine 2: values.\nLine 3: W.", "Maximum value.", ["1 ≤ n ≤ 100", "1 ≤ W ≤ 10^4"], ["Iterate capacity downwards in a 1-D table so each item is used once."], ["Nothing fits"],
"System.out.println(solve(ints(line(0)), ints(line(1)), Integer.parseInt(line(2))));", "static long solve(int[] w, int[] v, int W) {\n    // TODO\n    return 0;\n}",
A("Try every subset", """static long solve(int[] w, int[] v, int W) {
    if (w.length > 20) return dp(w, v, W);
    long best = 0;
    for (int m = 0; m < (1 << w.length); m++) {
        long tw = 0, tv = 0;
        for (int i = 0; i < w.length; i++) if ((m >> i & 1) == 1) { tw += w[i]; tv += v[i]; }
        if (tw <= W) best = Math.max(best, tv);
    }
    return best;
}
static long dp(int[] w, int[] v, int W) { long[] d = new long[W + 1]; for (int i = 0; i < w.length; i++) for (int c = W; c >= w[i]; c--) d[c] = Math.max(d[c], d[c - w[i]] + v[i]); return d[W]; }""", "Enumerate all 2ⁿ selections.", ["Bitmask over items."], ["for each subset: if fits: best = max"], "O(2ⁿ·n)", "O(1)", "Exhaustive.", "Exponential."),
A("1-D DP, capacity descending", """static long solve(int[] w, int[] v, int W) {
    long[] d = new long[W + 1];
    for (int i = 0; i < w.length; i++)
        for (int c = W; c >= w[i]; c--) d[c] = Math.max(d[c], d[c - w[i]] + v[i]);
    return d[W];
}""", "d[c] = best value with capacity c using items so far.", ["For each item, update capacities from high to low."], ["for item: for c from W down to w: d[c] = max(d[c], d[c-w]+v)"], "O(n·W)", "O(W)", "Descending order reads values from before this item, so it's used at most once.", "Pseudo-polynomial in W."),
[("1 3 4 5\n1 4 5 7\n7", "9"), ("5\n10\n4", "0"), ("2 3 4\n3 4 5\n5", "7")],
viz_opt={"algorithm": "dp-knapsack", "input": {"weights": [1, 3, 4, 5], "values": [1, 4, 5, 7], "capacity": 7}})

# ---------------------------------------------------------------- greedy
problem("jump-game", "Stepping Stones", "greedy", "MEDIUM", ["greedy reach"],
"""a[i] is the maximum jump length from stone i. Starting at stone 0, print true if the last stone is reachable.""",
"Line 1: jumps.", "true or false", ["1 ≤ n ≤ 10^4"], ["Track the furthest reachable index while scanning."], ["Single stone", "Zero blocking the way"],
"System.out.println(solve(ints(line(0))));", "static boolean solve(int[] a) {\n    // TODO\n    return false;\n}",
A("DP reachability", """static boolean solve(int[] a) {
    boolean[] ok = new boolean[a.length];
    ok[0] = true;
    for (int i = 0; i < a.length; i++) if (ok[i]) for (int j = 1; j <= a[i] && i + j < a.length; j++) ok[i + j] = true;
    return ok[a.length - 1];
}""", "Mark everything reachable.", ["From each reachable i, mark i+1..i+a[i]."], ["ok[0]=true; spread marks"], "O(n·max a)", "O(n)", "Exhaustive marking.", "Slow with large jumps."),
A("Greedy furthest reach", """static boolean solve(int[] a) {
    int reach = 0;
    for (int i = 0; i < a.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + a[i]);
    }
    return true;
}""", "Reachable positions form a prefix; just track its end.", ["If i is beyond reach, stop.", "Extend reach."], ["reach=0; for i: if i>reach: false; reach=max(reach, i+a[i])", "true"], "O(n)", "O(1)", "The reachable set is always a contiguous prefix.", "—"),
[("2 3 1 1 4", "true"), ("3 2 1 0 4", "false"), ("0", "true"), ("1 0 1", "false")])

problem("assign-cookies", "Snack Matching", "greedy", "EASY", ["greedy", "sorting", "two pointers"],
"""Child i is content with a snack of size ≥ g[i]; each snack goes to at most one child. Print the maximum number of content children.""",
"Line 1: greed factors.\nLine 2: snack sizes (may be empty).", "The count.", ["1 ≤ n ≤ 3·10^4"], ["Give the smallest sufficient snack to the least greedy child."], ["No snacks"],
"System.out.println(solve(ints(line(0)), ints(line(1))));", "static int solve(int[] g, int[] s) {\n    // TODO\n    return 0;\n}",
None,
A("Sort both, two pointers", """static int solve(int[] g, int[] s) {
    int[] a = g.clone(), b = s.clone();
    Arrays.sort(a); Arrays.sort(b);
    int i = 0;
    for (int j = 0; j < b.length && i < a.length; j++) if (b[j] >= a[i]) i++;
    return i;
}""", "Never waste a big snack on a child a small one could satisfy.", ["Sort children and snacks.", "Walk snacks; satisfy the next child when possible."], ["sort g, s; i=0", "for snack: if snack ≥ g[i]: i++", "return i"], "O(n log n)", "O(n)", "Exchange argument: any optimal assignment can be rearranged into the greedy one.", "Brute-force matching is exponential and omitted."),
[("1 2 3\n1 1", "1"), ("1 2\n1 2 3", "2"), ("5\n", "0")])

problem("min-arrows-balloons", "Pop Every Balloon", "greedy", "HARD", ["interval scheduling", "greedy by end"],
"""Balloons span horizontal ranges [s, e]. An arrow shot at x pops every balloon with s ≤ x ≤ e. Print the minimum arrows needed.""",
"Line 1: n.\nNext n lines: s e.", "Minimum arrows.", ["1 ≤ n ≤ 10^5"], ["Sort by end; shoot at the earliest end, skip balloons it pops."], ["Touching endpoints count as overlap"],
"""int n = Integer.parseInt(line(0));
int[][] b = new int[n][];
for (int i = 0; i < n; i++) b[i] = ints(line(1 + i));
System.out.println(solve(b));""",
"static int solve(int[][] b) {\n    // TODO\n    return 0;\n}",
None,
A("Greedy by end point", """static int solve(int[][] b) {
    int[][] s = b.clone();
    Arrays.sort(s, (x, y) -> Integer.compare(x[1], y[1]));
    int arrows = 0; long last = Long.MIN_VALUE;
    for (int[] x : s) if (x[0] > last) { arrows++; last = x[1]; }
    return arrows;
}""", "The balloon ending first must be popped by some arrow; shooting at its end pops the most others.", ["Sort by end.", "If a balloon starts after the last arrow, shoot at its end."], ["sort by end", "for b: if b.start > last: arrows++; last = b.end"], "O(n log n)", "O(1)", "Stays ahead: greedy uses no more arrows than any solution after each balloon.", "Trying all arrow placements is exponential and omitted."),
[("4\n10 16\n2 8\n1 6\n7 12", "2"), ("4\n1 2\n3 4\n5 6\n7 8", "4"), ("4\n1 2\n2 3\n3 4\n4 5", "2")],
viz_opt={"algorithm": "pattern-merge-intervals", "input": {"intervals": "10-16, 2-8, 1-6, 7-12"}})

# ---------------------------------------------------------------- intervals
IV_MAIN = """int n = Integer.parseInt(line(0));
int[][] iv = new int[n][];
for (int i = 0; i < n; i++) iv[i] = ints(line(1 + i));"""

problem("merge-intervals", "Merge Bookings", "intervals", "MEDIUM", ["sorting", "sweep"],
"""Merge all overlapping intervals (touching endpoints merge) and print the result sorted by start, one per line.""",
"Line 1: n.\nNext n lines: start end.", "Merged intervals.", ["1 ≤ n ≤ 10^4"], ["After sorting by start, an interval overlaps the last merged one iff it starts ≤ that end."], ["Nested intervals", "Touching endpoints"],
IV_MAIN + "\nfor (int[] x : solve(iv)) System.out.println(x[0] + \" \" + x[1]);", "static List<int[]> solve(int[][] iv) {\n    // TODO\n    return new ArrayList<>();\n}",
None,
A("Sort and sweep", """static List<int[]> solve(int[][] iv) {
    int[][] s = iv.clone();
    Arrays.sort(s, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> out = new ArrayList<>();
    for (int[] x : s) {
        if (!out.isEmpty() && x[0] <= out.get(out.size() - 1)[1]) out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], x[1]);
        else out.add(new int[]{x[0], x[1]});
    }
    return out;
}""", "Sorted by start, overlaps are adjacent.", ["Sort.", "Extend or start a new interval."], ["sort by start", "for x: overlap? extend : append"], "O(n log n)", "O(n)", "Any interval overlapping the merged block must come before the next gap.", "A pairwise merge-until-stable approach is O(n²) and omitted."),
[("4\n1 3\n2 6\n8 10\n15 18", "1 6\n8 10\n15 18"), ("2\n1 4\n4 5", "1 5"), ("2\n1 4\n2 3", "1 4"), ("1\n5 5", "5 5")],
viz_opt={"algorithm": "pattern-merge-intervals", "input": {"intervals": "1-3, 2-6, 8-10, 15-18"}})

problem("meeting-rooms", "Can One Person Attend?", "intervals", "EASY", ["sorting"],
"""Print true if a single person can attend all meetings (no two overlap; a meeting ending at t and one starting at t do not overlap).""",
"Line 1: n.\nNext n lines: start end.", "true or false", ["0 ≤ n ≤ 10^4"], ["Sort by start and compare neighbours."], ["Back-to-back meetings"],
IV_MAIN + "\nSystem.out.println(solve(iv));", "static boolean solve(int[][] iv) {\n    // TODO\n    return true;\n}",
A("Compare all pairs", """static boolean solve(int[][] iv) {
    for (int i = 0; i < iv.length; i++) for (int j = i + 1; j < iv.length; j++)
        if (iv[i][0] < iv[j][1] && iv[j][0] < iv[i][1]) return false;
    return true;
}""", "Check every pair for overlap.", ["Two intervals overlap iff each starts before the other ends."], ["for pairs: if overlap: false"], "O(n²)", "O(1)", "Exhaustive.", "Quadratic."),
A("Sort by start", """static boolean solve(int[][] iv) {
    int[][] s = iv.clone();
    Arrays.sort(s, (a, b) -> Integer.compare(a[0], b[0]));
    for (int i = 1; i < s.length; i++) if (s[i][0] < s[i - 1][1]) return false;
    return true;
}""", "After sorting, only neighbours can conflict first.", ["Sort.", "Check each start against the previous end."], ["sort; any s[i].start < s[i-1].end → false"], "O(n log n)", "O(1)", "If any pair overlaps, some adjacent pair does.", "—"),
[("3\n0 30\n5 10\n15 20", "false"), ("2\n7 10\n2 4", "true"), ("2\n1 2\n2 3", "true"), ("0", "true")])

problem("min-meeting-rooms", "How Many Rooms?", "intervals", "HARD", ["sweep line", "min-heap"],
"""Print the minimum number of rooms needed so that all meetings can take place (a meeting ending at t frees its room for one starting at t).""",
"Line 1: n.\nNext n lines: start end.", "Rooms needed.", ["1 ≤ n ≤ 10^4"], ["Process meetings by start time; reuse the room that frees earliest.", "Or sweep sorted starts and ends separately."], ["All overlapping", "Back-to-back"],
IV_MAIN + "\nSystem.out.println(solve(iv));", "static int solve(int[][] iv) {\n    // TODO\n    return 0;\n}",
A("Count overlap at every start", """static int solve(int[][] iv) {
    int best = 0;
    for (int[] a : iv) {
        int c = 0;
        for (int[] b : iv) if (b[0] <= a[0] && a[0] < b[1]) c++;
        best = Math.max(best, c);
    }
    return best;
}""", "The peak load occurs at some start time.", ["For each start, count meetings active then."], ["max over starts of #active"], "O(n²)", "O(1)", "Load only increases at start times.", "Quadratic."),
A("Min-heap of end times", """static int solve(int[][] iv) {
    int[][] s = iv.clone();
    Arrays.sort(s, (a, b) -> Integer.compare(a[0], b[0]));
    PriorityQueue<Integer> ends = new PriorityQueue<>();
    for (int[] x : s) {
        if (!ends.isEmpty() && ends.peek() <= x[0]) ends.poll();
        ends.add(x[1]);
    }
    return ends.size();
}""", "The heap holds end times of rooms in use; reuse the earliest-free room.", ["Sort by start.", "Free the earliest-ending room if done.", "Allocate for the current meeting."], ["sort by start", "for m: if min end ≤ m.start: pop", "    push m.end", "return heap size"], "O(n log n)", "O(n)", "Heap size never drops, and peaks at the max concurrent meetings.", "—"),
[("3\n0 30\n5 10\n15 20", "2"), ("2\n7 10\n2 4", "1"), ("3\n1 5\n2 6\n3 7", "3"), ("2\n1 2\n2 3", "1")])

# ---------------------------------------------------------------- bit manipulation
problem("single-number", "The Lonely Value", "bit-manipulation", "EASY", ["XOR"],
"""Every value appears twice except one. Print the one that appears once, using O(1) extra space.""",
"Line 1: values.", "The single value.", ["1 ≤ n ≤ 3·10^4 (odd)"], ["x ^ x = 0 and x ^ 0 = x."], ["Negative numbers"],
"System.out.println(solve(ints(line(0))));", "static int solve(int[] a) {\n    // TODO\n    return 0;\n}",
A("Count with a map", """static int solve(int[] a) {
    Map<Integer, Integer> c = new HashMap<>();
    for (int x : a) c.merge(x, 1, Integer::sum);
    for (var e : c.entrySet()) if (e.getValue() == 1) return e.getKey();
    return 0;
}""", "Count occurrences.", ["Count; return the value seen once."], ["counts; find count 1"], "O(n)", "O(n)", "Direct.", "O(n) memory."),
A("XOR everything", """static int solve(int[] a) {
    int x = 0;
    for (int v : a) x ^= v;
    return x;
}""", "Pairs cancel under XOR.", ["XOR all values."], ["x = 0; for v: x ^= v"], "O(n)", "O(1)", "XOR is associative, commutative and self-inverse.", "—"),
[("2 2 1", "1"), ("4 1 2 1 2", "4"), ("1", "1"), ("-3 7 -3", "7")])

problem("counting-bits", "Bits in Every Number", "bit-manipulation", "MEDIUM", ["DP on bits"],
"""For every i in 0..n print the number of 1 bits in i.""",
"Line 1: n.", "n+1 counts.", ["0 ≤ n ≤ 10^5"], ["bits(i) = bits(i >> 1) + (i & 1)."], ["n = 0"],
"System.out.println(join(solve(Integer.parseInt(line(0)))));", "static int[] solve(int n) {\n    // TODO\n    return new int[n + 1];\n}",
A("Count each number", """static int[] solve(int n) {
    int[] r = new int[n + 1];
    for (int i = 0; i <= n; i++) { int x = i; while (x != 0) { r[i] += x & 1; x >>>= 1; } }
    return r;
}""", "Shift and count per number.", ["Loop bits of each i."], ["for i: count bits"], "O(n log n)", "O(1) extra", "Direct.", "Redundant work."),
A("Reuse smaller answers", """static int[] solve(int n) {
    int[] r = new int[n + 1];
    for (int i = 1; i <= n; i++) r[i] = r[i >> 1] + (i & 1);
    return r;
}""", "Dropping the last bit gives a smaller, already-solved number.", ["r[i] = r[i/2] + lowest bit."], ["r[0]=0; r[i] = r[i>>1] + (i&1)"], "O(n)", "O(1) extra", "i>>1 < i, so its answer is ready.", "—"),
[("2", "0 1 1"), ("5", "0 1 1 2 1 2"), ("0", "0")])

problem("max-xor-pair", "Most Different Pair", "bit-manipulation", "HARD", ["binary trie", "greedy bits"],
"""Print the maximum value of a[i] XOR a[j] over all pairs (i may equal j).""",
"Line 1: non-negative integers.", "The maximum XOR.", ["1 ≤ n ≤ 2·10^5", "0 ≤ a[i] < 2^31"], ["Greedily prefer the opposite bit from the top down.", "A binary trie stores all prefixes."], ["Single element → 0"],
"System.out.println(solve(ints(line(0))));", "static int solve(int[] a) {\n    // TODO\n    return 0;\n}",
A("All pairs", """static int solve(int[] a) {
    int best = 0;
    for (int i = 0; i < a.length; i++) for (int j = i; j < a.length; j++) best = Math.max(best, a[i] ^ a[j]);
    return best;
}""", "Try every pair.", ["Double loop."], ["max over pairs"], "O(n²)", "O(1)", "Exhaustive.", "Quadratic."),
A("Binary trie", """static int solve(int[] a) {
    int[][] t = new int[a.length * 31 + 1][2];
    int nodes = 1, best = 0;
    for (int x : a) {
        int c = 0;
        for (int b = 30; b >= 0; b--) { int bit = x >> b & 1; if (t[c][bit] == 0) t[c][bit] = nodes++; c = t[c][bit]; }
        int q = 0, v = 0;
        for (int b = 30; b >= 0; b--) {
            int want = (x >> b & 1) ^ 1;
            if (t[q][want] != 0) { v |= 1 << b; q = t[q][want]; } else q = t[q][want ^ 1];
        }
        best = Math.max(best, v);
    }
    return best;
}""", "From the highest bit down, choose the branch that sets that XOR bit if possible.", ["Insert each number's bits into a trie.", "Query greedily for the opposite bit."], ["for x: insert(x); best = max(best, query(x))", "query: at each bit prefer opposite child"], "O(31·n)", "O(31·n)", "A higher bit outweighs all lower bits combined, so greed is optimal.", "Memory for the trie."),
[("3 10 5 25 2 8", "28"), ("0", "0"), ("14 70 53 83 49 91 36 80 92 51 66 70", "127")])

# ---------------------------------------------------------------- matrix
MAT_MAIN = """int r = Integer.parseInt(line(0));
int[][] m = new int[r][];
for (int i = 0; i < r; i++) m[i] = ints(line(1 + i));"""

problem("transpose-matrix", "Flip the Grid", "matrix", "EASY", ["index mapping"],
"""Print the transpose of the matrix (rows become columns).""",
"Line 1: rows R.\nNext R lines: rows.", "The transposed matrix.", ["1 ≤ R, C ≤ 1000"], ["t[j][i] = m[i][j]."], ["Non-square", "Single row"],
MAT_MAIN + "\nfor (int[] row : solve(m)) System.out.println(join(row));", "static int[][] solve(int[][] m) {\n    // TODO\n    return m;\n}",
None,
A("New matrix", """static int[][] solve(int[][] m) {
    int[][] t = new int[m[0].length][m.length];
    for (int i = 0; i < m.length; i++) for (int j = 0; j < m[0].length; j++) t[j][i] = m[i][j];
    return t;
}""", "Swap row and column indices.", ["Allocate C×R.", "Copy with swapped indices."], ["t[j][i] = m[i][j]"], "O(RC)", "O(RC)", "Definition.", "Each element must be visited, so this is optimal."),
[("2\n1 2 3\n4 5 6", "1 4\n2 5\n3 6"), ("1\n7", "7")])

problem("rotate-image", "Turn the Photo", "matrix", "MEDIUM", ["transpose + reverse", "in-place"],
"""Rotate an n×n matrix 90° clockwise in place and print it.""",
"Line 1: n.\nNext n lines: rows.", "The rotated matrix.", ["1 ≤ n ≤ 20"], ["Clockwise rotation = transpose, then reverse each row."], ["n = 1"],
MAT_MAIN + "\nfor (int[] row : solve(m)) System.out.println(join(row));", "static int[][] solve(int[][] m) {\n    // TODO\n    return m;\n}",
A("Copy into a new matrix", """static int[][] solve(int[][] m) {
    int n = m.length;
    int[][] r = new int[n][n];
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) r[j][n - 1 - i] = m[i][j];
    return r;
}""", "Element (i, j) moves to (j, n−1−i).", ["Map indices into a new matrix."], ["r[j][n-1-i] = m[i][j]"], "O(n²)", "O(n²)", "Rotation formula.", "Not in place."),
A("Transpose then reverse rows", """static int[][] solve(int[][] m) {
    int n = m.length;
    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }
    for (int[] row : m) for (int a = 0, b = n - 1; a < b; a++, b--) { int t = row[a]; row[a] = row[b]; row[b] = t; }
    return m;
}""", "Two reflections compose into a rotation.", ["Transpose in place.", "Reverse each row."], ["transpose", "reverse rows"], "O(n²)", "O(1)", "Reflection over the diagonal then the vertical axis equals a 90° clockwise rotation.", "—"),
[("3\n1 2 3\n4 5 6\n7 8 9", "7 4 1\n8 5 2\n9 6 3"), ("1\n5", "5"), ("2\n1 2\n3 4", "3 1\n4 2")])

problem("spiral-matrix", "Spiral Reader", "matrix", "MEDIUM", ["boundary simulation"],
"""Print the matrix elements in clockwise spiral order starting from the top-left.""",
"Line 1: rows R.\nNext R lines: rows.", "Elements in spiral order.", ["1 ≤ R, C ≤ 10"], ["Shrink four boundaries: top, bottom, left, right."], ["Single row", "Single column"],
MAT_MAIN + "\nSystem.out.println(joinList(solve(m)));", "static List<Integer> solve(int[][] m) {\n    // TODO\n    return new ArrayList<>();\n}",
None,
A("Shrinking boundaries", """static List<Integer> solve(int[][] m) {
    List<Integer> out = new ArrayList<>();
    int t = 0, b = m.length - 1, l = 0, r = m[0].length - 1;
    while (t <= b && l <= r) {
        for (int j = l; j <= r; j++) out.add(m[t][j]);
        for (int i = t + 1; i <= b; i++) out.add(m[i][r]);
        if (t < b) for (int j = r - 1; j >= l; j--) out.add(m[b][j]);
        if (l < r) for (int i = b - 1; i > t; i--) out.add(m[i][l]);
        t++; b--; l++; r--;
    }
    return out;
}""", "Peel the matrix layer by layer.", ["Read top row, right column, bottom row, left column.", "Shrink boundaries; guard single row/column."], ["while t≤b and l≤r: read 4 sides; shrink"], "O(RC)", "O(1) extra", "Each layer is read exactly once.", "—"),
[("3\n1 2 3\n4 5 6\n7 8 9", "1 2 3 6 9 8 7 4 5"), ("3\n1 2 3 4\n5 6 7 8\n9 10 11 12", "1 2 3 4 8 12 11 10 9 5 6 7"), ("1\n1 2", "1 2"), ("2\n1\n2", "1 2")])

problem("search-2d-matrix", "Find in a Sorted Grid", "matrix", "HARD", ["staircase search"],
"""Each row and each column of the matrix is sorted ascending. Print true if target is present, in O(R + C).""",
"Line 1: rows R.\nNext R lines: rows.\nLast line: target.", "true or false", ["1 ≤ R, C ≤ 300"], ["Start at the top-right corner: moving left decreases, moving down increases."], ["Target smaller than everything"],
MAT_MAIN + "\nSystem.out.println(solve(m, Integer.parseInt(line(1 + r))));", "static boolean solve(int[][] m, int t) {\n    // TODO\n    return false;\n}",
A("Binary search each row", """static boolean solve(int[][] m, int t) {
    for (int[] row : m) if (Arrays.binarySearch(row, t) >= 0) return true;
    return false;
}""", "Each row is sorted.", ["Binary search every row."], ["for row: binarySearch"], "O(R log C)", "O(1)", "Exhaustive over rows.", "Ignores column order."),
A("Staircase from top-right", """static boolean solve(int[][] m, int t) {
    int i = 0, j = m[0].length - 1;
    while (i < m.length && j >= 0) {
        if (m[i][j] == t) return true;
        if (m[i][j] > t) j--; else i++;
    }
    return false;
}""", "From the top-right corner every comparison eliminates a row or a column.", ["Too big → move left.", "Too small → move down."], ["i=0, j=C-1", "while in bounds: equal → true; > → j--; < → i++"], "O(R + C)", "O(1)", "Everything left of / below the eliminated line is ruled out by sortedness.", "—"),
[("5\n1 4 7 11 15\n2 5 8 12 19\n3 6 9 16 22\n10 13 14 17 24\n18 21 23 26 30\n5", "true"), ("5\n1 4 7 11 15\n2 5 8 12 19\n3 6 9 16 22\n10 13 14 17 24\n18 21 23 26 30\n20", "false"), ("1\n-5\n-5", "true")])

problem("group-anagrams", "Group Anagrams", "hash-maps", "HARD", ["canonical keys", "hash map"],
"""Group the words that are anagrams of each other. Print each group on its own line with words in input order; order the groups by the first appearance of their first word.""",
"Line 1: words.", "Groups, one per line.", ["1 ≤ n ≤ 10^4"], ["Anagrams share the same sorted letters — use that as a key."], ["Single word", "Duplicate words"],
"for (List<String> g : solve(line(0).split(\" \"))) System.out.println(String.join(\" \", g));", "static List<List<String>> solve(String[] w) {\n    // TODO\n    return new ArrayList<>();\n}",
A("Compare with every group", """static List<List<String>> solve(String[] w) {
    List<List<String>> groups = new ArrayList<>();
    outer:
    for (String s : w) {
        for (List<String> g : groups) if (same(g.get(0), s)) { g.add(s); continue outer; }
        groups.add(new ArrayList<>(List.of(s)));
    }
    return groups;
}
static boolean same(String a, String b) {
    if (a.length() != b.length()) return false;
    int[] c = new int[128];
    for (int i = 0; i < a.length(); i++) { c[a.charAt(i)]++; c[b.charAt(i)]--; }
    for (int x : c) if (x != 0) return false;
    return true;
}""", "Test each word against each existing group's representative.", ["Linear search for a matching group."], ["for word: find group with anagram rep, else new group"], "O(n·g·L)", "O(nL)", "Anagram relation is an equivalence.", "Quadratic in the number of groups."),
A("Sorted-letter keys", """static List<List<String>> solve(String[] w) {
    Map<String, List<String>> m = new LinkedHashMap<>();
    for (String s : w) {
        char[] c = s.toCharArray(); Arrays.sort(c);
        m.computeIfAbsent(new String(c), k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(m.values());
}""", "Map each word to a canonical key.", ["key = sorted letters.", "LinkedHashMap preserves first-appearance order."], ["for w: groups[sorted(w)].append(w)"], "O(n·L log L)", "O(nL)", "Equal keys ⇔ anagrams.", "—"),
[("eat tea tan ate nat bat", "eat tea ate\ntan nat\nbat"), ("a", "a"), ("ab ba ab", "ab ba ab")])
