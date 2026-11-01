from common import problem, A

# ---------------------------------------------------------------- arrays
problem("second-largest", "Runner-Up Score", "arrays", "EASY", ["single pass", "tracking extremes"],
"""A quiz app records the final scores of every player. Return the runner-up score: the largest score that is strictly smaller than the best score. If every player has the same score (or there is only one player), print -1.""",
"Line 1: space-separated integers (the scores).", "A single integer: the runner-up score, or -1.",
["1 ≤ n ≤ 10^5", "-10^9 ≤ score ≤ 10^9"],
["Sorting works, but you only ever need two numbers.", "Track the best and second-best distinct values while scanning once."],
["All scores equal", "Single score", "Negative scores", "Maximum appears multiple times"],
"System.out.println(solve(ints(line(0))));",
"static long solve(int[] a) {\n    // TODO\n    return -1;\n}",
A("Sort then scan", """static long solve(int[] a) {
    int[] s = a.clone();
    Arrays.sort(s);
    for (int i = s.length - 2; i >= 0; i--)
        if (s[i] < s[s.length - 1]) return s[i];
    return -1;
}""", "After sorting, walk left from the maximum until a smaller value appears.", ["Sort a copy ascending.", "Scan from the second-to-last element leftwards.", "Return the first value smaller than the maximum."],
["sort a", "for i from n-2 down to 0:", "    if a[i] < a[n-1]: return a[i]", "return -1"], "O(n log n)", "O(n)", "Sorted order puts every value smaller than the max to its left; the rightmost such value is the largest of them.", "Sorting does more work than needed and copies the input."),
A("Single pass with two trackers", """static long solve(int[] a) {
    long first = Long.MIN_VALUE, second = Long.MIN_VALUE;
    for (int x : a) {
        if (x > first) { second = first; first = x; }
        else if (x < first && x > second) second = x;
    }
    return second == Long.MIN_VALUE ? -1 : second;
}""", "Keep the best and runner-up distinct values seen so far; each new value can only displace them.", ["first = second = -∞.", "For each x: if x beats first, demote first to second.", "Else if x is strictly between second and first, it becomes second.", "Return second, or -1 if it never changed."],
["first = second = -inf", "for x in a:", "    if x > first: second = first; first = x", "    else if second < x < first: second = x", "return second or -1"], "O(n)", "O(1)", "Invariant: after processing a prefix, first and second are the two largest distinct values in it.", "Uses -1 as the sentinel answer, so a genuine runner-up of -1 is indistinguishable (accepted by this problem's contract)."),
[("12 35 1 10 34 1", "34"), ("7 7 7", "-1"), ("5", "-1"), ("-3 -8 -3 -1", "-3"), ("10 10 9", "9")],
viz_opt={"algorithm": "array-second-largest", "input": {"values": [12, 35, 1, 10, 34, 1]}},
explanations=["35 is the best score; 34 is the largest value below it.", "Everyone tied, so there is no runner-up."])

