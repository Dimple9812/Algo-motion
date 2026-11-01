from common import problem, A, LIST_NODE

LMAIN = "System.out.println(dump(solve(build(ints(line(0))))));"

problem("reverse-linked-list", "Reverse the Conga Line", "linked-lists", "EASY", ["pointer rewiring"],
"""Dancers form a singly linked conga line. Reverse the line and print the values from the new head.""",
"Line 1: node values from head (may be empty).", "Reversed values (empty line if empty).",
["0 ≤ n ≤ 5000"], ["Keep three pointers: prev, curr, next.", "Save curr.next before overwriting it."], ["Empty list", "One node"],
LMAIN, "static ListNode solve(ListNode head) {\n    // TODO\n    return head;\n}",
A("Copy into an array", """static ListNode solve(ListNode head) {
    List<Integer> v = new ArrayList<>();
    for (ListNode c = head; c != null; c = c.next) v.add(c.val);
    ListNode d = new ListNode(0), t = d;
    for (int i = v.size() - 1; i >= 0; i--) { t.next = new ListNode(v.get(i)); t = t.next; }
    return d.next;
}""", "Read values out, build a new list backwards.", ["Collect values.", "Create nodes in reverse order."], ["vals = list(head)", "return build(reversed(vals))"], "O(n)", "O(n)", "Same values, opposite order.", "Allocates a whole new list."),
A("Iterative pointer reversal", """static ListNode solve(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}""", "Flip one arrow at a time while walking the list.", ["prev = null, curr = head.", "Save next, point curr back to prev, advance both.", "prev is the new head."], ["prev = null; curr = head", "while curr: next = curr.next; curr.next = prev; prev = curr; curr = next", "return prev"], "O(n)", "O(1)", "Invariant: prev heads the reversed prefix, curr heads the untouched suffix.", "Mutates the input list."),
[("1 2 3 4 5", "5 4 3 2 1"), ("1 2", "2 1"), ("", ""), ("7", "7")], extra=LIST_NODE,
viz_opt={"algorithm": "ll-reverse", "input": {"values": [1, 2, 3, 4, 5]}})

problem("remove-nth-from-end", "Drop the Nth From Last", "linked-lists", "MEDIUM", ["two pointers", "dummy head"],
"""Remove the n-th node counted from the end of a singly linked list (n = 1 is the tail) and print the remaining values. n is always valid.""",
"Line 1: values.\nLine 2: n.", "Remaining values.",
["1 ≤ length ≤ 10^4", "1 ≤ n ≤ length"], ["Use a gap of n nodes between two pointers.", "A dummy node handles removing the head."], ["Removing the head", "Single-node list"],
"System.out.println(dump(solve(build(ints(line(0))), Integer.parseInt(line(1)))));",
"static ListNode solve(ListNode head, int n) {\n    // TODO\n    return head;\n}",
A("Two passes", """static ListNode solve(ListNode head, int n) {
    int len = 0;
    for (ListNode c = head; c != null; c = c.next) len++;
    ListNode d = new ListNode(0); d.next = head;
    ListNode p = d;
    for (int i = 0; i < len - n; i++) p = p.next;
    p.next = p.next.next;
    return d.next;
}""", "Count, then walk to the node before the target.", ["Measure length.", "Walk len − n steps from a dummy.", "Bypass the next node."], ["len = length(head)", "p = dummy; advance len-n", "p.next = p.next.next"], "O(L)", "O(1)", "The (len−n)-th node from the dummy precedes the target.", "Two passes."),
A("One pass with a gap", """static ListNode solve(ListNode head, int n) {
    ListNode d = new ListNode(0); d.next = head;
    ListNode fast = d, slow = d;
    for (int i = 0; i <= n; i++) fast = fast.next;
    while (fast != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;
    return d.next;
}""", "Keep fast exactly n+1 nodes ahead; when it falls off, slow is just before the target.", ["Advance fast n+1 steps.", "Move both until fast is null.", "Unlink slow.next."], ["fast = slow = dummy; advance fast n+1", "while fast: advance both", "slow.next = slow.next.next"], "O(L)", "O(1)", "The constant gap means slow stops n+1 nodes before the end.", "—"),
[("1 2 3 4 5\n2", "1 2 3 5"), ("1\n1", ""), ("1 2\n1", "1"), ("1 2\n2", "2")], extra=LIST_NODE)

