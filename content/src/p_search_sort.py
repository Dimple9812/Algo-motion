from common import problem, A

problem("binary-search", "Guess the Shelf", "binary-search", "EASY", ["binary search"],
"""Books are sorted by ID on a shelf. Print the position (0-based) of the target ID, or −1 if absent.""",
"Line 1: sorted IDs (distinct).\nLine 2: target.", "Index or −1.", ["1 ≤ n ≤ 10^5"], ["Compare with the middle and discard half."], ["Target smaller than all", "Single element"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static int solve(int[] a, int t) {\n    // TODO\n    return -1;\n}",
A("Linear scan", """static int solve(int[] a, int t) {
    for (int i = 0; i < a.length; i++) if (a[i] == t) return i;
    return -1;
}""", "Check every position.", ["Scan left to right."], ["for i: if a[i]==t: return i", "return -1"], "O(n)", "O(1)", "Exhaustive.", "Ignores sortedness."),
A("Binary search", """static int solve(int[] a, int t) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == t) return mid;
        if (a[mid] < t) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}""", "Sortedness tells you which half can contain the target.", ["lo, hi bound the search.", "Compare a[mid]; shrink the range."], ["lo=0, hi=n-1", "while lo<=hi: mid; compare; move lo or hi", "return -1"], "O(log n)", "O(1)", "Invariant: if t is present it lies in [lo, hi].", "mid = lo + (hi − lo)/2 avoids overflow."),
[("-1 0 3 5 9 12\n9", "4"), ("-1 0 3 5 9 12\n2", "-1"), ("5\n5", "0"), ("1 3\n0", "-1")],
viz_brute={"algorithm": "linear-search", "input": {"values": [-1, 0, 3, 5, 9, 12], "target": 9}},
viz_opt={"algorithm": "binary-search", "input": {"values": [-1, 0, 3, 5, 9, 12], "target": 9}})

problem("search-rotated-array", "Search a Rotated Shelf", "binary-search", "MEDIUM", ["modified binary search"],
"""A sorted array of distinct values was rotated at an unknown pivot (e.g. 4 5 6 7 0 1 2). Find the index of target in O(log n), or −1.""",
"Line 1: the rotated array.\nLine 2: target.", "Index or −1.", ["1 ≤ n ≤ 5000", "distinct values"], ["One half around mid is always sorted.", "Check whether the target lies inside the sorted half."], ["Not rotated", "Pivot at the end"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static int solve(int[] a, int t) {\n    // TODO\n    return -1;\n}",
A("Linear scan", """static int solve(int[] a, int t) {
    for (int i = 0; i < a.length; i++) if (a[i] == t) return i;
    return -1;
}""", "Ignore the structure.", ["Scan."], ["linear search"], "O(n)", "O(1)", "Exhaustive.", "Not logarithmic."),
A("Binary search on the sorted half", """static int solve(int[] a, int t) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;
        if (a[mid] == t) return mid;
        if (a[lo] <= a[mid]) {
            if (a[lo] <= t && t < a[mid]) hi = mid - 1; else lo = mid + 1;
        } else {
            if (a[mid] < t && t <= a[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}""", "Identify the sorted half, test membership by its endpoints.", ["If a[lo] ≤ a[mid], left half sorted.", "Else right half sorted.", "Keep the half that could hold t."], ["if left sorted: t in [a[lo], a[mid]) ? go left : go right", "else: t in (a[mid], a[hi]] ? go right : go left"], "O(log n)", "O(1)", "Exactly one half is guaranteed sorted when values are distinct.", "Fails with duplicates (needs extra handling)."),
[("4 5 6 7 0 1 2\n0", "4"), ("4 5 6 7 0 1 2\n3", "-1"), ("1\n0", "-1"), ("1 3\n3", "1"), ("5 1 3\n5", "0")],
viz_opt={"algorithm": "search-rotated", "input": {"values": [4, 5, 6, 7, 0, 1, 2], "target": 0}})

problem("split-array-largest-sum", "Fair Workload Split", "binary-search", "HARD", ["binary search on the answer", "greedy check"],
"""Split the tasks (in order, without reordering) into exactly m contiguous groups to minimise the largest group total. Print that minimum largest total.""",
"Line 1: task sizes (non-negative).\nLine 2: m.", "The minimum possible largest sum.", ["1 ≤ m ≤ n ≤ 1000"], ["If a cap X is feasible, any bigger cap is too — monotonic.", "Greedy: start a new group when adding the next task would exceed X."], ["m = 1", "m = n"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static long solve(int[] a, int m) {\n    // TODO\n    return 0;\n}",
A("DP over split points", """static long solve(int[] a, int m) {
    int n = a.length;
    long[] p = new long[n + 1];
    for (int i = 0; i < n; i++) p[i + 1] = p[i] + a[i];
    long[][] dp = new long[m + 1][n + 1];
    for (long[] r : dp) Arrays.fill(r, Long.MAX_VALUE);
    dp[0][0] = 0;
    for (int k = 1; k <= m; k++)
        for (int i = 1; i <= n; i++)
            for (int j = k - 1; j < i; j++)
                if (dp[k - 1][j] != Long.MAX_VALUE) dp[k][i] = Math.min(dp[k][i], Math.max(dp[k - 1][j], p[i] - p[j]));
    return dp[m][n];
}""", "dp[k][i] = best largest sum splitting the first i tasks into k groups.", ["Try every last-group start j."], ["dp[k][i] = min_j max(dp[k-1][j], sum(j..i-1))"], "O(m·n²)", "O(m·n)", "Considers every split.", "Cubic-ish."),
A("Binary search the cap", """static long solve(int[] a, int m) {
    long lo = 0, hi = 0;
    for (int x : a) { lo = Math.max(lo, x); hi += x; }
    while (lo < hi) {
        long mid = (lo + hi) / 2;
        if (groups(a, mid) <= m) hi = mid; else lo = mid + 1;
    }
    return lo;
}
static int groups(int[] a, long cap) {
    int g = 1; long s = 0;
    for (int x : a) { if (s + x > cap) { g++; s = 0; } s += x; }
    return g;
}""", "Feasibility of a cap is monotonic, so binary-search the smallest feasible cap.", ["Range [max, sum].", "Greedy count groups for mid.", "≤ m groups ⇒ try smaller."], ["lo = max(a); hi = sum(a)", "while lo<hi: mid; if groups(mid) ≤ m: hi=mid else lo=mid+1"], "O(n log Σ)", "O(1)", "Greedy packing minimises groups for a cap; fewer than m groups can always be split further.", "—"),
[("7 2 5 10 8\n2", "18"), ("1 2 3 4 5\n2", "9"), ("1 4 4\n3", "4"), ("5\n1", "5")],
viz_opt={"algorithm": "pattern-binary-search-answer", "input": {"values": [3, 6, 7, 11], "h": 8}})

problem("sort-colors", "Three-Colour Sort", "sorting", "MEDIUM", ["Dutch national flag", "three pointers"],
"""Sort an array containing only 0, 1 and 2 in one pass and in place.""",
"Line 1: values (0/1/2).", "Sorted values.", ["1 ≤ n ≤ 300"], ["Maintain regions: [0..lo) = 0, [lo..mid) = 1, (hi..n) = 2."], ["All the same", "Already sorted"],
"System.out.println(join(solve(ints(line(0)))));", "static int[] solve(int[] a) {\n    // TODO\n    return a;\n}",
A("Counting sort", """static int[] solve(int[] a) {
    int[] c = new int[3];
    for (int x : a) c[x]++;
    int k = 0;
    for (int v = 0; v < 3; v++) while (c[v]-- > 0) a[k++] = v;
    return a;
}""", "Count each colour then rewrite.", ["Count 0s, 1s, 2s.", "Overwrite."], ["count; rewrite"], "O(n)", "O(1)", "Counting sort on 3 keys.", "Two passes."),
A("Dutch national flag", """static int[] solve(int[] a) {
    int lo = 0, mid = 0, hi = a.length - 1;
    while (mid <= hi) {
        if (a[mid] == 0) { int t = a[lo]; a[lo++] = a[mid]; a[mid++] = t; }
        else if (a[mid] == 1) mid++;
        else { int t = a[hi]; a[hi--] = a[mid]; a[mid] = t; }
    }
    return a;
}""", "Three regions grow as mid scans.", ["0: swap to lo.", "1: skip.", "2: swap to hi (don't advance mid)."], ["while mid ≤ hi: 0→swap lo; 1→mid++; 2→swap hi"], "O(n)", "O(1)", "Region invariants hold after every step.", "Not stable (irrelevant for plain values)."),
[("2 0 2 1 1 0", "0 0 1 1 2 2"), ("2 0 1", "0 1 2"), ("0", "0"), ("1 1 1", "1 1 1")],
viz_opt={"algorithm": "counting-sort", "input": {"values": [2, 0, 2, 1, 1, 0]}})

problem("merge-sort-count-inversions", "Count the Swaps Needed", "sorting", "HARD", ["merge sort", "divide and conquer"],
"""An inversion is a pair i < j with a[i] > a[j]. Print the number of inversions (this equals the number of adjacent swaps bubble sort would perform).""",
"Line 1: the values.", "The inversion count.", ["1 ≤ n ≤ 10^5"], ["During merge, when a right element is taken, it is smaller than every remaining left element."], ["Sorted input → 0", "Reverse sorted → n(n−1)/2", "Duplicates (not inversions)"],
"System.out.println(solve(ints(line(0))));", "static long solve(int[] a) {\n    // TODO\n    return 0;\n}",
A("Check every pair", """static long solve(int[] a) {
    long c = 0;
    for (int i = 0; i < a.length; i++) for (int j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
    return c;
}""", "Definition.", ["Compare all pairs."], ["for i<j: if a[i]>a[j]: c++"], "O(n²)", "O(1)", "Direct.", "Quadratic."),
A("Merge sort counting", """static long solve(int[] a) {
    return sort(a.clone(), new int[a.length], 0, a.length - 1);
}
static long sort(int[] a, int[] buf, int lo, int hi) {
    if (lo >= hi) return 0;
    int mid = (lo + hi) >>> 1;
    long c = sort(a, buf, lo, mid) + sort(a, buf, mid + 1, hi);
    int i = lo, j = mid + 1, k = lo;
    while (i <= mid && j <= hi) {
        if (a[i] <= a[j]) buf[k++] = a[i++];
        else { buf[k++] = a[j++]; c += mid - i + 1; }
    }
    while (i <= mid) buf[k++] = a[i++];
    while (j <= hi) buf[k++] = a[j++];
    System.arraycopy(buf, lo, a, lo, hi - lo + 1);
    return c;
}""", "Inversions = left-half + right-half + cross inversions found while merging.", ["Recurse on halves.", "When taking from the right, add the number of remaining left elements."], ["count(lo,hi) = count(left) + count(right) + crossCount during merge"], "O(n log n)", "O(n)", "Each cross inversion is counted exactly once when its right element is emitted.", "—"),
[("2 4 1 3 5", "3"), ("1 2 3", "0"), ("5 4 3 2 1", "10"), ("1 1 1", "0"), ("3 1 2", "2")],
viz_opt={"algorithm": "merge-sort", "input": {"values": [2, 4, 1, 3, 5]}})

problem("sort-by-frequency", "Popular First", "sorting", "EASY", ["custom comparator", "counting"],
"""Sort numbers by increasing frequency; ties are broken by larger value first. Print the result.""",
"Line 1: values.", "Sorted values.", ["1 ≤ n ≤ 100"], ["Count first, then sort with a comparator using the counts."], ["All distinct", "All equal"],
"System.out.println(join(solve(ints(line(0)))));", "static int[] solve(int[] a) {\n    // TODO\n    return a;\n}",
None,
A("Count + comparator sort", """static int[] solve(int[] a) {
    Map<Integer, Integer> f = new HashMap<>();
    for (int x : a) f.merge(x, 1, Integer::sum);
    Integer[] b = new Integer[a.length];
    for (int i = 0; i < a.length; i++) b[i] = a[i];
    Arrays.sort(b, (x, y) -> !f.get(x).equals(f.get(y)) ? f.get(x) - f.get(y) : y - x);
    for (int i = 0; i < a.length; i++) a[i] = b[i];
    return a;
}""", "Frequency is a sort key; value descending breaks ties.", ["Count frequencies.", "Sort with (freq asc, value desc)."], ["f = counts", "sort by (f[x], -x)"], "O(n log n)", "O(n)", "Comparator encodes the required order.", "Boxing overhead (fine for small n)."),
[("1 1 2 2 2 3", "3 1 1 2 2 2"), ("2 3 1 3 2", "1 3 3 2 2"), ("-1 1 -6 4 5 -6 1 4 1", "5 -1 4 4 -6 -6 1 1 1")],
viz_opt={"algorithm": "insertion-sort", "input": {"values": [1, 1, 2, 2, 2, 3]}})

# ---------------------------------------------------------------- two pointers & sliding window
problem("container-most-water", "Biggest Rain Barrel", "two-pointers", "MEDIUM", ["two pointers", "greedy"],
"""Vertical walls stand at positions 0..n−1 with the given heights. Choose two walls; the water they hold is (distance) × (shorter height). Print the maximum.""",
"Line 1: heights.", "The maximum area.", ["2 ≤ n ≤ 10^5"], ["Start with the widest pair.", "Moving the taller wall inward can never help."], ["Two walls", "Equal heights"],
"System.out.println(solve(ints(line(0))));", "static long solve(int[] h) {\n    // TODO\n    return 0;\n}",
A("All pairs", """static long solve(int[] h) {
    long best = 0;
    for (int i = 0; i < h.length; i++) for (int j = i + 1; j < h.length; j++) best = Math.max(best, (long) (j - i) * Math.min(h[i], h[j]));
    return best;
}""", "Try every pair.", ["Check all i < j."], ["max over pairs"], "O(n²)", "O(1)", "Exhaustive.", "Quadratic."),
A("Two pointers", """static long solve(int[] h) {
    int l = 0, r = h.length - 1;
    long best = 0;
    while (l < r) {
        best = Math.max(best, (long) (r - l) * Math.min(h[l], h[r]));
        if (h[l] < h[r]) l++; else r--;
    }
    return best;
}""", "The shorter wall limits every narrower pair that keeps it, so discard it.", ["Start at both ends.", "Record area; move the shorter side inward."], ["l=0, r=n-1", "while l<r: best = max(...); move shorter"], "O(n)", "O(1)", "Discarded pairs can't beat the area already recorded with the shorter wall.", "—"),
[("1 8 6 2 5 4 8 3 7", "49"), ("1 1", "1"), ("4 3 2 1 4", "16"), ("1 2 1", "2")],
viz_opt={"algorithm": "pattern-two-pointers", "input": {"values": [1, 2, 4, 6, 8, 9], "target": 10}})

problem("trapping-rain-water", "Trapped Rainwater", "two-pointers", "HARD", ["two pointers", "prefix maxima"],
"""Bars of width 1 have the given heights. Print how many units of rain water are trapped after rain.""",
"Line 1: heights.", "Trapped water.", ["1 ≤ n ≤ 2·10^4"], ["Water above i = min(max left, max right) − h[i].", "Process from the side whose max is smaller."], ["Monotonic heights → 0"],
"System.out.println(solve(ints(line(0))));", "static long solve(int[] h) {\n    // TODO\n    return 0;\n}",
A("Prefix/suffix maxima", """static long solve(int[] h) {
    int n = h.length;
    int[] L = new int[n], R = new int[n];
    for (int i = 0; i < n; i++) L[i] = Math.max(i > 0 ? L[i - 1] : 0, h[i]);
    for (int i = n - 1; i >= 0; i--) R[i] = Math.max(i < n - 1 ? R[i + 1] : 0, h[i]);
    long w = 0;
    for (int i = 0; i < n; i++) w += Math.min(L[i], R[i]) - h[i];
    return w;
}""", "Precompute the tallest bar to each side.", ["L[i], R[i] maxima.", "Sum min(L,R) − h."], ["water[i] = min(L[i], R[i]) - h[i]"], "O(n)", "O(n)", "Water level is bounded by the lower of the two tallest walls.", "Two extra arrays."),
A("Two pointers", """static long solve(int[] h) {
    int l = 0, r = h.length - 1, lm = 0, rm = 0;
    long w = 0;
    while (l < r) {
        if (h[l] < h[r]) { lm = Math.max(lm, h[l]); w += lm - h[l]; l++; }
        else { rm = Math.max(rm, h[r]); w += rm - h[r]; r--; }
    }
    return w;
}""", "The lower side's running max is the true bound for that side.", ["Move the pointer with the smaller height.", "Add running max − height."], ["while l<r: process smaller side with its running max"], "O(n)", "O(1)", "The other side is known to have a taller wall, so the smaller running max decides.", "—"),
[("0 1 0 2 1 0 1 3 2 1 2 1", "6"), ("4 2 0 3 2 5", "9"), ("1 2 3", "0"), ("5", "0")])

problem("max-sum-window", "Best k-Day Stretch", "sliding-window", "EASY", ["fixed sliding window"],
"""Print the maximum sum of any k consecutive values.""",
"Line 1: values.\nLine 2: k.", "The maximum window sum.", ["1 ≤ k ≤ n ≤ 10^5"], ["Slide: add the entering value, subtract the leaving one."], ["k = n", "Negative values"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static long solve(int[] a, int k) {\n    // TODO\n    return 0;\n}",
A("Sum each window", """static long solve(int[] a, int k) {
    long best = Long.MIN_VALUE;
    for (int i = 0; i + k <= a.length; i++) { long s = 0; for (int j = i; j < i + k; j++) s += a[j]; best = Math.max(best, s); }
    return best;
}""", "Recompute every window.", ["Sum k values per start."], ["max over i of sum(a[i..i+k-1])"], "O(n·k)", "O(1)", "Direct.", "Repeated work."),
A("Sliding window", """static long solve(int[] a, int k) {
    long s = 0;
    for (int i = 0; i < k; i++) s += a[i];
    long best = s;
    for (int i = k; i < a.length; i++) { s += a[i] - a[i - k]; best = Math.max(best, s); }
    return best;
}""", "Adjacent windows share k−1 values.", ["Sum the first window.", "Slide, updating in O(1)."], ["s = sum(first k)", "for i ≥ k: s += a[i] - a[i-k]; best = max"], "O(n)", "O(1)", "Each update yields the next window's exact sum.", "—"),
[("2 1 5 1 3 2\n3", "9"), ("2 3 4 1 5\n2", "7"), ("-1 -2 -3\n1", "-1"), ("1 2 3\n3", "6")],
viz_opt={"algorithm": "pattern-fixed-window", "input": {"values": [2, 1, 5, 1, 3, 2], "k": 3}})

problem("longest-substring-no-repeat", "Longest Unique Run", "sliding-window", "MEDIUM", ["variable sliding window", "hash map"],
"""Print the length of the longest substring with no repeated characters.""",
"Line 1: the string (may be empty).", "The length.", ["0 ≤ |s| ≤ 5·10^4"], ["When a character repeats inside the window, jump the left edge past its last occurrence."], ["Empty", "All same character"],
"System.out.println(solve(L.isEmpty() ? \"\" : L.get(0)));", "static int solve(String s) {\n    // TODO\n    return 0;\n}",
A("Check every start", """static int solve(String s) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        Set<Character> seen = new HashSet<>();
        for (int j = i; j < s.length() && seen.add(s.charAt(j)); j++) best = Math.max(best, j - i + 1);
    }
    return best;
}""", "Grow from each start until a repeat.", ["For each i extend j while unique."], ["for i: extend until repeat"], "O(n²)", "O(σ)", "Exhaustive.", "Quadratic."),
A("Sliding window with last index", """static int solve(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int best = 0, l = 0;
    for (int r = 0; r < s.length(); r++) {
        Integer p = last.get(s.charAt(r));
        if (p != null && p >= l) l = p + 1;
        last.put(s.charAt(r), r);
        best = Math.max(best, r - l + 1);
    }
    return best;
}""", "The window [l, r] is always repeat-free.", ["On a repeat inside the window, move l past it.", "Track the best length."], ["for r: if last[c] ≥ l: l = last[c]+1", "    last[c]=r; best = max(best, r-l+1)"], "O(n)", "O(σ)", "l never moves backwards and each window is maximal for its r.", "—"),
[("abcabcbb", "3"), ("bbbbb", "1"), ("pwwkew", "3"), ("", "0"), ("abba", "2")],
viz_opt={"algorithm": "pattern-sliding-window", "input": {"s": "abcabcbb"}})
