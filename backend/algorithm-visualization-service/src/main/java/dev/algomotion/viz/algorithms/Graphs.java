package dev.algomotion.viz.algorithms;

import dev.algomotion.viz.engine.InputException;
import dev.algomotion.viz.engine.Recorder;
import dev.algomotion.viz.engine.States;
import dev.algomotion.viz.engine.Trace;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** BFS and Dijkstra on the same "A-B:4, B-C" edge format as the frontend. */
public final class Graphs {
    private Graphs() {}

    record Edge(String id, String from, String to, int w) {}

    record Graph(boolean directed, boolean weighted, List<String> nodes, List<Edge> edges) {
        Map<String, List<Edge>> adj() {
            Map<String, List<Edge>> m = new LinkedHashMap<>();
            nodes.forEach(n -> m.put(n, new ArrayList<>()));
            for (Edge e : edges) {
                m.get(e.from()).add(e);
                if (!directed) m.get(e.to()).add(new Edge(e.id(), e.to(), e.from(), e.w()));
            }
            m.values().forEach(l -> l.sort(Comparator.comparing(Edge::to)));
            return m;
        }
    }

    private static final Pattern EDGE = Pattern.compile("^([A-Za-z0-9]{1,3})\\s*[-–>]+\\s*([A-Za-z0-9]{1,3})(?:\\s*:\\s*(-?\\d{1,4}))?$");

    static Graph parse(Map<String, Object> in) {
        String text = String.valueOf(in.getOrDefault("edges", ""));
        boolean directed = "true".equals(String.valueOf(in.get("directed")));
        String[] parts = text.split("[,;\\n]+");
        if (parts.length > 30) throw new InputException("At most 30 edges.");
        TreeSet<String> nodes = new TreeSet<>();
        List<Edge> edges = new ArrayList<>();
        boolean weighted = false;
        int i = 0;
        for (String raw : parts) {
            String p = raw.trim();
            if (p.isEmpty()) continue;
            Matcher m = EDGE.matcher(p);
            if (!m.matches()) throw new InputException("Cannot parse edge \"" + p + "\". Use A-B or A-B:4.");
            if (m.group(1).equals(m.group(2))) throw new InputException("Self-loops are not supported.");
            if (m.group(3) != null) weighted = true;
            nodes.add(m.group(1));
            nodes.add(m.group(2));
            edges.add(new Edge("e" + i++, m.group(1), m.group(2), m.group(3) == null ? 1 : Integer.parseInt(m.group(3))));
        }
        if (nodes.size() > 12) throw new InputException("At most 12 vertices.");
        return new Graph(directed, weighted, new ArrayList<>(nodes), edges);
    }

    static String start(Map<String, Object> in, Graph g) {
        String s = String.valueOf(in.getOrDefault("start", "")).trim();
        if (!g.nodes().contains(s)) throw new InputException("Start vertex \"" + s + "\" is not in the graph.");
        return s;
    }

    static Map<String, Object> state(Graph g, Map<String, String> nodeRoles, Map<String, String> edgeRoles, Map<String, String> labels, String frontierLabel, List<String> frontier) {
        List<Map<String, Object>> nodes = new ArrayList<>();
        int n = g.nodes().size();
        for (int i = 0; i < n; i++) {
            double ang = 2 * Math.PI * i / Math.max(n, 1) - Math.PI / 2;
            nodes.add(Map.of("id", g.nodes().get(i), "label", g.nodes().get(i), "x", Math.round(50 + 38 * Math.cos(ang)), "y", Math.round(50 + 38 * Math.sin(ang))));
        }
        List<Map<String, Object>> edges = new ArrayList<>();
        for (Edge e : g.edges()) {
            Map<String, Object> m = new LinkedHashMap<>(Map.of("id", e.id(), "from", e.from(), "to", e.to()));
            if (g.weighted()) m.put("weight", e.w());
            edges.add(m);
        }
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("kind", "graph");
        s.put("directed", g.directed());
        s.put("weighted", g.weighted());
        s.put("nodes", nodes);
        s.put("edges", edges);
        s.put("nodeRoles", new LinkedHashMap<>(nodeRoles));
        s.put("edgeRoles", new LinkedHashMap<>(edgeRoles));
        s.put("nodeLabels", new LinkedHashMap<>(labels));
        if (frontier != null) s.put("frontier", Map.of("label", frontierLabel, "items", new ArrayList<>(frontier)));
        return s;
    }

    public static final class Bfs implements Algorithm {
        public String id() { return "graph-bfs"; }
        public String name() { return "Breadth-first search"; }
        public String category() { return "graphs"; }
        public Map<String, String> complexity() { return Map.of("best", "O(V + E)", "average", "O(V + E)", "worst", "O(V + E)", "space", "O(V)"); }