problem("rotate-array", "Carousel Shift", "arrays", "MEDIUM", ["reversal", "in-place"],
"""Items on a circular carousel are stored in an array. Shift every item k positions to the right (items that fall off the end wrap around to the front). Print the resulting order.""",
"Line 1: the array.\nLine 2: k (k ≥ 0).", "The rotated array, space-separated.",
["1 ≤ n ≤ 10^5", "0 ≤ k ≤ 10^9"],
["k can be larger than n — only k mod n matters.", "Reversing the whole array moves the last k items to the front, but backwards."],
["k = 0", "k a multiple of n", "k larger than n", "Single element"],
"System.out.println(join(solve(ints(line(0)), Integer.parseInt(line(1)))));",
"static int[] solve(int[] a, int k) {\n    // TODO\n    return a;\n}",
A("Extra array", """static int[] solve(int[] a, int k) {
    int n = a.length;
    int[] r = new int[n];
    for (int i = 0; i < n; i++) r[(int) ((i + (long) k) % n)] = a[i];
    return r;
}""", "Element i simply moves to (i + k) mod n.", ["Allocate an output array.", "Place a[i] at (i + k) mod n."], ["for i in 0..n-1: out[(i+k) mod n] = a[i]"], "O(n)", "O(n)", "Each index maps to a unique destination, so the output is a permutation with every element shifted by k.", "Uses O(n) extra memory."),
A("Three reversals", """static int[] solve(int[] a, int k) {
    int n = a.length;
    k %= n;
    rev(a, 0, n - 1); rev(a, 0, k - 1); rev(a, k, n - 1);
    return a;
}
static void rev(int[] a, int l, int r) {
    while (l < r) { int t = a[l]; a[l++] = a[r]; a[r--] = t; }
}""", "Reversing everything brings the last k items to the front (backwards); reversing each part fixes the order.", ["k = k mod n.", "Reverse the whole array.", "Reverse the first k items.", "Reverse the remaining n − k items."], ["k = k mod n", "reverse(0, n-1)", "reverse(0, k-1)", "reverse(k, n-1)"], "O(n)", "O(1)", "Reversal of a concatenation XY is rev(Y)rev(X); reversing each block again yields YX, which is the right rotation.", "Mutates the input array."),
[("1 2 3 4 5 6 7\n3", "5 6 7 1 2 3 4"), ("-1 -100 3 99\n2", "3 99 -1 -100"), ("1\n5", "1"), ("1 2 3\n0", "1 2 3"), ("1 2 3\n3000000", "1 2 3"), ("1 2 3 4\n5", "4 1 2 3")],
viz_opt={"algorithm": "array-rotate-right", "input": {"values": [1, 2, 3, 4, 5, 6, 7], "k": 3}}, related=["second-largest"])

problem("first-missing-positive", "Smallest Free Locker", "arrays", "HARD", ["cyclic placement", "index as hash"],
"""Lockers are numbered 1, 2, 3, … The array lists locker numbers already taken (values may be negative, zero, duplicated or huge — those are data-entry noise). Return the smallest positive locker number that is not taken. Aim for O(n) time and O(1) extra space.""",
"Line 1: the integers.", "The smallest missing positive integer.",
["1 ≤ n ≤ 10^5", "-2^31 ≤ value < 2^31"],
["The answer is always in 1..n+1.", "Try to put value v at index v−1 by swapping."],
["All numbers negative", "1..n all present → answer n+1", "Duplicates", "Huge values"],
"System.out.println(solve(ints(line(0))));",
"static int solve(int[] a) {\n    // TODO\n    return 1;\n}",
A("Hash set", """static int solve(int[] a) {
    Set<Integer> s = new HashSet<>();
    for (int x : a) s.add(x);
    int k = 1;
    while (s.contains(k)) k++;
    return k;
}""", "Remember every value, then count up from 1.", ["Insert all values in a set.", "Return the first k ≥ 1 not in the set."], ["s = set(a)", "k = 1", "while k in s: k++", "return k"], "O(n)", "O(n)", "The loop stops at the first positive integer absent from the input.", "O(n) extra memory."),
A("Cyclic placement", """static int solve(int[] a) {
    int n = a.length;
    for (int i = 0; i < n; i++)
        while (a[i] > 0 && a[i] <= n && a[a[i] - 1] != a[i]) {
            int j = a[i] - 1, t = a[j]; a[j] = a[i]; a[i] = t;
        }
    for (int i = 0; i < n; i++) if (a[i] != i + 1) return i + 1;
    return n + 1;
}""", "Use the array itself as the set: value v belongs at index v−1.", ["For each index, keep swapping a[i] into its home while it is in 1..n and the home doesn't already hold it.", "Scan: the first index i with a[i] ≠ i+1 gives the answer i+1.", "If none, answer n+1."], ["for i in 0..n-1:", "    while 1 <= a[i] <= n and a[a[i]-1] != a[i]: swap a[i] into place", "for i: if a[i] != i+1: return i+1", "return n+1"], "O(n)", "O(1)", "Each swap puts one value permanently home, so there are at most n swaps; afterwards index i holds i+1 iff i+1 was present.", "Destroys the input order."),
[("3 4 -1 1", "2"), ("7 8 9 11 12", "1"), ("1 2 0", "3"), ("1 1", "2"), ("2", "1"), ("1 2 3 4 5", "6")])

