from common import problem, A

GRID_MAIN = """int r = Integer.parseInt(line(0));
char[][] g = new char[r][];
for (int i = 0; i < r; i++) g[i] = line(1 + i).toCharArray();
System.out.println(solve(g));"""

problem("number-of-islands", "Count the Islands", "graphs", "MEDIUM", ["flood fill", "BFS/DFS"],
"""A map uses '1' for land and '0' for water. Islands are groups of land connected horizontally or vertically. Print the number of islands.""",
"Line 1: rows R.\nNext R lines: strings of 0/1.", "The count.", ["1 ≤ R, C ≤ 300"], ["Every unvisited land cell starts a new island.", "Flood-fill it so it is never counted again."], ["All water", "Diagonal neighbours are NOT connected"],
GRID_MAIN, "static int solve(char[][] g) {\n    // TODO\n    return 0;\n}",
A("Union-Find over land cells", """static int[] parent;
static int find(int x) { while (parent[x] != x) x = parent[x] = parent[parent[x]]; return x; }
static int solve(char[][] g) {
    int R = g.length, C = g[0].length, count = 0;
    parent = new int[R * C];
    for (int i = 0; i < R * C; i++) parent[i] = i;
    for (int i = 0; i < R; i++) for (int j = 0; j < C; j++) if (g[i][j] == '1') {
        count++;
        if (i > 0 && g[i - 1][j] == '1') { int a = find(i * C + j), b = find((i - 1) * C + j); if (a != b) { parent[a] = b; count--; } }
        if (j > 0 && g[i][j - 1] == '1') { int a = find(i * C + j), b = find(i * C + j - 1); if (a != b) { parent[a] = b; count--; } }
    }
    return count;
}""", "Start with every land cell alone; each successful union merges two islands.", ["count = land cells.", "Union with up/left land neighbours; decrement on merge."], ["for land cell: count++; union with up/left land", "return count"], "O(RC α)", "O(RC)", "Components = cells − successful unions.", "More code than flood fill for a one-off query."),
A("BFS flood fill", """static int solve(char[][] g) {
    int R = g.length, C = g[0].length, count = 0;
    for (int i = 0; i < R; i++) for (int j = 0; j < C; j++) if (g[i][j] == '1') {
        count++;
        Deque<int[]> q = new ArrayDeque<>();
        q.add(new int[]{i, j}); g[i][j] = '0';
        while (!q.isEmpty()) {
            int[] c = q.poll();
            for (int[] d : new int[][]{{1,0},{-1,0},{0,1},{0,-1}}) {
                int x = c[0] + d[0], y = c[1] + d[1];
                if (x >= 0 && y >= 0 && x < R && y < C && g[x][y] == '1') { g[x][y] = '0'; q.add(new int[]{x, y}); }
            }
        }
    }
    return count;
}""", "Sink each island as soon as you discover it.", ["Scan cells.", "On land: count++, BFS turning connected land into water."], ["for cell: if land: count++; BFS sink", "return count"], "O(RC)", "O(min(R,C)) queue typical", "Each island is discovered exactly once, at its first scanned cell.", "Mutates the grid."),
[("4\n11110\n11010\n11000\n00000", "1"), ("4\n11000\n11000\n00100\n00011", "3"), ("1\n0", "0"), ("3\n101\n010\n101", "5")],
viz_opt={"algorithm": "pattern-number-of-islands", "input": {"grid": "11000, 11000, 00100, 00011"}})