problem("merge-k-sorted-lists", "Merge the Sorted Queues", "linked-lists", "HARD", ["min-heap", "k-way merge"],
"""k ticket queues are each sorted by ticket number. Merge them into one sorted sequence.""",
"Line 1: k.\nNext k lines: each list's values (a line may be empty).", "All values merged in ascending order.",
["0 ≤ k ≤ 10^4", "total nodes ≤ 10^5"], ["A heap always yields the smallest current head.", "Push the next node of whichever list you popped from."], ["k = 0", "Some lists empty"],
"""int k = line(0).isEmpty() ? 0 : Integer.parseInt(line(0));
ListNode[] ls = new ListNode[k];
for (int i = 0; i < k; i++) ls[i] = build(ints(line(1 + i)));
System.out.println(dump(solve(ls)));""",
"static ListNode solve(ListNode[] lists) {\n    // TODO\n    return null;\n}",
A("Collect and sort", """static ListNode solve(ListNode[] lists) {
    List<Integer> v = new ArrayList<>();
    for (ListNode l : lists) for (ListNode c = l; c != null; c = c.next) v.add(c.val);
    Collections.sort(v);
    ListNode d = new ListNode(0), t = d;
    for (int x : v) { t.next = new ListNode(x); t = t.next; }
    return d.next;
}""", "Ignore the sortedness: gather everything and sort.", ["Collect all values.", "Sort and rebuild."], ["vals = all values; sort; build"], "O(N log N)", "O(N)", "Sorting produces the merged order.", "Wastes the fact that inputs are sorted."),
A("Min-heap of heads", """static ListNode solve(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> Integer.compare(a.val, b.val));
    for (ListNode l : lists) if (l != null) pq.add(l);
    ListNode d = new ListNode(0), t = d;
    while (!pq.isEmpty()) {
        ListNode n = pq.poll();
        t.next = n; t = n;
        if (n.next != null) pq.add(n.next);
    }
    return d.next;
}""", "The next output is always the smallest of the k current heads.", ["Heap all non-empty heads.", "Pop min, append, push its successor."], ["pq = heads", "while pq: n = pop; append n; push n.next"], "O(N log k)", "O(k)", "Each pop returns the global minimum of unmerged nodes.", "—"),
[("3\n1 4 5\n1 3 4\n2 6", "1 1 2 3 4 4 5 6"), ("0", ""), ("2\n\n1", "1"), ("1\n5 6", "5 6")], extra=LIST_NODE, related=["reverse-linked-list"])

problem("linked-list-cycle", "Endless Loop Detector", "two-pointers", "EASY", ["fast and slow pointers"],
"""A list is built from the given values; then the tail is linked back to the node at index pos (or nowhere if pos = −1). Print true if the list contains a cycle. Use O(1) extra memory.""",
"Line 1: values.\nLine 2: pos.", "true or false", ["0 ≤ n ≤ 10^4"], ["A fast pointer moving 2 steps will lap a slow one inside a cycle."], ["Empty list", "Self-loop on one node"],
"""int[] v = ints(line(0)); int pos = Integer.parseInt(line(1));
ListNode h = build(v), tail = h, at = null;
int i = 0;
for (ListNode c = h; c != null; c = c.next, i++) { if (i == pos) at = c; tail = c; }
if (tail != null && pos >= 0) tail.next = at;
System.out.println(solve(h));""",
"static boolean solve(ListNode head) {\n    // TODO\n    return false;\n}",
A("Visited set", """static boolean solve(ListNode head) {
    Set<ListNode> seen = new HashSet<>();
    for (ListNode c = head; c != null; c = c.next) if (!seen.add(c)) return true;
    return false;
}""", "Remember nodes; revisiting one means a cycle.", ["Walk and record nodes."], ["for node: if seen: true; add"], "O(n)", "O(n)", "A cycle forces revisiting a node.", "O(n) memory."),
A("Floyd's tortoise and hare", """static boolean solve(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next; fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}""", "In a cycle the faster pointer gains one node per step and must meet the slow one.", ["slow +1, fast +2.", "Meet ⇒ cycle; fast hits null ⇒ none."], ["while fast and fast.next: slow+=1; fast+=2; if equal: true", "false"], "O(n)", "O(1)", "Relative speed 1 inside the cycle guarantees a meeting within one lap.", "—"),
[("3 2 0 -4\n1", "true"), ("1 2\n0", "true"), ("1\n-1", "false"), ("\n-1", "false"), ("1\n0", "true")], extra=LIST_NODE,
viz_opt={"algorithm": "ll-detect-cycle", "input": {"values": [3, 2, 0, -4], "cyclePos": 1}})

