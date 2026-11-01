from common import problem, A, TREE_NODE

problem("binary-tree-inorder", "Inorder Walk", "binary-trees", "EASY", ["tree traversal", "explicit stack"],
"""Print the inorder traversal (left, node, right) of a binary tree given in level order.""",
"Line 1: level-order values with 'null' for gaps (may be empty).", "Inorder values.", ["0 ≤ n ≤ 1000"], ["Recursion is natural; an explicit stack avoids deep call stacks."], ["Empty tree", "Skewed tree"],
"System.out.println(joinList(solve(tree(line(0)))));", "static List<Integer> solve(TreeNode root) {\n    // TODO\n    return new ArrayList<>();\n}",
A("Recursive", """static List<Integer> solve(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    go(root, out);
    return out;
}
static void go(TreeNode n, List<Integer> out) {
    if (n == null) return;
    go(n.left, out); out.add(n.val); go(n.right, out);
}""", "Definition-driven recursion.", ["Visit left, node, right."], ["inorder(n): if n: inorder(n.left); visit n; inorder(n.right)"], "O(n)", "O(h)", "Follows the definition.", "Deep trees may overflow the call stack."),
A("Iterative with a stack", """static List<Integer> solve(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode c = root;
    while (c != null || !st.isEmpty()) {
        while (c != null) { st.push(c); c = c.left; }
        c = st.pop();
        out.add(c.val);
        c = c.right;
    }
    return out;
}""", "Simulate the call stack: go left as far as possible, visit, then turn right.", ["Push the left spine.", "Pop, visit, move to right child."], ["while c or stack: push left spine; c = pop; visit; c = c.right"], "O(n)", "O(h)", "Same visiting order as recursion.", "—"),
[("1 null 2 3", "1 3 2"), ("4 2 6 1 3 5 7", "1 2 3 4 5 6 7"), ("", ""), ("1", "1")], extra=TREE_NODE,
viz_opt={"algorithm": "tree-inorder", "input": {"tree": "4, 2, 6, 1, 3, 5, 7"}})

problem("tree-max-depth", "How Tall Is the Tree?", "binary-trees", "EASY", ["DFS", "BFS"],
"""Print the maximum depth (number of nodes on the longest root-to-leaf path) of a binary tree.""",
"Line 1: level-order values with 'null' gaps.", "The depth.", ["0 ≤ n ≤ 10^4"], ["depth(node) = 1 + max(depth(left), depth(right))."], ["Empty tree → 0"],
"System.out.println(solve(tree(line(0))));", "static int solve(TreeNode root) {\n    // TODO\n    return 0;\n}",
A("Level-order count", """static int solve(TreeNode root) {
    if (root == null) return 0;
    Deque<TreeNode> q = new ArrayDeque<>(); q.add(root);
    int d = 0;
    while (!q.isEmpty()) {
        d++;
        for (int k = q.size(); k > 0; k--) { TreeNode n = q.poll(); if (n.left != null) q.add(n.left); if (n.right != null) q.add(n.right); }
    }
    return d;
}""", "Count BFS levels.", ["Process level by level."], ["while q: depth++; process one level"], "O(n)", "O(w)", "Number of levels equals depth.", "Queue width can be large."),
A("Recursive DFS", """static int solve(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(solve(root.left), solve(root.right));
}""", "Height is defined recursively.", ["Return 0 for null.", "Else 1 + max of children."], ["depth(n) = n ? 1 + max(depth(l), depth(r)) : 0"], "O(n)", "O(h)", "Structural induction.", "Recursion depth h."),
[("3 9 20 null null 15 7", "3"), ("1 null 2", "2"), ("", "0"), ("1 2 3 4 null null 5 6", "4")], extra=TREE_NODE,
viz_opt={"algorithm": "tree-height", "input": {"tree": "3, 9, 20, null, null, 15, 7"}})