problem("course-schedule", "Can You Graduate?", "graphs", "MEDIUM", ["topological sort", "cycle detection"],
"""There are n courses 0..n−1 and prerequisite pairs "a b" meaning b must be taken before a. Print true if all courses can be finished.""",
"Line 1: n.\nLine 2: m (pairs).\nNext m lines: a b.", "true or false", ["1 ≤ n ≤ 2000", "0 ≤ m ≤ 5000"], ["It is impossible exactly when the prerequisite graph has a cycle.", "Kahn's algorithm: repeatedly take courses with no remaining prerequisites."], ["No prerequisites", "Self-dependency"],
"""int n = Integer.parseInt(line(0)), m = Integer.parseInt(line(1));
int[][] p = new int[m][];
for (int i = 0; i < m; i++) p[i] = ints(line(2 + i));
System.out.println(solve(n, p));""",
"static boolean solve(int n, int[][] pre) {\n    // TODO\n    return true;\n}",
A("DFS colouring", """static boolean solve(int n, int[][] pre) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : pre) g.get(e[1]).add(e[0]);
    int[] col = new int[n];
    for (int i = 0; i < n; i++) if (cyc(i, g, col)) return false;
    return true;
}
static boolean cyc(int u, List<List<Integer>> g, int[] col) {
    if (col[u] == 1) return true;
    if (col[u] == 2) return false;
    col[u] = 1;
    for (int v : g.get(u)) if (cyc(v, g, col)) return true;
    col[u] = 2;
    return false;
}""", "A back edge to a vertex on the current DFS path is a cycle.", ["Colour white/grey/black.", "Grey→grey edge ⇒ cycle."], ["dfs(u): grey; for v: grey → cycle; white → dfs", "black"], "O(V + E)", "O(V)", "Standard back-edge criterion.", "Recursive depth up to V."),
A("Kahn's algorithm", """static boolean solve(int n, int[][] pre) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    int[] indeg = new int[n];
    for (int[] e : pre) { g.get(e[1]).add(e[0]); indeg[e[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.add(i);
    int taken = 0;
    while (!q.isEmpty()) {
        int u = q.poll(); taken++;
        for (int v : g.get(u)) if (--indeg[v] == 0) q.add(v);
    }
    return taken == n;
}""", "Take any course without pending prerequisites; a cycle leaves courses stuck.", ["Compute in-degrees.", "Queue zero in-degree courses; removing one may free others.", "Success iff all taken."], ["queue indegree-0", "while q: take u; decrement successors", "return taken == n"], "O(V + E)", "O(V + E)", "A DAG always has a source; cycles never reach in-degree 0.", "—"),
[("2\n1\n1 0", "true"), ("2\n2\n1 0\n0 1", "false"), ("3\n0", "true"), ("4\n4\n1 0\n2 1\n3 2\n1 3", "false"), ("1\n1\n0 0", "false")],
viz_opt={"algorithm": "graph-topological-sort", "input": {"edges": "A>B, B>C, C>D", "directed": "true", "start": "A"}})