# ---------------------------------------------------------------- stacks
problem("valid-brackets", "Bracket Inspector", "stacks", "EASY", ["stack", "matching"],
"""A string contains only ()[]{} characters. Print true if every opener is closed by the same type in the correct order.""",
"Line 1: the string (may be empty).", "true or false", ["0 ≤ |s| ≤ 10^4"], ["The most recent unmatched opener must close first — LIFO."], ["Empty string", "Only openers", "Closer first"],
"System.out.println(solve(line(0)));", "static boolean solve(String s) {\n    // TODO\n    return false;\n}",
A("Repeatedly delete pairs", """static boolean solve(String s) {
    String prev;
    do { prev = s; s = s.replace("()", "").replace("[]", "").replace("{}", ""); } while (!s.equals(prev));
    return s.isEmpty();
}""", "Adjacent matching pairs can always be removed; a valid string shrinks to empty.", ["Remove (), [], {} until nothing changes."], ["repeat: remove adjacent pairs", "return empty?"], "O(n²)", "O(n)", "Balanced strings always contain an adjacent matched pair.", "Quadratic due to repeated scans."),
A("Stack", """static boolean solve(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.isEmpty()) return false;
            char o = st.pop();
            if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
        }
    }
    return st.isEmpty();
}""", "Push openers; each closer must match the top.", ["Push each opener.", "On a closer, pop and compare.", "Valid iff the stack ends empty."], ["for c: if opener: push", "    else if empty or pop() != match(c): false", "return empty"], "O(n)", "O(n)", "LIFO order mirrors proper nesting.", "—"),
[("()[]{}", "true"), ("(]", "false"), ("{[()()]}", "true"), ("((", "false"), (")(", "false"), ("", "true"), ("([)]", "false")],
viz_opt={"algorithm": "stack-balanced-brackets", "input": {"expr": "{[()()]}"}})

problem("evaluate-postfix", "Postfix Calculator", "stacks", "MEDIUM", ["stack", "expression evaluation"],
"""Evaluate an arithmetic expression in postfix (reverse Polish) notation. Tokens are integers and + - * /. Division truncates toward zero. The expression is valid.""",
"Line 1: space-separated tokens.", "The integer result.", ["1 ≤ tokens ≤ 10^4", "no division by zero"], ["Numbers wait on a stack until an operator needs them.", "Pop b first, then a, compute a op b."], ["Negative numbers", "Single number"],
"System.out.println(solve(line(0).split(\"\\\\s+\")));", "static long solve(String[] tokens) {\n    // TODO\n    return 0;\n}",
None,
A("Operand stack", """static long solve(String[] tokens) {
    Deque<Long> st = new ArrayDeque<>();
    for (String t : tokens) {
        switch (t) {
            case "+" -> { long b = st.pop(), a = st.pop(); st.push(a + b); }
            case "-" -> { long b = st.pop(), a = st.pop(); st.push(a - b); }
            case "*" -> { long b = st.pop(), a = st.pop(); st.push(a * b); }
            case "/" -> { long b = st.pop(), a = st.pop(); st.push(a / b); }
            default -> st.push(Long.parseLong(t));
        }
    }
    return st.pop();
}""", "Postfix puts operands before their operator, so a stack holds pending operands.", ["Push numbers.", "Operator: pop b, pop a, push a op b.", "The final value remains."], ["for t: if number: push", "    else: b=pop; a=pop; push(a op b)", "return pop"], "O(n)", "O(n)", "Each operator's operands are exactly the two most recent unconsumed values.", "Assumes valid input. (No meaningful brute force exists — the stack IS the direct method.)"),
[("2 1 + 3 *", "9"), ("4 13 5 / +", "6"), ("10 6 9 3 + -11 * / * 17 + 5 +", "22"), ("7", "7"), ("3 -4 -", "7")],
viz_opt={"algorithm": "stack-postfix-eval", "input": {"expr": "2 1 + 3 *"}})