# ---------------------------------------------------------------- strings
problem("valid-anagram", "Scrambled Letters", "strings", "EASY", ["frequency count"],
"""Two lowercase words are anagrams if one can be rearranged to form the other using every letter exactly once. Print true if they are anagrams, otherwise false.""",
"Line 1: word s.\nLine 2: word t.", "true or false",
["1 ≤ |s|, |t| ≤ 5·10^4", "lowercase English letters"],
["Different lengths can never be anagrams.", "Count letters in one word, subtract with the other."],
["Different lengths", "Same letters, different counts", "Identical words"],
"System.out.println(solve(line(0), line(1)));",
"static boolean solve(String s, String t) {\n    // TODO\n    return false;\n}",
A("Sort both", """static boolean solve(String s, String t) {
    char[] a = s.toCharArray(), b = t.toCharArray();
    Arrays.sort(a); Arrays.sort(b);
    return Arrays.equals(a, b);
}""", "Anagrams have identical sorted letters.", ["Sort characters of both words.", "Compare."], ["return sorted(s) == sorted(t)"], "O(n log n)", "O(n)", "Sorting is a canonical form for multisets of letters.", "Slower than counting."),
A("Count letters", """static boolean solve(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] c = new int[26];
    for (int i = 0; i < s.length(); i++) { c[s.charAt(i) - 'a']++; c[t.charAt(i) - 'a']--; }
    for (int x : c) if (x != 0) return false;
    return true;
}""", "A 26-slot counter: +1 for s, −1 for t; all zeros means same multiset.", ["Reject different lengths.", "Increment for s's letters, decrement for t's.", "Every counter must be zero."], ["if len differ: false", "for i: c[s[i]]++, c[t[i]]--", "return all c == 0"], "O(n)", "O(1) (26 counters)", "Equal letter frequencies ⇔ anagram.", "Assumes a small fixed alphabet."),
[("anagram\nnagaram", "true"), ("rat\ncar", "false"), ("a\na", "true"), ("ab\na", "false"), ("aacc\nccac", "false")])

problem("longest-palindromic-substring", "Mirror Segment", "strings", "MEDIUM", ["expand around center"],
"""Find the longest contiguous substring that reads the same forwards and backwards. If several have the maximum length, print the one that starts first.""",
"Line 1: string s (lowercase letters/digits).", "The longest palindromic substring.",
["1 ≤ |s| ≤ 1000"],
["Every palindrome has a centre: a character or the gap between two characters.", "Expand outwards from each of the 2n−1 centres."],
["Single character", "Whole string is a palindrome", "Even-length palindrome"],
"System.out.println(solve(line(0)));",
"static String solve(String s) {\n    // TODO\n    return s;\n}",
A("Check every substring", """static String solve(String s) {
    String best = s.substring(0, 1);
    for (int i = 0; i < s.length(); i++)
        for (int j = i + best.length(); j < s.length(); j++)
            if (isPal(s, i, j) && j - i + 1 > best.length()) best = s.substring(i, j + 1);
    return best;
}
static boolean isPal(String s, int l, int r) {
    while (l < r) if (s.charAt(l++) != s.charAt(r--)) return false;
    return true;
}""", "Try all (i, j) pairs and test each for being a palindrome.", ["For every start i and end j, check palindrome.", "Keep the longest (earliest on ties)."], ["for i, j > i: if palindrome(i, j) and longer: best = s[i..j]"], "O(n³)", "O(1)", "Exhaustive search over all substrings.", "Cubic time; too slow for long strings."),
A("Expand around centres", """static String solve(String s) {
    int bs = 0, bl = 1;
    for (int c = 0; c < 2 * s.length() - 1; c++) {
        int l = c / 2, r = l + c % 2;
        while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
        int len = r - l - 1;
        if (len > bl) { bl = len; bs = l + 1; }
    }
    return s.substring(bs, bs + bl);
}""", "Grow a palindrome outward from each centre while the ends match.", ["For each of 2n−1 centres (odd and even).", "Expand while characters match.", "Record the longest, preferring earlier starts."], ["for each centre (l, r):", "    while l>=0, r<n, s[l]==s[r]: l--, r++", "    update best with s[l+1..r-1]"], "O(n²)", "O(1)", "Every palindrome is found when expanding from its own centre.", "Manacher's algorithm achieves O(n) but is harder to explain."),
[("babad", "bab"), ("cbbd", "bb"), ("a", "a"), ("racecar", "racecar"), ("abacdfgdcaba", "aba"), ("forgeeksskeegfor", "geeksskeeg")])