problem("binary-tree-max-path-sum", "Most Valuable Trail", "binary-trees", "HARD", ["post-order DFS", "tree DP"],
"""Each node has a value (possibly negative). A path is any sequence of adjacent nodes, each used at most once; it need not pass through the root. Print the maximum path sum.""",
"Line 1: level-order values with 'null' gaps (n ≥ 1).", "The maximum sum.", ["1 ≤ n ≤ 3·10^4"], ["For each node, the best downward 'arm' is node + max(0, best child arm).", "A path peaks at one node: node + left arm + right arm."], ["All negative values", "Single node"],
"System.out.println(solve(tree(line(0))));", "static long solve(TreeNode root) {\n    // TODO\n    return 0;\n}",
None,
A("Post-order arms", """static long best;
static long solve(TreeNode root) {
    best = Long.MIN_VALUE;
    arm(root);
    return best;
}
static long arm(TreeNode n) {
    if (n == null) return 0;
    long l = Math.max(0, arm(n.left)), r = Math.max(0, arm(n.right));
    best = Math.max(best, n.val + l + r);
    return n.val + Math.max(l, r);
}""", "Every path has a highest node; there it combines up to two downward arms.", ["Compute best downward arm per node (ignore negative arms).", "Update the answer with node + both arms.", "Return node + better arm to the parent."], ["arm(n): l = max(0, arm(left)); r = max(0, arm(right))", "    best = max(best, n + l + r)", "    return n + max(l, r)"], "O(n)", "O(h)", "Each candidate peak is evaluated with its optimal arms.", "Enumerating all paths would be O(n²) and is omitted as it adds no insight."),
[("1 2 3", "6"), ("-10 9 20 null null 15 7", "42"), ("-3", "-3"), ("2 -1", "2"), ("-2 -1 -3", "-1")], extra=TREE_NODE)

problem("validate-bst", "Is It a Search Tree?", "bst", "MEDIUM", ["BST invariant", "bounds"],
"""Print true if the binary tree is a valid binary search tree: every node's left subtree holds strictly smaller values and its right subtree strictly larger values.""",
"Line 1: level-order values with 'null' gaps.", "true or false", ["0 ≤ n ≤ 10^4"], ["Checking only immediate children is not enough.", "Pass down an allowed (low, high) range."], ["Grandchild violating the root's bound", "Duplicates (invalid)"],
"System.out.println(solve(tree(line(0))));", "static boolean solve(TreeNode root) {\n    // TODO\n    return false;\n}",
A("Inorder must be strictly increasing", """static boolean solve(TreeNode root) {
    List<Integer> v = new ArrayList<>();
    in(root, v);
    for (int i = 1; i < v.size(); i++) if (v.get(i) <= v.get(i - 1)) return false;
    return true;
}
static void in(TreeNode n, List<Integer> v) { if (n == null) return; in(n.left, v); v.add(n.val); in(n.right, v); }""", "A BST's inorder sequence is strictly sorted.", ["Collect inorder.", "Check strictly increasing."], ["vals = inorder(root)", "return strictly increasing(vals)"], "O(n)", "O(n)", "Inorder sorted ⇔ BST property.", "Stores all values."),
A("Range recursion", """static boolean solve(TreeNode root) { return ok(root, Long.MIN_VALUE, Long.MAX_VALUE); }
static boolean ok(TreeNode n, long lo, long hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return ok(n.left, lo, n.val) && ok(n.right, n.val, hi);
}""", "Each node must lie in an interval inherited from its ancestors.", ["Start with (−∞, ∞).", "Left child narrows the upper bound, right child the lower."], ["ok(n, lo, hi): n null → true", "    lo < n < hi and ok(left, lo, n) and ok(right, n, hi)"], "O(n)", "O(h)", "The intervals encode every ancestor constraint.", "—"),
[("2 1 3", "true"), ("5 1 4 null null 3 6", "false"), ("5 4 6 null null 3 7", "false"), ("", "true"), ("2 2 2", "false")], extra=TREE_NODE)