problem("network-delay", "Signal Spread Time", "graphs", "HARD", ["Dijkstra", "shortest paths"],
"""A network has n nodes 1..n and directed links "u v w" (w ≥ 0 ms). A signal starts at node k. Print the time until every node receives it, or −1 if some node never does.""",
"Line 1: n k.\nLine 2: m.\nNext m lines: u v w.", "The time, or −1.", ["1 ≤ n ≤ 100", "0 ≤ w ≤ 100"], ["The answer is the largest shortest-path distance from k.", "Non-negative weights ⇒ Dijkstra."], ["Unreachable node", "n = 1"],
"""int[] nk = ints(line(0)); int m = Integer.parseInt(line(1));
int[][] e = new int[m][];
for (int i = 0; i < m; i++) e[i] = ints(line(2 + i));
System.out.println(solve(nk[0], nk[1], e));""",
"static int solve(int n, int k, int[][] edges) {\n    // TODO\n    return -1;\n}",
A("Bellman-Ford", """static int solve(int n, int k, int[][] edges) {
    long[] d = new long[n + 1];
    Arrays.fill(d, Long.MAX_VALUE / 4); d[k] = 0;
    for (int i = 1; i < n; i++) for (int[] e : edges) if (d[e[0]] + e[2] < d[e[1]]) d[e[1]] = d[e[0]] + e[2];
    long best = 0;
    for (int v = 1; v <= n; v++) best = Math.max(best, d[v]);
    return best >= Long.MAX_VALUE / 4 ? -1 : (int) best;
}""", "Relax all edges n−1 times.", ["Relax every edge n−1 rounds.", "Take the max distance."], ["repeat n-1: relax all edges", "answer = max dist or -1"], "O(n·m)", "O(n)", "n−1 rounds suffice for simple shortest paths.", "Slower than Dijkstra."),
A("Dijkstra", """static int solve(int n, int k, int[][] edges) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) g.get(e[0]).add(new int[]{e[1], e[2]});
    int[] d = new int[n + 1];
    Arrays.fill(d, Integer.MAX_VALUE); d[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.add(new int[]{0, k});
    while (!pq.isEmpty()) {
        int[] c = pq.poll();
        if (c[0] > d[c[1]]) continue;
        for (int[] e : g.get(c[1])) if (c[0] + e[1] < d[e[0]]) { d[e[0]] = c[0] + e[1]; pq.add(new int[]{d[e[0]], e[0]}); }
    }
    int best = 0;
    for (int v = 1; v <= n; v++) { if (d[v] == Integer.MAX_VALUE) return -1; best = Math.max(best, d[v]); }
    return best;
}""", "Settle nodes in order of distance; relax outgoing links.", ["Priority queue keyed by distance.", "Skip stale entries.", "Answer = max distance."], ["pq = {(0,k)}", "pop (d,u); skip stale; relax edges", "return max(d) or -1"], "O(m log n)", "O(n + m)", "With non-negative weights the popped minimum is final.", "Requires non-negative weights."),
[("4 2\n3\n2 1 1\n2 3 1\n3 4 1", "2"), ("2 1\n1\n1 2 1", "1"), ("2 2\n1\n1 2 1", "-1"), ("1 1\n0", "0")],
viz_opt={"algorithm": "graph-dijkstra", "input": {"edges": "B>A:1, B>C:1, C>D:1", "directed": "true", "start": "B"}})

problem("flood-fill", "Paint Bucket", "graphs", "EASY", ["DFS", "flood fill"],
"""An image is a grid of colour numbers. Starting at (sr, sc), repaint the connected (4-directional) region of the same colour with the new colour and print the image.""",
"Line 1: R.\nNext R lines: rows.\nLast line: sr sc colour.", "The image, one row per line.", ["1 ≤ R, C ≤ 50"], ["If the new colour equals the old one, nothing changes (and naive DFS would loop forever)."], ["Same colour", "Single pixel"],
"""int r = Integer.parseInt(line(0));
int[][] img = new int[r][];
for (int i = 0; i < r; i++) img[i] = ints(line(1 + i));
int[] s = ints(line(1 + r));
for (int[] row : solve(img, s[0], s[1], s[2])) System.out.println(join(row));""",
"static int[][] solve(int[][] img, int sr, int sc, int color) {\n    // TODO\n    return img;\n}",
None,
A("DFS", """static int[][] solve(int[][] img, int sr, int sc, int color) {
    int old = img[sr][sc];
    if (old != color) fill(img, sr, sc, old, color);
    return img;
}
static void fill(int[][] g, int r, int c, int old, int col) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != old) return;
    g[r][c] = col;
    fill(g, r + 1, c, old, col); fill(g, r - 1, c, old, col); fill(g, r, c + 1, old, col); fill(g, r, c - 1, old, col);
}""", "Spread from the start to same-coloured neighbours.", ["Guard against old == new.", "Recolour and recurse into 4 neighbours."], ["if old == new: return", "fill(r,c): if in bounds and == old: paint; recurse 4 ways"], "O(RC)", "O(RC) recursion", "Every reachable same-coloured cell is painted once.", "Recursion depth can reach R·C (use BFS for huge images)."),
[("3\n1 1 1\n1 1 0\n1 0 1\n1 1 2", "2 2 2\n2 2 0\n2 0 1"), ("2\n0 0\n0 0\n0 0 0", "0 0\n0 0")])