problem("minimum-window-substring", "Smallest Covering Window", "strings", "HARD", ["sliding window", "frequency count"],
"""Given text s and pattern t, find the shortest contiguous window of s containing every character of t (with multiplicity). Print the window, or an empty line if none exists. If several shortest windows exist, print the leftmost.""",
"Line 1: s.\nLine 2: t.", "The minimum window (possibly empty).",
["1 ≤ |s|, |t| ≤ 10^5", "letters only"],
["Expand right until the window is valid, then shrink left while it stays valid.", "Track how many required characters are still missing."],
["t longer than s", "t has repeated letters", "Answer is the whole string"],
"System.out.println(solve(line(0), line(1)));",
"static String solve(String s, String t) {\n    // TODO\n    return \"\";\n}",
A("Try every start", """static String solve(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    String best = "";
    for (int i = 0; i < s.length(); i++) {
        int[] have = new int[128];
        for (int j = i; j < s.length(); j++) {
            have[s.charAt(j)]++;
            if (covers(have, need)) {
                if (best.isEmpty() || j - i + 1 < best.length()) best = s.substring(i, j + 1);
                break;
            }
        }
    }
    return best;
}
static boolean covers(int[] h, int[] n) {
    for (int c = 0; c < 128; c++) if (h[c] < n[c]) return false;
    return true;
}""", "For each start, extend until the window covers t.", ["For each i, grow j until counts cover t.", "Keep the shortest window."], ["for i: for j >= i: if window covers t: record, break"], "O(n²·σ)", "O(σ)", "Checks the shortest valid window starting at every index.", "Quadratic."),
A("Sliding window", """static String solve(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int missing = t.length(), l = 0, bs = 0, bl = Integer.MAX_VALUE;
    for (int r = 0; r < s.length(); r++) {
        if (need[s.charAt(r)]-- > 0) missing--;
        while (missing == 0) {
            if (r - l + 1 < bl) { bl = r - l + 1; bs = l; }
            if (++need[s.charAt(l++)] > 0) missing++;
        }
    }
    return bl == Integer.MAX_VALUE ? "" : s.substring(bs, bs + bl);
}""", "need[c] counts how many more c's the window requires; negative means surplus.", ["Move r right, decrementing need; when a needed char arrives, missing--.", "While missing == 0, record the window and move l right.", "Leaving a needed char increments missing."], ["missing = |t|", "for r: if need[s[r]]-- > 0: missing--", "    while missing == 0: record; if ++need[s[l++]] > 0: missing++"], "O(|s| + |t|)", "O(σ)", "Each index enters and leaves the window once; every minimal window is examined when l can no longer advance.", "Assumes ASCII input."),
[("ADOBECODEBANC\nABC", "BANC"), ("a\na", "a"), ("a\naa", ""), ("ab\nb", "b"), ("aaflslflsldkalskaaa\naaa", "aaa")])