        public Trace run(Map<String, Object> in) {
            Graph g = parse(in);
            String s = start(in, g);
            var adj = g.adj();
            Recorder rec = new Recorder(id(), in);
            Map<String, String> roles = new LinkedHashMap<>(), eroles = new LinkedHashMap<>(), labels = new LinkedHashMap<>();
            Deque<String> q = new ArrayDeque<>(List.of(s));
            Set<String> seen = new LinkedHashSet<>(List.of(s));
            List<String> order = new ArrayList<>();
            roles.put(s, "frontier");
            labels.put(s, "d=0");
            Map<String, Integer> dist = new HashMap<>(Map.of(s, 0));
            rec.snap("INIT", "Enqueue start vertex " + s + ".", state(g, roles, eroles, labels, "queue", new ArrayList<>(q)), 1, States.vars("queue", new ArrayList<>(q)));
            while (!q.isEmpty()) {
                String u = q.poll();
                order.add(u);
                roles.put(u, "visited");
                rec.snap("VISIT", "Dequeue " + u + " and visit it.", state(g, roles, eroles, labels, "queue", new ArrayList<>(q)), 3, States.vars("queue", new ArrayList<>(q)));
                for (Edge e : adj.get(u)) {
                    if (seen.add(e.to())) {
                        q.add(e.to());
                        dist.put(e.to(), dist.get(u) + 1);
                        roles.put(e.to(), "frontier");
                        labels.put(e.to(), "d=" + dist.get(e.to()));
                        eroles.put(e.id(), "path");
                        rec.snap("ENQUEUE", e.to() + " is new — mark visited and enqueue (distance " + dist.get(e.to()) + ").", state(g, roles, eroles, labels, "queue", new ArrayList<>(q)), 5, States.vars("queue", new ArrayList<>(q)));
                    } else {
                        rec.snap("COMPARE", e.to() + " already discovered — skip.", state(g, roles, eroles, labels, "queue", new ArrayList<>(q)), 4, States.vars("queue", new ArrayList<>(q)));
                    }
                }
            }
            return rec.finish(order, "BFS order: " + String.join(" → ", order) + ".", state(g, roles, eroles, labels, null, null), null);
        }
    }

    public static final class Dijkstra implements Algorithm {
        public String id() { return "graph-dijkstra"; }
        public String name() { return "Dijkstra's shortest paths"; }
        public String category() { return "graphs"; }
        public Map<String, String> complexity() { return Map.of("best", "O((V + E) log V)", "average", "O((V + E) log V)", "worst", "O((V + E) log V)", "space", "O(V)"); }

        public Trace run(Map<String, Object> in) {
            Graph g = parse(in);
            String s = start(in, g);
            for (Edge e : g.edges()) if (e.w() < 0) throw new InputException("Dijkstra requires non-negative weights, but " + e.from() + "-" + e.to() + " has weight " + e.w() + ". Use Bellman-Ford instead.");
            var adj = g.adj();
            Recorder rec = new Recorder(id(), in);
            Map<String, Long> dist = new LinkedHashMap<>();
            g.nodes().forEach(n -> dist.put(n, Long.MAX_VALUE));
            dist.put(s, 0L);
            Map<String, String> roles = new LinkedHashMap<>(), eroles = new LinkedHashMap<>(), labels = new LinkedHashMap<>();
            Runnable relabel = () -> dist.forEach((k, v) -> labels.put(k, v == Long.MAX_VALUE ? "∞" : String.valueOf(v)));
            relabel.run();
            PriorityQueue<Object[]> pq = new PriorityQueue<>(Comparator.<Object[]>comparingLong(x -> (Long) x[0]).thenComparing(x -> (String) x[1]));
            pq.add(new Object[] {0L, s});
            Set<String> settled = new HashSet<>();
            rec.snap("INIT", "dist[" + s + "] = 0, all others ∞.", state(g, roles, eroles, labels, "priority queue", List.of(s + ":0")), 1, null);
            while (!pq.isEmpty()) {
                Object[] top = pq.poll();
                String u = (String) top[1];
                if (!settled.add(u)) continue;
                roles.put(u, "visited");
                rec.snap("VISIT", "Settle " + u + " with distance " + top[0] + ".", state(g, roles, eroles, labels, "priority queue", null), 4, null);
                for (Edge e : adj.get(u)) {
                    if (settled.contains(e.to())) continue;
                    long cand = dist.get(u) + e.w();
                    if (cand < dist.get(e.to())) {
                        dist.put(e.to(), cand);
                        pq.add(new Object[] {cand, e.to()});
                        roles.put(e.to(), "frontier");
                        relabel.run();
                        rec.snap("RELAX", "Relax " + u + "→" + e.to() + ": " + dist.get(u) + " + " + e.w() + " = " + cand + " improves the distance.", state(g, roles, eroles, labels, "priority queue", null), 6, null);
                    } else {
                        rec.snap("COMPARE", u + "→" + e.to() + ": " + cand + " is not better.", state(g, roles, eroles, labels, "priority queue", null), 6, null);
                    }
                }
            }
            Map<String, Object> result = new LinkedHashMap<>();
            dist.forEach((k, v) -> result.put(k, v == Long.MAX_VALUE ? null : v));
            return rec.finish(result, "Shortest distances computed.", state(g, roles, eroles, labels, null, null), null);
        }
    }
}