# ---------------------------------------------------------------- union-find
UF = """
    static int[] par, rnk;
    static int find(int x) { return par[x] == x ? x : (par[x] = find(par[x])); }
    static boolean union(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (rnk[a] < rnk[b]) { int t = a; a = b; b = t; }
        par[b] = a; if (rnk[a] == rnk[b]) rnk[a]++;
        return true;
    }
    static void init(int n) { par = new int[n]; rnk = new int[n]; for (int i = 0; i < n; i++) par[i] = i; }
"""

EDGE_MAIN = """int n = Integer.parseInt(line(0)), m = Integer.parseInt(line(1));
int[][] e = new int[m][];
for (int i = 0; i < m; i++) e[i] = ints(line(2 + i));
System.out.println(solve(n, e));"""

problem("count-provinces", "Friend Circles", "union-find", "EASY", ["union-find", "connected components"],
"""n people (0..n−1) and m friendships "a b". Friendship is transitive within a circle. Print the number of circles.""",
"Line 1: n.\nLine 2: m.\nNext m lines: a b.", "The number of circles.", ["1 ≤ n ≤ 10^4"], ["Start with n circles; every union of two different circles removes one."], ["No friendships", "Repeated friendship"],
EDGE_MAIN, "static int solve(int n, int[][] e) {\n    // TODO\n    return n;\n}",
A("DFS components", """static int solve(int n, int[][] e) {
    List<List<Integer>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] x : e) { g.get(x[0]).add(x[1]); g.get(x[1]).add(x[0]); }
    boolean[] seen = new boolean[n];
    int c = 0;
    for (int i = 0; i < n; i++) if (!seen[i]) {
        c++;
        Deque<Integer> st = new ArrayDeque<>(); st.push(i); seen[i] = true;
        while (!st.isEmpty()) for (int v : g.get(st.pop())) if (!seen[v]) { seen[v] = true; st.push(v); }
    }
    return c;
}""", "Count graph components with DFS.", ["Build adjacency.", "Each DFS start is a new component."], ["for v unseen: c++; dfs(v)"], "O(n + m)", "O(n + m)", "Standard component counting.", "Builds the whole graph."),
A("Union-Find", """static int solve(int n, int[][] e) {
    init(n);
    int c = n;
    for (int[] x : e) if (union(x[0], x[1])) c--;
    return c;
}""", "Merge sets as friendships arrive.", ["c = n.", "Each successful union decrements c."], ["c = n; for (a,b): if union(a,b): c--"], "O(m α(n))", "O(n)", "Each merge joins exactly two components.", "—"),
[("3\n2\n0 1\n1 2", "1"), ("3\n1\n0 1", "2"), ("4\n0", "4"), ("5\n3\n0 1\n1 0\n3 4", "3")], extra=UF,
viz_opt={"algorithm": "union-find", "input": {"script": "union A B, union B C, union D E"}})

problem("redundant-connection", "The Extra Cable", "union-find", "MEDIUM", ["union-find", "cycle detection"],
"""A network of n nodes (1..n) was a tree, then one extra cable was added. Given the n cables in order, print the last cable "u v" whose removal leaves a tree.""",
"Line 1: n.\nNext n lines: u v.", "u v", ["3 ≤ n ≤ 1000"], ["The first cable that connects two already-connected nodes closes the cycle."], ["Cycle through node 1"],
"""int n = Integer.parseInt(line(0));
int[][] e = new int[n][];
for (int i = 0; i < n; i++) e[i] = ints(line(1 + i));
int[] r = solve(n, e);
System.out.println(r[0] + " " + r[1]);""",
"static int[] solve(int n, int[][] e) {\n    // TODO\n    return e[0];\n}",
A("Try removing each edge", """static int[] solve(int n, int[][] e) {
    for (int skip = e.length - 1; skip >= 0; skip--) {
        init(n + 1);
        boolean ok = true;
        for (int i = 0; i < e.length; i++) if (i != skip && !union(e[i][0], e[i][1])) { ok = false; break; }
        if (ok) return e[skip];
    }
    return null;
}""", "Remove candidates from the end; the first removal that leaves an acyclic graph wins.", ["For each edge from last to first, check acyclicity without it."], ["for skip from last: if graph \\\\ skip acyclic: return skip"], "O(n² α)", "O(n)", "n−1 acyclic edges on n nodes form a tree.", "Quadratic."),
A("First edge closing a cycle", """static int[] solve(int n, int[][] e) {
    init(n + 1);
    for (int[] x : e) if (!union(x[0], x[1])) return x;
    return null;
}""", "Add cables in order; the one joining an existing set is redundant.", ["Union each edge.", "Return the first that fails."], ["for (u,v): if find(u)==find(v): return (u,v); union"], "O(n α(n))", "O(n)", "Exactly one cycle exists; its last-added edge is the first failing union.", "—"),
[("3\n1 2\n1 3\n2 3", "2 3"), ("5\n1 2\n2 3\n3 4\n1 4\n1 5", "1 4")], extra=UF,
viz_opt={"algorithm": "graph-undirected-cycle", "input": {"edges": "A-B, A-C, B-C", "directed": "false", "start": "A"}})