problem("bst-search", "Find in a Search Tree", "bst", "EASY", ["BST search"],
"""Build a BST by inserting the given values in order (duplicates ignored). Print true if key is present.""",
"Line 1: insertion order.\nLine 2: key.", "true or false", ["1 ≤ n ≤ 10^4"], ["Compare and go left or right — never both."], ["Key smaller than everything"],
"""int[] v = ints(line(0)); TreeNode root = null;
for (int x : v) root = insert(root, x);
System.out.println(solve(root, Integer.parseInt(line(1))));""",
"static boolean solve(TreeNode root, int key) {\n    // TODO\n    return false;\n}",
A("Search everything", """static boolean solve(TreeNode root, int key) {
    if (root == null) return false;
    return root.val == key || solve(root.left, key) || solve(root.right, key);
}""", "Ignore ordering; DFS everything.", ["Visit all nodes."], ["return n.val==key or search(left) or search(right)"], "O(n)", "O(h)", "Exhaustive.", "Wastes the BST property."),
A("Ordered descent", """static boolean solve(TreeNode root, int key) {
    TreeNode c = root;
    while (c != null) {
        if (key == c.val) return true;
        c = key < c.val ? c.left : c.right;
    }
    return false;
}""", "Each comparison discards one subtree.", ["Go left if smaller, right if larger."], ["while c: if equal: true; c = key<c ? left : right", "false"], "O(h)", "O(1)", "The key can only be on one side.", "O(n) on a degenerate (sorted-insert) tree."),
[("50 30 70 20 40 60 80\n60", "true"), ("50 30 70\n65", "false"), ("1 2 3 4 5\n5", "true")],
extra=TREE_NODE + """
    static TreeNode insert(TreeNode n, int x) {
        if (n == null) return new TreeNode(x);
        if (x < n.val) n.left = insert(n.left, x); else if (x > n.val) n.right = insert(n.right, x);
        return n;
    }
""", viz_opt={"algorithm": "bst-search", "input": {"values": [50, 30, 70, 20, 40, 60, 80], "key": 60}})

problem("kth-smallest-bst", "K-th Smallest in a BST", "bst", "MEDIUM", ["inorder traversal", "early exit"],
"""Build a BST from the insertion order and print the k-th smallest value (1-based).""",
"Line 1: insertion order (distinct).\nLine 2: k.", "The value.", ["1 ≤ k ≤ n ≤ 10^4"], ["Inorder visits values in sorted order — stop after k."], ["k = 1", "k = n"],
"""int[] v = ints(line(0)); TreeNode root = null;
for (int x : v) root = insert(root, x);
System.out.println(solve(root, Integer.parseInt(line(1))));""",
"static int solve(TreeNode root, int k) {\n    // TODO\n    return 0;\n}",
A("Collect and sort", """static int solve(TreeNode root, int k) {
    List<Integer> v = new ArrayList<>();
    Deque<TreeNode> st = new ArrayDeque<>();
    if (root != null) st.push(root);
    while (!st.isEmpty()) { TreeNode n = st.pop(); v.add(n.val); if (n.left != null) st.push(n.left); if (n.right != null) st.push(n.right); }
    Collections.sort(v);
    return v.get(k - 1);
}""", "Grab all values and sort.", ["Traverse in any order.", "Sort, index k−1."], ["vals = all; sort; return vals[k-1]"], "O(n log n)", "O(n)", "Sorting gives rank order.", "Ignores BST order."),
A("Inorder with early stop", """static int solve(TreeNode root, int k) {
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode c = root;
    while (true) {
        while (c != null) { st.push(c); c = c.left; }
        c = st.pop();
        if (--k == 0) return c.val;
        c = c.right;
    }
}""", "Inorder of a BST is sorted; the k-th visited node is the answer.", ["Iterative inorder.", "Count visits; stop at k."], ["inorder iteratively; on visit: k--; if k==0 return"], "O(h + k)", "O(h)", "Sorted visiting order.", "—"),
[("5 3 6 2 4 1\n3", "3"), ("3 1 4 2\n1", "1"), ("10 5 15\n3", "15")],
extra=TREE_NODE + """
    static TreeNode insert(TreeNode n, int x) {
        if (n == null) return new TreeNode(x);
        if (x < n.val) n.left = insert(n.left, x); else if (x > n.val) n.right = insert(n.right, x);
        return n;
    }
""", viz_opt={"algorithm": "tree-inorder", "input": {"tree": "5, 3, 6, 2, 4, null, null, 1"}})

