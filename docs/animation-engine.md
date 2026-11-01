# Animation engine

## Pipeline

`algorithm → TraceRecorder → validateTrace → player store → renderer → character reaction`

### Trace schema (v1.0)

`frontend/src/engine/types.ts` (TypeScript) and `backend/algorithm-visualization-service/.../engine/Trace.java` (Java) define the same JSON:

```ts
interface Trace { schemaVersion: '1.0'; algorithm: string; input: object; steps: TraceStep[]; result; metrics }
interface TraceStep { step; operation: Operation; explanation; line: number|null; variables; state: VisualState; done }
```

`operation` is one of 39 whitelisted operations (`COMPARE`, `SWAP`, `SHIFT`, `POINTER_MOVE`, `ROTATE`, `RELAX`, `DP_UPDATE`, …). `state` is a discriminated union: `array | linkedList | stack | queue | hash | tree | graph | grid | recursion`. Each holds plain data only (values, node ids, pointer names, roles).

### Recording

Algorithms mutate their own working copies and call `rec.snap(op, explanation, state, {line, vars})` at each meaningful operation. The recorder deep-copies (`structuredClone`) state and variables, so later mutation never leaks into earlier steps. It counts comparisons, swaps, writes and reads, and caps traces at 4,000 steps. Invalid inputs throw `InputError` before any rendering (e.g. unsorted binary search, negative weights in Dijkstra).

### Validation

`validateTrace` checks schema version, algorithm id format, sequential step indices, operation whitelist, explanation length, line numbers, consistent visual kind across steps, and that only the last step is `done`. Traces are data; nothing in a trace is ever evaluated.

### Deterministic playback

`createPlayerStore()` (Zustand) holds `{trace, index, playing, speed, generation}`.

- **Seek** sets `index`, which is exact because every step is a full snapshot.
- **Pause** only flips `playing`. State is untouched.
- **Clock:** one `setTimeout` per step in a `useEffect` keyed on `(playing, speed, index, generation)`. It is cleaned up on any change, so no timers pile up.
- **Stale callbacks:** `load()` bumps `generation`; `tick(gen)` ignores ticks from an older generation.
- Timing (`900 ms / speed`) is presentational. Operation counts shown in the UI come from the trace, not from the clock.

### Rendering

Renderers are pure functions of `(state, playful)`. Every role (`compare`, `swap`, `found`, `sorted`, `pivot`, …) has a colour **and** a glyph/label, so state is never shown by colour alone. Each renderer adds ARIA labels (e.g. `index 3 value 23, found`) and a legend. Graph vertices can be dragged; positions are view state only. Motion transitions are disabled with reduced motion or at 2×.

### Character reactions

`reactions.ts` maps step operations to app events (`COMPARE → COMPARE_ELEMENTS`, `FOUND → VALUE_FOUND`, last step → `ALGORITHM_COMPLETED`, …) and app job states (`TESTS_PASSED` only from a completed execution) to a mood, animation and line. Reactions read from the trace and never write to it.

### Cross-language conformance

`frontend/src/algorithms/fixtures.export.test.ts` exports traces for 10 fixtures to `content/trace-fixtures.json`. `ConformanceTest.java` asserts that the Java engine produces the **same operation sequence, pseudocode lines, array snapshots and result** for each fixture.

### Adding an algorithm

1. Implement `AlgorithmDef` in `frontend/src/algorithms/` (pseudocode lines, complexity, inputs, `run`).
2. Register it in `registry.ts`. The registry test automatically checks trace validity, determinism and that pseudocode line numbers are in range.
3. Add focused correctness tests (edge cases, invariants).
