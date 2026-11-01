package dev.algomotion.viz.algorithms;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class Registry {
    private final Map<String, Algorithm> byId = new LinkedHashMap<>();

    public Registry() {
        for (Algorithm a : List.of(new Searching.Linear(), new Searching.Binary(), new Sorting.Bubble(), new Sorting.Insertion(), new Sorting.Merge(),
            new Sorting.Quick(), new Graphs.Bfs(), new Graphs.Dijkstra())) byId.put(a.id(), a);
    }

    public List<Algorithm> all() { return List.copyOf(byId.values()); }

    public Optional<Algorithm> get(String id) { return Optional.ofNullable(byId.get(id)); }
}