# ---------------------------------------------------------------- hashing
problem("two-sum", "Pair That Pays", "hash-maps", "EASY", ["hash map", "complement lookup"],
"""A vending machine accepts exactly the target amount. Given coin values in the order they appear, print the indices i < j of the first pair (by j, then i) whose values add up to target. Exactly one answer is guaranteed.""",
"Line 1: the values.\nLine 2: target.", "Two indices i j.",
["2 ≤ n ≤ 10^4", "exactly one valid pair exists"],
["For each value x you need target − x.", "Remember values you have already seen, with their index."],
["Negative values", "Duplicate values forming the pair", "Pair at the very end"],
"int[] r = solve(ints(line(0)), Integer.parseInt(line(1)));\nSystem.out.println(r[0] + \" \" + r[1]);",
"static int[] solve(int[] a, int target) {\n    // TODO\n    return new int[]{0, 0};\n}",
A("Check every pair", """static int[] solve(int[] a, int target) {
    for (int j = 1; j < a.length; j++)
        for (int i = 0; i < j; i++)
            if (a[i] + a[j] == target) return new int[]{i, j};
    return new int[]{-1, -1};
}""", "Try all pairs.", ["For every j, check every i < j."], ["for j: for i < j: if a[i]+a[j]==target: return (i, j)"], "O(n²)", "O(1)", "Exhaustive.", "Quadratic time."),
A("Hash map of seen values", """static int[] solve(int[] a, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int j = 0; j < a.length; j++) {
        Integer i = seen.get(target - a[j]);
        if (i != null) return new int[]{i, j};
        seen.putIfAbsent(a[j], j);
    }
    return new int[]{-1, -1};
}""", "While scanning, ask whether the complement of the current value was already seen.", ["seen = {}.", "For each j: if target − a[j] in seen, answer.", "Otherwise remember a[j] → j."], ["seen = {}", "for j: if target - a[j] in seen: return (seen[...], j)", "    seen[a[j]] = j"], "O(n)", "O(n)", "When the pair's second element is reached, the first is already in the map.", "Extra memory for the map."),
[("2 7 11 15\n9", "0 1"), ("3 2 4\n6", "1 2"), ("3 3\n6", "0 1"), ("-1 -2 -3 -4 -5\n-8", "2 4"), ("0 4 3 0\n0", "0 3")],
viz_opt={"algorithm": "pattern-two-sum", "input": {"values": [2, 7, 11, 15], "target": 9}})

problem("longest-consecutive", "Longest Streak", "hash-maps", "MEDIUM", ["hash set", "sequence starts"],
"""Given unsorted integers, return the length of the longest run of consecutive values (like 4,5,6,7) that can be formed from them, in O(n) expected time.""",
"Line 1: the integers (may be empty).", "The length.",
["0 ≤ n ≤ 10^5"],
["Only start counting at x if x−1 is absent.", "A set gives O(1) membership."],
["Empty input", "Duplicates", "Negative numbers"],
"System.out.println(solve(ints(line(0))));",
"static int solve(int[] a) {\n    // TODO\n    return 0;\n}",
A("Sort", """static int solve(int[] a) {
    if (a.length == 0) return 0;
    int[] s = a.clone(); Arrays.sort(s);
    int best = 1, cur = 1;
    for (int i = 1; i < s.length; i++) {
        if (s[i] == s[i - 1]) continue;
        cur = s[i] == s[i - 1] + 1 ? cur + 1 : 1;
        best = Math.max(best, cur);
    }
    return best;
}""", "In sorted order consecutive runs are adjacent.", ["Sort.", "Scan, skipping duplicates, extending or resetting the run."], ["sort", "scan counting runs"], "O(n log n)", "O(n)", "Runs are contiguous after sorting.", "Not linear."),
A("Hash set, start of runs", """static int solve(int[] a) {
    Set<Integer> s = new HashSet<>();
    for (int x : a) s.add(x);
    int best = 0;
    for (int x : s) {
        if (s.contains(x - 1)) continue;
        int y = x;
        while (s.contains(y + 1)) y++;
        best = Math.max(best, y - x + 1);
    }
    return best;
}""", "Only values with no predecessor start a run; walk each run once.", ["Put all values in a set.", "For x with x−1 absent, count x, x+1, ….", "Track the maximum."], ["s = set(a)", "for x in s if x-1 not in s:", "    walk y = x.. while y+1 in s", "    best = max(best, y-x+1)"], "O(n) expected", "O(n)", "Each value is visited by exactly one run walk.", "Hash-based; worst case depends on hashing."),
[("100 4 200 1 3 2", "4"), ("0 3 7 2 5 8 4 6 0 1", "9"), ("", "0"), ("5", "1"), ("1 2 0 1", "3"), ("-2 -1 0 9", "3")])