# ---------------------------------------------------------------- heaps
problem("kth-largest-element", "K-th Highest Score", "heaps", "MEDIUM", ["min-heap of size k", "selection"],
"""Print the k-th largest value in the array (counting duplicates separately).""",
"Line 1: values.\nLine 2: k.", "The value.", ["1 ≤ k ≤ n ≤ 10^5"], ["Keep only the k largest seen so far in a min-heap."], ["Duplicates", "k = n"],
"System.out.println(solve(ints(line(0)), Integer.parseInt(line(1))));", "static int solve(int[] a, int k) {\n    // TODO\n    return 0;\n}",
A("Sort", """static int solve(int[] a, int k) {
    int[] s = a.clone(); Arrays.sort(s);
    return s[s.length - k];
}""", "Sorted order puts the k-th largest at n − k.", ["Sort ascending; index n − k."], ["sort; return a[n-k]"], "O(n log n)", "O(n)", "Definition.", "Sorts everything."),
A("Min-heap of size k", """static int solve(int[] a, int k) {
    PriorityQueue<Integer> pq = new PriorityQueue<>();
    for (int x : a) { pq.add(x); if (pq.size() > k) pq.poll(); }
    return pq.peek();
}""", "The heap holds the k largest; its minimum is the k-th largest.", ["Push each value; pop when size exceeds k.", "Peek."], ["for x: push x; if size>k: pop", "return peek"], "O(n log k)", "O(k)", "After all pushes the heap contains exactly the k largest values.", "Quickselect averages O(n) but has O(n²) worst case."),
[("3 2 1 5 6 4\n2", "5"), ("3 2 3 1 2 4 5 5 6\n4", "4"), ("1\n1", "1"), ("-1 -2\n2", "-2")],
viz_opt={"algorithm": "pattern-kth-largest", "input": {"values": [3, 2, 1, 5, 6, 4], "k": 2}})

problem("last-stone-weight", "Smash the Heaviest", "heaps", "EASY", ["max-heap", "simulation"],
"""Repeatedly take the two heaviest stones x ≤ y and smash them: if equal both vanish, otherwise a stone of weight y − x remains. Print the last weight, or 0 if none remain.""",
"Line 1: weights.", "The final weight.", ["1 ≤ n ≤ 30"], ["A max-heap gives the two heaviest instantly."], ["One stone", "All equal pairs"],
"System.out.println(solve(ints(line(0))));", "static int solve(int[] w) {\n    // TODO\n    return 0;\n}",
A("Re-sort each round", """static int solve(int[] w) {
    List<Integer> s = new ArrayList<>();
    for (int x : w) s.add(x);
    while (s.size() > 1) {
        Collections.sort(s);
        int y = s.remove(s.size() - 1), x = s.remove(s.size() - 1);
        if (y != x) s.add(y - x);
    }
    return s.isEmpty() ? 0 : s.get(0);
}""", "Sort to find the two heaviest each round.", ["Sort, remove two largest, push difference."], ["while >1: sort; smash two largest"], "O(n² log n)", "O(n)", "Direct simulation.", "Repeated sorting."),
A("Max-heap", """static int solve(int[] w) {
    PriorityQueue<Integer> pq = new PriorityQueue<>(Collections.reverseOrder());
    for (int x : w) pq.add(x);
    while (pq.size() > 1) {
        int y = pq.poll(), x = pq.poll();
        if (y != x) pq.add(y - x);
    }
    return pq.isEmpty() ? 0 : pq.peek();
}""", "Heap keeps the heaviest at the top.", ["Heapify.", "Pop two, push difference."], ["pq = maxheap(w)", "while size>1: y=pop; x=pop; if y≠x: push(y-x)"], "O(n log n)", "O(n)", "Simulates the rule exactly.", "—"),
[("2 7 4 1 8 1", "1"), ("1", "1"), ("3 3", "0"), ("10 4 2 10", "2")],
viz_opt={"algorithm": "heap-extract", "input": {"kind": "max", "values": [2, 7, 4, 1, 8, 1]}})