problem("longest-valid-parentheses", "Longest Balanced Stretch", "stacks", "HARD", ["stack of indices"],
"""Given a string of '(' and ')', return the length of the longest contiguous well-formed parentheses substring.""",
"Line 1: the string (may be empty).", "The length.", ["0 ≤ |s| ≤ 3·10^4"], ["Push indices; keep the index of the last unmatched ')' as a base.", "When a match pops, the valid stretch ends here and starts after the new top."], ["Empty", "All openers"],
"System.out.println(solve(line(0)));", "static int solve(String s) {\n    // TODO\n    return 0;\n}",
A("Check every even-length substring", """static int solve(String s) {
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        int bal = 0;
        for (int j = i; j < s.length(); j++) {
            bal += s.charAt(j) == '(' ? 1 : -1;
            if (bal < 0) break;
            if (bal == 0) best = Math.max(best, j - i + 1);
        }
    }
    return best;
}""", "From each start, track balance; it is valid whenever balance returns to 0 without dipping below.", ["For each i, scan j with a balance counter."], ["for i: bal = 0; for j: update bal; if bal<0 break; if bal==0: best"], "O(n²)", "O(1)", "A prefix-balance walk characterises valid strings.", "Quadratic."),
A("Index stack", """static int solve(String s) {
    Deque<Integer> st = new ArrayDeque<>();
    st.push(-1);
    int best = 0;
    for (int i = 0; i < s.length(); i++) {
        if (s.charAt(i) == '(') st.push(i);
        else {
            st.pop();
            if (st.isEmpty()) st.push(i);
            else best = Math.max(best, i - st.peek());
        }
    }
    return best;
}""", "The stack bottom is the boundary before the current valid stretch.", ["Push −1 as a boundary.", "'(' pushes its index.", "')' pops; if empty push i as new boundary, else length = i − top."], ["st = [-1]", "for i: '(' → push i", "    ')' → pop; if empty: push i else best = max(best, i - top)"], "O(n)", "O(n)", "After a pop, the top is the index just before the longest valid run ending at i.", "—"),
[("(()", "2"), (")()())", "4"), ("", "0"), ("()(())", "6"), ("((((", "0")])