problem("subarray-sum-k", "Exact Budget Segments", "prefix-sums", "MEDIUM", ["prefix sums", "hash map"],
"""Count the number of non-empty contiguous subarrays whose sum is exactly k. Values may be negative.""",
"Line 1: the array.\nLine 2: k.", "The count.",
["1 ≤ n ≤ 2·10^4", "-1000 ≤ a[i] ≤ 1000"],
["sum(i..j) = P[j+1] − P[i].", "Count earlier prefix sums equal to current − k."],
["Negative numbers", "k = 0", "Whole array"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));",
"static long solve(int[] a, int k) {\n    // TODO\n    return 0;\n}",
A("All subarrays", """static long solve(int[] a, int k) {
    long c = 0;
    for (int i = 0; i < a.length; i++) {
        long s = 0;
        for (int j = i; j < a.length; j++) { s += a[j]; if (s == k) c++; }
    }
    return c;
}""", "Accumulate sums from every start.", ["For each i, extend j and track sum."], ["for i: s=0; for j>=i: s+=a[j]; if s==k: c++"], "O(n²)", "O(1)", "Enumerates every subarray once.", "Quadratic."),
A("Prefix sums + counts", """static long solve(int[] a, int k) {
    Map<Long, Integer> cnt = new HashMap<>();
    cnt.put(0L, 1);
    long p = 0, c = 0;
    for (int x : a) {
        p += x;
        c += cnt.getOrDefault(p - k, 0);
        cnt.merge(p, 1, Integer::sum);
    }
    return c;
}""", "A subarray ending here sums to k iff some earlier prefix equals current prefix − k.", ["cnt = {0: 1}.", "For each x: prefix += x; add cnt[prefix − k]; then cnt[prefix]++."], ["cnt = {0:1}; p = 0", "for x: p += x; ans += cnt[p-k]; cnt[p]++"], "O(n)", "O(n)", "Bijection between valid subarrays and pairs of equal-difference prefixes.", "Needs a hash map."),
[("1 1 1\n2", "2"), ("1 2 3\n3", "2"), ("1 -1 0\n0", "3"), ("3\n3", "1"), ("1 2 1 2 1\n3", "4")],
viz_opt={"algorithm": "pattern-prefix-sums", "input": {"values": [1, 2, 1, 2, 1], "l": 1, "r": 2}})