problem("median-of-stream", "Running Median", "heaps", "HARD", ["two heaps"],
"""Numbers arrive one by one. After each arrival print the median of all numbers so far (for an even count, the average of the two middle values, printed with one decimal).""",
"Line 1: the numbers.", "Medians, space-separated, one decimal each.", ["1 ≤ n ≤ 10^5"], ["Keep the smaller half in a max-heap and the larger half in a min-heap.", "Rebalance so sizes differ by at most one."], ["Single number", "Negative numbers"],
"""List<String> out = new ArrayList<>();
for (double m : solve(ints(line(0)))) out.add(String.format(java.util.Locale.ROOT, "%.1f", m));
System.out.println(String.join(" ", out));""",
"static double[] solve(int[] a) {\n    // TODO\n    return new double[a.length];\n}",
A("Insertion into sorted list", """static double[] solve(int[] a) {
    double[] r = new double[a.length];
    List<Integer> s = new ArrayList<>();
    for (int i = 0; i < a.length; i++) {
        int pos = Collections.binarySearch(s, a[i]);
        s.add(pos < 0 ? -pos - 1 : pos, a[i]);
        int n = s.size();
        r[i] = n % 2 == 1 ? s.get(n / 2) : (s.get(n / 2 - 1) + (double) s.get(n / 2)) / 2;
    }
    return r;
}""", "Keep everything sorted; read the middle.", ["Binary-search insert position.", "Read middle element(s)."], ["insert x into sorted list", "median = middle"], "O(n²)", "O(n)", "Sorted list makes the median direct.", "Insertion shifts are O(n)."),
A("Two heaps", """static double[] solve(int[] a) {
    PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder()), hi = new PriorityQueue<>();
    double[] r = new double[a.length];
    for (int i = 0; i < a.length; i++) {
        lo.add(a[i]);
        hi.add(lo.poll());
        if (hi.size() > lo.size()) lo.add(hi.poll());
        r[i] = lo.size() > hi.size() ? lo.peek() : (lo.peek() + (double) hi.peek()) / 2;
    }
    return r;
}""", "Max-heap of the lower half, min-heap of the upper half; medians sit on top.", ["Push into lo, move lo's max to hi.", "If hi bigger, move its min back.", "Median from the tops."], ["lo.push(x); hi.push(lo.pop())", "if |hi| > |lo|: lo.push(hi.pop())", "median = |lo|>|hi| ? lo.top : avg(tops)"], "O(n log n)", "O(n)", "Invariant: every lo ≤ every hi and |lo| − |hi| ∈ {0, 1}.", "—"),
[("5 15 1 3", "5.0 10.0 5.0 4.0"), ("2", "2.0"), ("-1 -2 -3", "-1.0 -1.5 -2.0"), ("1 2 3 4 5", "1.0 1.5 2.0 2.5 3.0")])

