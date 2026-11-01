import { getAlgorithm } from '@/algorithms/registry';
import type { AlgoInput, CategoryId } from '@/algorithms/types';
import { randomInts, rng } from '@/algorithms/util';
import type {
  ArrayState,
  GraphState,
  GridState,
  LinkedListState,
  StackState,
  Trace,
  TreeState,
} from '@/engine/types';
import type { CharacterId } from '@/components/mascot/Mascot';

export interface PathStep {
  label: string;
  to: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: PathStep[];
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'foundations',
    title: 'Foundations: arrays to searching',
    description: 'Indexing, shifting, two pointers and the logarithmic magic of binary search.',
    steps: [
      { label: 'Insert into an array', to: '/visualizer/arrays?algo=array-insert' },
      { label: 'Reverse with two pointers', to: '/visualizer/arrays?algo=array-reverse' },
      { label: 'Linear search', to: '/visualizer/searching?algo=linear-search' },
      { label: 'Challenge: help Byte find the number', to: '/learn/challenges/find-number' },
      { label: 'Binary search', to: '/visualizer/searching?algo=binary-search' },
      { label: 'Lower and upper bound', to: '/visualizer/searching?algo=lower-bound' },
      { label: 'Practice: Binary Search problem', to: '/problems/binary-search' },
    ],
  },
  {
    id: 'pointers',
    title: 'Pointers & linear structures',
    description: 'Linked lists, stacks and queues — and why pointer order matters.',
    steps: [
      { label: 'Insert at head', to: '/visualizer/linked-lists?algo=ll-insert-head' },
      { label: 'Reverse a linked list', to: '/visualizer/linked-lists?algo=ll-reverse' },
      { label: 'Challenge: repair the linked list', to: '/learn/challenges/repair-list' },
      { label: 'Stack operations', to: '/visualizer/stacks?algo=stack-operations' },
      { label: 'Challenge: stack the blocks', to: '/learn/challenges/stack-blocks' },
      { label: 'Circular queue', to: '/visualizer/queues?algo=queue-operations' },
      { label: 'Practice: Valid Brackets', to: '/problems/valid-brackets' },
    ],
  },
  {
    id: 'sorting',
    title: 'Sorting Speedway',
    description: 'Quadratic vs n log n, stability, and how partitioning really works.',
    steps: [
      { label: 'Bubble sort', to: '/visualizer/sorting?algo=bubble-sort' },
      { label: 'Challenge: will they swap?', to: '/learn/challenges/swap-or-not' },
      { label: 'Insertion sort', to: '/visualizer/sorting?algo=insertion-sort' },
      { label: 'Merge sort', to: '/visualizer/sorting?algo=merge-sort' },
      { label: 'Quick sort', to: '/visualizer/sorting?algo=quick-sort' },
      { label: 'Race them side by side', to: '/visualizer/sorting?compare=1' },
    ],
  },
  {
    id: 'trees-graphs',
    title: 'Trees & graphs',
    description: 'Traversals, BST invariants, AVL rotations, BFS/DFS and shortest paths.',
    steps: [
      { label: 'Inorder traversal', to: '/visualizer/trees?algo=tree-inorder' },
      { label: 'Challenge: next inorder node', to: '/learn/challenges/inorder-next' },
      { label: 'BST delete (3 cases)', to: '/visualizer/trees?algo=bst-delete' },
      { label: 'AVL rotations', to: '/visualizer/trees?algo=avl-insert' },
      { label: 'BFS', to: '/visualizer/graphs?algo=graph-bfs' },
      { label: 'Challenge: next BFS node', to: '/learn/challenges/bfs-next' },
      { label: "Dijkstra's algorithm", to: '/visualizer/graphs?algo=graph-dijkstra' },
    ],
  },
  {
    id: 'dp',
    title: 'Dynamic programming detective',
    description: 'From naive recursion to memoization to tabulation.',
    steps: [
      { label: 'Fibonacci: naive vs memo', to: '/visualizer/dynamic-programming?algo=dp-fib-memo' },
      { label: 'Climbing stairs', to: '/visualizer/dynamic-programming?algo=dp-climbing-stairs' },
      { label: 'Challenge: complete the DP table', to: '/learn/challenges/dp-cell' },
      { label: 'Coin change', to: '/visualizer/dynamic-programming?algo=dp-coin-change' },
      { label: 'Longest common subsequence', to: '/visualizer/dynamic-programming?algo=dp-lcs' },
      { label: 'Practice: Coin Change problem', to: '/problems/coin-change' },
    ],
  },
];

// ---------------------------------------------------------------- mini-challenges

export interface ChallengeQuestion {
  /** trace step whose state is shown while asking (the state BEFORE the answer happens) */
  showStep: number;
  prompt: string;
  options: { id: string; label: string }[] | 'number';
  answer: string;
  explain: string;
}