# ---------------------------------------------------------------- queues
problem("queue-with-two-stacks", "Two-Stack Queue", "queues", "EASY", ["amortized analysis", "stacks"],
"""Implement a FIFO queue using only two stacks. Process the commands: "push x", "pop" (print the removed front), "peek" (print the front). pop/peek are only issued on a non-empty queue.""",
"Line 1: number of commands q.\nNext q lines: commands.", "One line per pop/peek.", ["1 ≤ q ≤ 10^5"], ["Pour the input stack into the output stack only when the output stack is empty."], ["Interleaved pushes and pops"],
"""int q = Integer.parseInt(line(0));
String[] cmds = new String[q];
for (int i = 0; i < q; i++) cmds[i] = line(1 + i);
System.out.print(solve(cmds));""",
"static String solve(String[] cmds) {\n    // TODO\n    return \"\";\n}",
A("Transfer on every operation", """static String solve(String[] cmds) {
    Deque<Integer> s = new ArrayDeque<>(), tmp = new ArrayDeque<>();
    StringBuilder out = new StringBuilder();
    for (String c : cmds) {
        if (c.startsWith("push")) { s.push(Integer.parseInt(c.substring(5))); continue; }
        while (!s.isEmpty()) tmp.push(s.pop());
        out.append(c.equals("pop") ? tmp.pop() : tmp.peek()).append('\\n');
        while (!tmp.isEmpty()) s.push(tmp.pop());
    }
    return out.toString();
}""", "Reverse the whole stack to reach the bottom each time, then put it back.", ["Move everything to tmp.", "Read/remove the top of tmp.", "Move everything back."], ["for pop/peek: pour s→tmp; use tmp.top; pour back"], "O(n) per pop", "O(n)", "Reversing a stack exposes its oldest element.", "Each pop costs O(n)."),
A("Lazy transfer (amortized O(1))", """static String solve(String[] cmds) {
    Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    StringBuilder sb = new StringBuilder();
    for (String c : cmds) {
        if (c.startsWith("push")) { in.push(Integer.parseInt(c.substring(5))); continue; }
        if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop());
        sb.append(c.equals("pop") ? out.pop() : out.peek()).append('\\n');
    }
    return sb.toString();
}""", "Elements move from in to out at most once each.", ["push → in.", "pop/peek → if out empty, pour in into out; use out's top."], ["push: in.push(x)", "pop: if out empty: pour in→out; return out.pop()"], "O(1) amortized", "O(n)", "out holds the oldest elements in FIFO order on top; pouring only when empty preserves order.", "Single operations can still be O(n)."),
[("5\npush 1\npush 2\npeek\npop\npop", "1\n1\n2"), ("6\npush 3\npop\npush 4\npush 5\npop\npeek", "3\n4\n5")],
viz_opt={"algorithm": "queue-operations", "input": {"variant": "linear", "script": "enqueue 1, enqueue 2, dequeue", "capacity": 4}})

problem("rotting-oranges", "Spreading Mould", "queues", "MEDIUM", ["multi-source BFS", "queue"],
"""A grid has 0 (empty), 1 (fresh fruit) and 2 (mouldy fruit). Each minute mould spreads to 4-directionally adjacent fresh fruit. Print the minutes until no fresh fruit remains, or −1 if some can never be reached.""",
"Line 1: rows R.\nNext R lines: digits separated by spaces.", "Minutes, or −1.", ["1 ≤ R, C ≤ 10"], ["Start a BFS from every mouldy cell at once.", "Each BFS layer is one minute."], ["No fresh fruit → 0", "Isolated fresh fruit → −1"],
"""int r = Integer.parseInt(line(0));
int[][] g = new int[r][];
for (int i = 0; i < r; i++) g[i] = ints(line(1 + i));
System.out.println(solve(g));""",
"static int solve(int[][] g) {\n    // TODO\n    return 0;\n}",
A("Simulate minute by minute", """static int solve(int[][] g) {
    int minutes = 0;
    while (true) {
        List<int[]> next = new ArrayList<>();
        for (int i = 0; i < g.length; i++) for (int j = 0; j < g[0].length; j++) if (g[i][j] == 1)
            for (int[] d : new int[][]{{1,0},{-1,0},{0,1},{0,-1}}) {
                int x = i + d[0], y = j + d[1];
                if (x >= 0 && y >= 0 && x < g.length && y < g[0].length && g[x][y] == 2) { next.add(new int[]{i, j}); break; }
            }
        if (next.isEmpty()) break;
        for (int[] c : next) g[c[0]][c[1]] = 2;
        minutes++;
    }
    for (int[] row : g) for (int v : row) if (v == 1) return -1;
    return minutes;
}""", "Rescan the grid each minute.", ["Find fresh cells next to mould.", "Rot them all at once; repeat until no change."], ["repeat: newly = fresh next to rotten; if none: stop; rot them; t++"], "O((RC)²)", "O(RC)", "Direct simulation of the rule.", "Rescans the whole grid every minute."),
A("Multi-source BFS", """static int solve(int[][] g) {
    Deque<int[]> q = new ArrayDeque<>();
    int fresh = 0;
    for (int i = 0; i < g.length; i++) for (int j = 0; j < g[0].length; j++) {
        if (g[i][j] == 2) q.add(new int[]{i, j});
        else if (g[i][j] == 1) fresh++;
    }
    int t = 0;
    while (!q.isEmpty() && fresh > 0) {
        for (int k = q.size(); k > 0; k--) {
            int[] c = q.poll();
            for (int[] d : new int[][]{{1,0},{-1,0},{0,1},{0,-1}}) {
                int x = c[0] + d[0], y = c[1] + d[1];
                if (x >= 0 && y >= 0 && x < g.length && y < g[0].length && g[x][y] == 1) { g[x][y] = 2; fresh--; q.add(new int[]{x, y}); }
            }
        }
        t++;
    }
    return fresh == 0 ? t : -1;
}""", "All rotten cells are BFS sources; layer number = minute.", ["Queue all 2s; count 1s.", "Process the queue layer by layer, rotting neighbours.", "If fresh remains, −1."], ["q = all rotten; fresh = count", "while q and fresh: process one layer; t++", "return fresh==0 ? t : -1"], "O(RC)", "O(RC)", "BFS layers equal shortest distance from the nearest source.", "—"),
[("3\n2 1 1\n1 1 0\n0 1 1", "4"), ("3\n2 1 1\n0 1 1\n1 0 1", "-1"), ("1\n0 2", "0"), ("1\n1", "-1")])