problem("range-sum-query", "Shelf Weight Queries", "prefix-sums", "EASY", ["prefix sums"],
"""Shelves hold items with given weights. Answer q queries, each asking for the total weight of shelves l..r (0-based, inclusive). Print one answer per line.""",
"Line 1: weights.\nLine 2: q.\nNext q lines: l r.", "q lines with the sums.",
["1 ≤ n, q ≤ 10^5"],
["Precompute P[i] = a[0] + … + a[i−1]."],
["l == r", "Whole range"],
"""int[] a = ints(line(0));
int q = Integer.parseInt(line(1));
int[][] qs = new int[q][];
for (int i = 0; i < q; i++) qs[i] = ints(line(2 + i));
StringBuilder sb = new StringBuilder();
for (long v : solve(a, qs)) sb.append(v).append('\\n');
System.out.print(sb);""",
"static long[] solve(int[] a, int[][] qs) {\n    // TODO\n    return new long[qs.length];\n}",
A("Sum each query", """static long[] solve(int[] a, int[][] qs) {
    long[] r = new long[qs.length];
    for (int i = 0; i < qs.length; i++)
        for (int j = qs[i][0]; j <= qs[i][1]; j++) r[i] += a[j];
    return r;
}""", "Add up each range directly.", ["Loop over each range."], ["for (l, r): sum a[l..r]"], "O(n·q)", "O(1)", "Direct.", "Slow for many queries."),
A("Prefix sums", """static long[] solve(int[] a, int[][] qs) {
    long[] p = new long[a.length + 1];
    for (int i = 0; i < a.length; i++) p[i + 1] = p[i] + a[i];
    long[] r = new long[qs.length];
    for (int i = 0; i < qs.length; i++) r[i] = p[qs[i][1] + 1] - p[qs[i][0]];
    return r;
}""", "Precompute prefix totals once; each query is a subtraction.", ["Build P.", "Answer P[r+1] − P[l]."], ["P[0]=0; P[i+1]=P[i]+a[i]", "answer = P[r+1]-P[l]"], "O(n + q)", "O(n)", "Telescoping sums.", "Static data only (updates need a Fenwick tree)."),
[("3 1 4 1 5 9 2 6\n3\n0 2\n2 5\n7 7", "8\n19\n6"), ("5\n1\n0 0", "5"), ("-1 2 -3\n2\n0 2\n1 1", "-2\n2")],
viz_opt={"algorithm": "pattern-prefix-sums", "input": {"values": [3, 1, 4, 1, 5, 9, 2, 6], "l": 2, "r": 5}})

problem("maximum-subarray", "Best Streak of Gains", "dynamic-programming", "MEDIUM", ["Kadane", "dynamic programming"],
"""Daily profit changes are given (positive or negative). Find the maximum total of any non-empty contiguous run of days.""",
"Line 1: the values.", "The maximum subarray sum.",
["1 ≤ n ≤ 10^5"],
["The best run ending at day i either extends the best run ending at i−1 or starts fresh."],
["All negative", "Single element"],
"System.out.println(solve(ints(line(0))));",
"static long solve(int[] a) {\n    // TODO\n    return 0;\n}",
A("All subarrays", """static long solve(int[] a) {
    long best = Long.MIN_VALUE;
    for (int i = 0; i < a.length; i++) {
        long s = 0;
        for (int j = i; j < a.length; j++) { s += a[j]; best = Math.max(best, s); }
    }
    return best;
}""", "Try every run.", ["Accumulate from each start."], ["for i, j: best = max(best, sum(i..j))"], "O(n²)", "O(1)", "Exhaustive.", "Quadratic."),
A("Kadane's algorithm", """static long solve(int[] a) {
    long cur = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);
        best = Math.max(best, cur);
    }
    return best;
}""", "cur = best sum of a run ending exactly here.", ["cur = max(a[i], cur + a[i]).", "best = max(best, cur)."], ["cur = best = a[0]", "for i: cur = max(a[i], cur+a[i]); best = max(best, cur)"], "O(n)", "O(1)", "Optimal substructure: the best run ending at i extends the best run ending at i−1 only if that is positive.", "Returns the sum, not the indices."),
[("-2 1 -3 4 -1 2 1 -5 4", "6"), ("-3 -1 -2", "-1"), ("5", "5"), ("5 4 -1 7 8", "23")],
viz_opt={"algorithm": "dp-kadane", "input": {"values": [-2, 1, -3, 4, -1, 2, 1, -5, 4]}})