export interface ChallengeDef {
  id: string;
  title: string;
  topic: CategoryId;
  character: CharacterId;
  description: string;
  algorithm: string;
  makeInput: (seed: number) => AlgoInput;
  /** Questions are derived from the deterministic trace — never from an AI guess. */
  questions: (trace: Trace) => ChallengeQuestion[];
}

const arrOf = (t: Trace, i: number) => t.steps[i].state as ArrayState;

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'find-number',
    title: 'Help Byte find the number',
    topic: 'searching',
    character: 'byte',
    description: 'Linear search checks indices left to right. Which index does it inspect next?',
    algorithm: 'linear-search',
    makeInput: (seed) => {
      const values = randomInts(seed, 7, 1, 40);
      return { values, target: values[3 + (seed % 3)] };
    },
    questions: (t) => {
      const values = arrOf(t, 0).values;
      return t.steps.flatMap((s, i) => {
        if (s.operation !== 'COMPARE') return [];
        const idx = Number(s.variables.i);
        return [
          {
            showStep: Math.max(0, i - 1),
            prompt: `Target is ${t.input.target}. Which index does linear search compare next?`,
            options: values.map((v, k) => ({ id: String(k), label: `[${k}] = ${v}` })),
            answer: String(idx),
            explain: s.explanation,
          },
        ];
      });
    },
  },
  {
    id: 'repair-list',
    title: 'Repair the linked list',
    topic: 'linked-lists',
    character: 'node',
    description: 'While reversing a list, which node does curr.next point to after the rewiring step?',
    algorithm: 'll-reverse',
    makeInput: (seed) => ({ values: randomInts(seed, 4, 1, 30) }),
    questions: (t) =>
      t.steps.flatMap((s, i) => {
        if (s.operation !== 'UPDATE') return [];
        const st = s.state as LinkedListState;
        const curr = st.pointers.find((p) => p.name === 'curr')!.at as string;
        const target = st.next[curr];
        const options = [
          { id: 'null', label: 'null' },
          ...st.nodes.filter((n) => n.id !== curr).map((n) => ({ id: n.id, label: `node ${n.value}` })),
        ];
        const currVal = st.nodes.find((n) => n.id === curr)!.value;
        return [
          {
            showStep: i - 1,
            prompt: `curr is node ${currVal}. After "curr.next = prev", where does curr.next point?`,
            options,
            answer: target ?? 'null',
            explain: s.explanation,
          },
        ];
      }),
  },
  {
    id: 'stack-blocks',
    title: 'Stack the blocks',
    topic: 'stacks',
    character: 'bit',
    description: 'Predict the stack after a sequence of pushes and pops.',
    algorithm: 'stack-operations',
    makeInput: (seed) => {
      const r = rng(seed);
      const ops: string[] = [];
      let size = 0;
      for (let k = 0; k < 7; k++) {
        if (size > 0 && r() < 0.4) {
          ops.push('pop');
          size--;
        } else {
          ops.push(`push ${1 + Math.floor(r() * 9)}`);
          size++;
        }
      }
      return { script: ops.join(', '), capacity: 8 };
    },
    questions: (t) => {
      const final = (t.result as number[]) ?? [];
      const r = rng(final.length * 31 + final.reduce((a, b) => a + b, 0));
      const pushes = String(t.input.script).match(/\d+/g)?.map(Number) ?? [];
      const variants = new Set<string>([final.join(',')]);
      variants.add([...final].reverse().join(','));
      variants.add(pushes.slice(0, Math.max(1, final.length)).join(','));
      let guard = 0;
      while (variants.size < 4 && guard++ < 20)
        variants.add([...final, 1 + Math.floor(r() * 9)].slice(-Math.max(1, final.length)).join(','));
      const opts = [...variants]
        .sort()
        .map((v) => ({ id: v, label: v ? `[${v.split(',').join(', ')}]` : '[] (empty)' }));
      return [
        {
          showStep: 0,
          prompt: `Apply: ${t.input.script}. What is the stack (bottom → top)?`,
          options: opts,
          answer: final.join(','),
          explain: `The trace ends with [${final.join(', ')}]. Each pop removes the most recent push (LIFO).`,
        },
      ];
    },
  },
  {
    id: 'bfs-next',
    title: 'Find the next BFS node',
    topic: 'graphs',
    character: 'node',
    description: 'BFS always dequeues from the front of the queue. Which vertex is visited next?',
    algorithm: 'graph-bfs',
    makeInput: (seed) => {
      const presets = [
        'A-B, A-C, B-D, C-D, D-E, E-F',
        'A-B, A-D, B-C, D-E, C-F, E-F',
        'A-C, A-B, C-D, B-E, E-F, D-F',
      ];
      return { edges: presets[seed % presets.length], directed: 'false', start: 'A' };
    },
    questions: (t) =>
      t.steps.flatMap((s, i) => {
        if (s.operation !== 'VISIT' || i < 2) return [];
        const before = t.steps[i - 1].state as GraphState;
        const visited = s.variables.visited as string[];
        const node = (s.state as GraphState).output!.tokens.at(-1)!;
        return [
          {
            showStep: i - 1,
            prompt: `Queue is [${before.frontier?.items.join(', ')}]. Which vertex is visited next?`,
            options: before.nodes.map((n) => ({ id: n.id, label: n.label })),
            answer: node,
            explain: `${s.explanation} (visited so far: ${visited.join(', ')})`,
          },
        ];
      }),
  },
  {
    id: 'dp-cell',
    title: 'Complete the DP table',
    topic: 'dynamic-programming',
    character: 'pixel',
    description: 'ways[i] = ways[i − 1] + ways[i − 2]. Compute the next cell.',
    algorithm: 'dp-climbing-stairs',
    makeInput: (seed) => ({ n: 6 + (seed % 3) }),
    questions: (t) =>
      t.steps.flatMap((s, i) => {
        if (s.operation !== 'DP_UPDATE' || s.variables.i === undefined) return [];
        const g = s.state as GridState;
        const col = Number(s.variables.i);
        return [
          {
            showStep: i - 1,
            prompt: `What is ways[${col}]?`,
            options: 'number' as const,
            answer: String(g.cells[0][col]),
            explain: s.explanation,
          },
        ];
      }),
  },
  {
    id: 'swap-or-not',
    title: 'Will they swap?',
    topic: 'sorting',
    character: 'loop',
    description: 'Bubble sort compares neighbours. Predict whether each comparison causes a swap.',
    algorithm: 'bubble-sort',
    makeInput: (seed) => ({ values: randomInts(seed, 5, 1, 20) }),
    questions: (t) =>
      t.steps
        .flatMap((s, i) => {
          if (s.operation !== 'COMPARE') return [];
          const swapped = t.steps[i + 1]?.operation === 'SWAP';
          return [
            {
              showStep: i,
              prompt: s.explanation.replace('Compare', 'Bubble sort compares') + ' Will they swap?',
              options: [
                { id: 'yes', label: 'Yes, swap' },
                { id: 'no', label: 'No swap' },
              ],
              answer: swapped ? 'yes' : 'no',
              explain: swapped
                ? 'The left value is larger, so they are out of order.'
                : 'They are already in order (equal values never swap — that keeps bubble sort stable).',
            },
          ];
        })
        .slice(0, 8),
  },
  {
    id: 'inorder-next',
    title: 'Next inorder node',
    topic: 'trees',
    character: 'node',
    description: 'Inorder visits left subtree, node, right subtree. Which node is visited next?',
    algorithm: 'tree-inorder',
    makeInput: (seed) => ({
      tree: ['4, 2, 6, 1, 3, 5, 7', '8, 3, 10, 1, 6, null, 14, null, null, 4, 7', '5, 3, 8, 2, 4, 7, 9'][
        seed % 3
      ],
    }),
    questions: (t) =>
      t.steps.flatMap((s, i) => {
        if (s.operation !== 'VISIT') return [];
        const st = s.state as TreeState;
        const label = st.output!.tokens.at(-1)!;
        return [
          {
            showStep: i - 1,
            prompt: `Visited so far: ${st.output!.tokens.slice(0, -1).join(', ') || 'nothing'}. Which node is visited next?`,
            options: st.nodes.map((n) => ({ id: n.label, label: n.label })),
            answer: label,
            explain: s.explanation,
          },
        ];
      }),
  },
  {
    id: 'balanced',
    title: 'Bracket detective',
    topic: 'stacks',
    character: 'bit',
    description: 'When a closer arrives, does it match the opener on top of the stack?',
    algorithm: 'stack-balanced-brackets',
    makeInput: (seed) => ({ expr: ['{[()()]}', '([)]', '(()[]{})', '{[(])}', '[(]{})'][seed % 5] }),
    questions: (t) =>
      t.steps.flatMap((s, i) => {
        if (s.operation !== 'COMPARE') return [];
        const ok = t.steps[i + 1]?.operation === 'POP';
        const st = s.state as StackState;
        return [
          {
            showStep: i,
            prompt: `Top of stack is '${st.items.at(-1) ?? 'empty'}' and the next character is '${s.variables.ch}'. Do they match?`,
            options: [
              { id: 'yes', label: 'Match — pop' },
              { id: 'no', label: 'Mismatch — unbalanced' },
            ],
            answer: ok ? 'yes' : 'no',
            explain: t.steps[i + 1].explanation,
          },
        ];
      }),
  },
];

export function buildChallenge(
  def: ChallengeDef,
  seed: number,
): { trace: Trace; questions: ChallengeQuestion[] } {
  const algo = getAlgorithm(def.algorithm)!;
  const trace = algo.run(def.makeInput(seed));
  return { trace, questions: def.questions(trace) };
}