# ---------------------------------------------------------------- monotonic
problem("daily-temperatures", "Warmer Day Ahead", "monotonic-stack", "MEDIUM", ["monotonic stack"],
"""For each day's temperature, print how many days you must wait for a strictly warmer day (0 if never).""",
"Line 1: temperatures.", "Waits, space-separated.", ["1 ≤ n ≤ 10^5"], ["Keep a stack of days still waiting, with decreasing temperatures.", "A warmer day resolves everything colder on the stack."], ["Strictly decreasing input", "Equal temperatures"],
"System.out.println(join(solve(ints(line(0)))));", "static int[] solve(int[] t) {\n    // TODO\n    return new int[t.length];\n}",
A("Scan ahead", """static int[] solve(int[] t) {
    int[] r = new int[t.length];
    for (int i = 0; i < t.length; i++)
        for (int j = i + 1; j < t.length; j++) if (t[j] > t[i]) { r[i] = j - i; break; }
    return r;
}""", "Look forward from each day.", ["For each i scan right for the first warmer day."], ["for i: find first j>i with t[j]>t[i]"], "O(n²)", "O(1)", "Direct definition.", "Quadratic on decreasing inputs."),
A("Monotonic stack", """static int[] solve(int[] t) {
    int[] r = new int[t.length];
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < t.length; i++) {
        while (!st.isEmpty() && t[st.peek()] < t[i]) { int j = st.pop(); r[j] = i - j; }
        st.push(i);
    }
    return r;
}""", "Unresolved days form a decreasing stack; today answers every colder day on top.", ["For each day, pop colder days and set their wait.", "Push today."], ["for i: while top colder: r[pop] = i - j", "    push i"], "O(n)", "O(n)", "Each index is pushed and popped once; the popping day is the first warmer one.", "—"),
[("73 74 75 71 69 72 76 73", "1 1 4 2 1 1 0 0"), ("30 40 50 60", "1 1 1 0"), ("30 60 90", "1 1 0"), ("50 50", "0 0")],
viz_opt={"algorithm": "stack-next-greater", "input": {"values": [73, 74, 75, 71, 69, 72, 76, 73]}})