problem("min-cost-connect", "Cheapest Wiring", "union-find", "HARD", ["Kruskal", "minimum spanning tree"],
"""n buildings 0..n−1 and m possible cables "u v cost". Print the minimum total cost to connect every building, or −1 if impossible.""",
"Line 1: n.\nLine 2: m.\nNext m lines: u v cost.", "Minimum cost or −1.", ["1 ≤ n ≤ 10^4", "0 ≤ m ≤ 10^5"], ["Cheapest-edge-first never hurts as long as it doesn't form a cycle (cut property).", "Union-Find detects cycles."], ["Disconnected graph", "n = 1"],
EDGE_MAIN, "static long solve(int n, int[][] e) {\n    // TODO\n    return -1;\n}",
A("Prim with a scan", """static long solve(int n, int[][] e) {
    long[][] w = new long[n][n];
    for (long[] r : w) Arrays.fill(r, Long.MAX_VALUE);
    for (int[] x : e) { w[x[0]][x[1]] = Math.min(w[x[0]][x[1]], x[2]); w[x[1]][x[0]] = w[x[0]][x[1]]; }
    long[] best = new long[n]; Arrays.fill(best, Long.MAX_VALUE); best[0] = 0;
    boolean[] in = new boolean[n];
    long total = 0;
    for (int it = 0; it < n; it++) {
        int u = -1;
        for (int v = 0; v < n; v++) if (!in[v] && (u < 0 || best[v] < best[u])) u = v;
        if (best[u] == Long.MAX_VALUE) return -1;
        in[u] = true; total += best[u];
        for (int v = 0; v < n; v++) if (!in[v] && w[u][v] < best[v]) best[v] = w[u][v];
    }
    return total;
}""", "Grow the tree from building 0, always adding the cheapest attachment.", ["Dense Prim with an adjacency matrix."], ["repeat n: pick cheapest outside vertex; update neighbours"], "O(n²)", "O(n²)", "Cut property.", "O(n²) memory — fine only for small n."),
A("Kruskal + Union-Find", """static long solve(int n, int[][] e) {
    int[][] s = e.clone();
    Arrays.sort(s, (a, b) -> Integer.compare(a[2], b[2]));
    init(n);
    long total = 0; int used = 0;
    for (int[] x : s) if (union(x[0], x[1])) { total += x[2]; used++; }
    return used == n - 1 ? total : -1;
}""", "Sort cables by cost; keep each one that joins two different groups.", ["Sort edges.", "Union if in different sets; add cost.", "Need n−1 edges."], ["sort edges by cost", "for e: if union(u,v): total += w", "return used == n-1 ? total : -1"], "O(m log m)", "O(n)", "Cut property: the cheapest edge across any cut belongs to some MST.", "—"),
[("4\n5\n0 1 1\n1 2 2\n2 3 1\n0 3 5\n0 2 4", "4"), ("3\n1\n0 1 3", "-1"), ("1\n0", "0")], extra=UF,
viz_opt={"algorithm": "graph-kruskal", "input": {"edges": "A-B:1, B-C:2, C-D:1, A-D:5, A-C:4", "directed": "false", "start": "A"}})