# ---------------------------------------------------------------- tries
problem("implement-trie", "Autocomplete Index", "tries", "MEDIUM", ["trie"],
"""Process commands: "insert w", "search w" (print true if w was inserted), "prefix p" (print true if any inserted word starts with p).""",
"Line 1: q.\nNext q lines: commands (lowercase words).", "One line per search/prefix.", ["1 ≤ q ≤ 3·10^4", "1 ≤ |w| ≤ 2000"], ["Each node maps a character to a child and records whether a word ends there."], ["Prefix that is also a word", "Search for a prefix only"],
"""int q = Integer.parseInt(line(0));
String[] c = new String[q];
for (int i = 0; i < q; i++) c[i] = line(1 + i);
System.out.print(solve(c));""",
"static String solve(String[] cmds) {\n    // TODO\n    return \"\";\n}",
A("Set of words", """static String solve(String[] cmds) {
    Set<String> words = new HashSet<>();
    StringBuilder sb = new StringBuilder();
    for (String c : cmds) {
        String[] p = c.split(" ");
        if (p[0].equals("insert")) words.add(p[1]);
        else if (p[0].equals("search")) sb.append(words.contains(p[1])).append('\\n');
        else { boolean ok = false; for (String w : words) if (w.startsWith(p[1])) { ok = true; break; } sb.append(ok).append('\\n'); }
    }
    return sb.toString();
}""", "A hash set answers exact search; prefix queries scan all words.", ["Insert into a set.", "Prefix: test every word."], ["search: w in set", "prefix: any(w.startswith(p))"], "O(N·L) per prefix query", "O(total chars)", "Direct.", "Prefix queries are slow."),
A("Trie", """static class Node { Node[] next = new Node[26]; boolean end; }
static String solve(String[] cmds) {
    Node root = new Node();
    StringBuilder sb = new StringBuilder();
    for (String c : cmds) {
        String[] p = c.split(" ");
        Node n = root;
        boolean ok = true;
        for (char ch : p[1].toCharArray()) {
            int i = ch - 'a';
            if (n.next[i] == null) { if (p[0].equals("insert")) n.next[i] = new Node(); else { ok = false; break; } }
            n = n.next[i];
        }
        if (p[0].equals("insert")) n.end = true;
        else sb.append(p[0].equals("search") ? ok && n.end : ok).append('\\n');
    }
    return sb.toString();
}""", "Shared prefixes share nodes; queries walk one character at a time.", ["Insert: create missing nodes, mark end.", "Search: walk; must end on a word marker.", "Prefix: walk only."], ["insert: walk/create; mark end", "search: walk; return found and end", "prefix: walk; return found"], "O(L) per operation", "O(total chars · 26)", "A path from the root spells exactly the inserted prefixes.", "Memory-heavy for sparse alphabets."),
[("6\ninsert apple\nsearch apple\nsearch app\nprefix app\ninsert app\nsearch app", "true\nfalse\ntrue\ntrue"), ("3\ninsert a\nprefix b\nsearch a", "false\ntrue")],
viz_opt={"algorithm": "trie-insert", "input": {"words": ["apple", "app", "apt"]}})

problem("longest-common-prefix", "Shared Opening", "tries", "EASY", ["string scanning", "trie"],
"""Print the longest prefix shared by all given words (empty line if none).""",
"Line 1: words separated by spaces.", "The prefix.", ["1 ≤ n ≤ 200"], ["Compare character by character across words.", "Any word can only shorten the answer."], ["One word", "No common prefix"],
"System.out.println(solve(line(0).split(\" \")));", "static String solve(String[] w) {\n    // TODO\n    return \"\";\n}",
None,
A("Vertical scan", """static String solve(String[] w) {
    for (int i = 0; i < w[0].length(); i++)
        for (String s : w)
            if (i >= s.length() || s.charAt(i) != w[0].charAt(i)) return w[0].substring(0, i);
    return w[0];
}""", "Check column i in every word; stop at the first mismatch.", ["For each index of the first word, compare all words."], ["for i: for s: if mismatch: return prefix(i)", "return w[0]"], "O(total chars)", "O(1)", "Stops exactly at the first column where words disagree.", "A trie is overkill here but generalises to many queries."),
[("flower flow flight", "fl"), ("dog racecar car", ""), ("alone", "alone"), ("ab abc abcd", "ab")],
viz_opt={"algorithm": "trie-prefix", "input": {"words": ["flower", "flow", "flight"], "query": "fl"}})