problem("sliding-window-maximum", "Peak in Every Window", "monotonic-queue", "HARD", ["monotonic deque", "sliding window"],
"""For every contiguous window of size k, print its maximum.""",
"Line 1: the array.\nLine 2: k.", "n − k + 1 maxima.", ["1 ≤ k ≤ n ≤ 10^5"], ["A smaller value to the left of a larger one can never be a window maximum again.", "Keep indices in a deque with decreasing values."], ["k = 1", "k = n"],
"System.out.println(join(solve(ints(line(0)), Integer.parseInt(line(1)))));", "static int[] solve(int[] a, int k) {\n    // TODO\n    return new int[0];\n}",
A("Scan each window", """static int[] solve(int[] a, int k) {
    int[] r = new int[a.length - k + 1];
    for (int i = 0; i + k <= a.length; i++) {
        int m = Integer.MIN_VALUE;
        for (int j = i; j < i + k; j++) m = Math.max(m, a[j]);
        r[i] = m;
    }
    return r;
}""", "Max of each window independently.", ["For each start, scan k values."], ["for i: r[i] = max(a[i..i+k-1])"], "O(n·k)", "O(1)", "Direct.", "Slow for large k."),
A("Monotonic deque", """static int[] solve(int[] a, int k) {
    int[] r = new int[a.length - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();
    for (int i = 0; i < a.length; i++) {
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast();
        dq.addLast(i);
        if (dq.peekFirst() <= i - k) dq.pollFirst();
        if (i >= k - 1) r[i - k + 1] = a[dq.peekFirst()];
    }
    return r;
}""", "The deque front is always the current window's maximum.", ["Pop smaller values from the back.", "Push i.", "Drop the front if it left the window.", "Record the front."], ["for i: pop back while ≤ a[i]; push i", "    if front out of window: pop front", "    if i ≥ k-1: output a[front]"], "O(n)", "O(k)", "Deque values stay decreasing and in-window.", "—"),
[("1 3 -1 -3 5 3 6 7\n3", "3 3 5 5 6 7"), ("1\n1", "1"), ("9 8 7\n3", "9"), ("1 -1\n1", "1 -1")],
viz_opt={"algorithm": "pattern-monotonic-queue", "input": {"values": [1, 3, -1, -3, 5, 3, 6, 7], "k": 3}})

problem("largest-rectangle-histogram", "Biggest Billboard", "monotonic-stack", "HARD", ["monotonic stack"],
"""Bars of width 1 have the given heights. Print the area of the largest axis-aligned rectangle that fits under the histogram.""",
"Line 1: heights.", "The maximum area.", ["1 ≤ n ≤ 10^5", "0 ≤ h ≤ 10^4"], ["For each bar, find how far it can extend left and right while bars are at least as tall.", "An increasing stack finds both boundaries."], ["All equal", "Zero heights"],
"System.out.println(solve(ints(line(0))));", "static long solve(int[] h) {\n    // TODO\n    return 0;\n}",
A("Expand from each bar", """static long solve(int[] h) {
    long best = 0;
    for (int i = 0; i < h.length; i++) {
        int l = i, r = i;
        while (l > 0 && h[l - 1] >= h[i]) l--;
        while (r < h.length - 1 && h[r + 1] >= h[i]) r++;
        best = Math.max(best, (long) h[i] * (r - l + 1));
    }
    return best;
}""", "Each bar's height is the limiting height of some optimal rectangle.", ["For each bar, widen while neighbours are not shorter."], ["for i: extend l, r; best = max(best, h[i]*(r-l+1))"], "O(n²)", "O(1)", "Some bar is the minimum of the optimal rectangle.", "Quadratic."),
A("Increasing stack", """static long solve(int[] h) {
    Deque<Integer> st = new ArrayDeque<>();
    long best = 0;
    for (int i = 0; i <= h.length; i++) {
        int cur = i == h.length ? 0 : h[i];
        while (!st.isEmpty() && h[st.peek()] > cur) {
            int height = h[st.pop()];
            int left = st.isEmpty() ? -1 : st.peek();
            best = Math.max(best, (long) height * (i - left - 1));
        }
        st.push(i);
    }
    return best;
}""", "When a shorter bar arrives, popped bars learn their right limit; the new top is their left limit.", ["Keep bar indices with increasing heights.", "On a shorter bar, pop and compute area.", "A sentinel 0 at the end flushes the stack."], ["for i in 0..n (h[n]=0):", "    while top taller: pop; width = i - newTop - 1; best = max", "    push i"], "O(n)", "O(n)", "Each bar's maximal extent is bounded by the first shorter bars on both sides.", "—"),
[("2 1 5 6 2 3", "10"), ("2 4", "4"), ("3 3 3", "9"), ("0", "0"), ("6 2 5 4 5 1 6", "12")], related=["daily-temperatures"])
