import { InputError, TraceRecorder } from '@/engine/recorder';
import type { Highlight, QueueState } from '@/engine/types';
import { parseScript } from './stack';
import type { AlgorithmDef } from './types';
import { num, str } from './util';

type QVariant = QueueState['variant'];

/** Fixed-capacity queue engine covering linear, circular, deque and min-priority behaviour. */
export class QueueEngine {
  slots: (number | null)[];
  front = 0;
  rear = -1; // index of last element (linear/circular), meaningful only when size > 0
  size = 0;
  constructor(
    readonly variant: QVariant,
    readonly capacity: number,
  ) {
    this.slots = new Array(capacity).fill(null);
  }
  state(highlights: Highlight[] = []): QueueState {
    return {
      kind: 'queue',
      variant: this.variant,
      slots: [...this.slots],
      front: this.front,
      rear: this.rear < 0 ? 0 : this.rear,
      size: this.size,
      capacity: this.capacity,
      highlights,
    };
  }
  get isFull(): boolean {
    // A linear queue cannot reuse freed slots at the front: full once rear hits the end.
    if (this.variant === 'linear') return this.rear === this.capacity - 1;
    return this.size === this.capacity;
  }
  /** Snapshot of logical order front → rear. */
  toArray(): number[] {
    if (this.variant === 'priority' || this.variant === 'linear')
      return this.slots.slice(this.front, this.front + this.size) as number[];
    return Array.from(
      { length: this.size },
      (_, k) => this.slots[(this.front + k) % this.capacity] as number,
    );
  }
}

export const queueOperations: AlgorithmDef = {
  id: 'queue-operations',
  name: 'Queue, circular queue, deque & priority queue',
  category: 'queues',
  visual: 'queue',
  summary:
    'FIFO structures with explicit front and rear indices. Circular queues wrap around; deques work at both ends; priority queues always serve the smallest key first.',
  pseudocode: [
    'enqueue(x): if full: overflow; rear = next(rear); slots[rear] = x; size++',
    'dequeue(): if empty: underflow; x = slots[front]; front = next(front); size--',
    'next(i) = i + 1 (linear)  |  (i + 1) mod capacity (circular / deque)',
    'pushFront(x): front = (front - 1 + cap) mod cap; slots[front] = x',
    'popBack(): x = slots[rear]; rear = (rear - 1 + cap) mod cap',
    'priority enqueue: shift larger keys right, insert in sorted position',
    'front(), rear(), isEmpty(), isFull(), size()',
  ],
  complexity: {
    time: { best: 'O(1)', average: 'O(1)', worst: 'O(1) — O(n) for sorted-array priority insert' },
    space: 'O(capacity)',
  },
  assumptions: [
    'Linear queue never reuses freed front slots, which is why circular queues exist.',
    'Priority queue is a min-priority queue (smaller value = higher priority) backed by a sorted array; the Heaps section shows the O(log n) heap version.',
  ],
  inputs: [
    {
      key: 'variant',
      label: 'Variant',
      type: 'select',
      options: [
        { value: 'linear', label: 'Linear queue' },
        { value: 'circular', label: 'Circular queue' },
        { value: 'deque', label: 'Deque' },
        { value: 'priority', label: 'Priority queue' },
      ],
    },
    { key: 'script', label: 'Operations', type: 'text', maxLength: 220 },
    { key: 'capacity', label: 'Capacity', type: 'number', min: 2, max: 10 },
  ],
  defaultInput: {
    variant: 'circular',
    script:
      'enqueue 10, enqueue 20, enqueue 30, dequeue, enqueue 40, enqueue 50, enqueue 60, front, rear, dequeue, size',
    capacity: 4,
  },
  run(input) {
    const variant = String(input.variant) as QVariant;
    if (!['linear', 'circular', 'deque', 'priority'].includes(variant))
      throw new InputError('Unknown variant');
    const cap = num(input, 'capacity', { min: 2, max: 10 });
    const verbs: Record<string, boolean> = {
      enqueue: true,
      dequeue: false,
      front: false,
      rear: false,
      isempty: false,
      isfull: false,
      size: false,
    };
    if (variant === 'deque')
      Object.assign(verbs, { pushfront: true, pushback: true, popfront: false, popback: false });
    const ops = parseScript(str(input, 'script', 220), verbs, 24);
    const q = new QueueEngine(variant, cap);
    const rec = new TraceRecorder<QueueState>('queue-operations', {
      variant,
      script: input.script,
      capacity: cap,
    });
    const vars = () => ({ front: q.front, rear: q.rear, size: q.size, capacity: cap });
    rec.snap('INIT', `Empty ${variant} queue with capacity ${cap}.`, q.state(), { vars: vars() });

    const enqueueBack = (x: number) => {
      if (q.isFull) {
        const note =
          variant === 'linear' && q.size < cap
            ? ' (free slots exist at the front, but a linear queue cannot reuse them)'
            : '';
        rec.snap('OVERFLOW', `Overflow: cannot add ${x}${note}.`, q.state(), { line: 1, vars: vars() });
        return;
      }
      if (variant === 'priority') {
        // keep slots[0..size-1] sorted ascending; front stays at 0
        let i = q.size - 1;
        while (i >= 0 && (q.slots[i] as number) > x) {
          rec.snap(
            'COMPARE',
            `${q.slots[i]} > ${x}: shift it right.`,
            q.state([{ index: i, role: 'compare' }]),
            { line: 6, vars: vars() },
          );
          q.slots[i + 1] = q.slots[i];
          i--;
        }
        q.slots[i + 1] = x;
        q.size++;
        q.rear = q.size - 1;
        rec.snap(
          'ENQUEUE',
          `Insert ${x} at position ${i + 1} to keep priority order.`,
          q.state([{ index: i + 1, role: 'write' }]),
          { line: 6, vars: vars() },
        );
        return;
      }
      q.rear = variant === 'linear' ? q.rear + 1 : (q.rear + 1) % cap;
      q.slots[q.rear] = x;
      q.size++;
      const wrapped = variant !== 'linear' && q.rear === 0 && q.size > 1;
      rec.snap(
        'ENQUEUE',
        `Enqueue ${x} at index ${q.rear}${wrapped ? ' — rear wrapped around to 0' : ''}.`,
        q.state([{ index: q.rear, role: 'write' }]),
        { line: wrapped ? 3 : 1, vars: vars() },
      );
    };
    const dequeueFront = () => {
      if (q.size === 0) {
        rec.snap('UNDERFLOW', 'Underflow: the queue is empty.', q.state(), { line: 2, vars: vars() });
        return;
      }
      const x = q.slots[q.front];
      rec.snap('PEEK', `Front element is ${x}.`, q.state([{ index: q.front, role: 'error' }]), {
        line: 2,
        vars: vars(),
      });
      if (variant === 'priority') {
        for (let i = 0; i < q.size - 1; i++) q.slots[i] = q.slots[i + 1];
        q.slots[q.size - 1] = null;
        q.size--;
        q.rear = q.size - 1;
      } else {
        q.slots[q.front] = null;
        q.front = variant === 'linear' ? q.front + 1 : (q.front + 1) % cap;
        q.size--;
      }
      rec.snap('DEQUEUE', `Dequeued ${x}${variant === 'priority' ? ' (smallest key)' : ''}.`, q.state(), {
        line: 2,
        vars: { ...vars(), dequeued: x },
      });
    };

    for (const { op, arg } of ops) {
      switch (op) {
        case 'enqueue':
        case 'pushback':
          enqueueBack(arg!);
          break;
        case 'dequeue':
        case 'popfront':
          dequeueFront();
          break;
        case 'pushfront':
          if (q.size === cap)
            rec.snap('OVERFLOW', `Overflow: cannot push ${arg} to the front.`, q.state(), {
              line: 4,
              vars: vars(),
            });
          else {
            if (q.size === 0) {
              q.front = 0;
              q.rear = 0;
            } else q.front = (q.front - 1 + cap) % cap;
            q.slots[q.front] = arg!;
            q.size++;
            rec.snap(
              'ENQUEUE',
              `pushFront ${arg} at index ${q.front}.`,
              q.state([{ index: q.front, role: 'write' }]),
              { line: 4, vars: vars() },
            );
          }
          break;
        case 'popback':
          if (q.size === 0)
            rec.snap('UNDERFLOW', 'Underflow: the deque is empty.', q.state(), { line: 5, vars: vars() });
          else {
            const x = q.slots[q.rear];
            q.slots[q.rear] = null;
            q.rear = (q.rear - 1 + cap) % cap;
            q.size--;
            rec.snap('DEQUEUE', `popBack → ${x}.`, q.state(), { line: 5, vars: { ...vars(), removed: x } });
          }
          break;
        case 'front':
          rec.snap(
            'PEEK',
            q.size ? `front → ${q.slots[q.front]}.` : 'front on empty queue.',
            q.state(q.size ? [{ index: q.front, role: 'found' }] : []),
            { line: 7, vars: vars() },
          );
          break;
        case 'rear':
          rec.snap(
            'PEEK',
            q.size ? `rear → ${q.slots[q.rear]}.` : 'rear on empty queue.',
            q.state(q.size ? [{ index: q.rear, role: 'found' }] : []),
            { line: 7, vars: vars() },
          );
          break;
        case 'isempty':
          rec.snap('PEEK', `isEmpty → ${q.size === 0}.`, q.state(), { line: 7, vars: vars() });
          break;
        case 'isfull':
          rec.snap('PEEK', `isFull → ${q.isFull}.`, q.state(), { line: 7, vars: vars() });
          break;
        case 'size':
          rec.snap('PEEK', `size → ${q.size}.`, q.state(), { line: 7, vars: vars() });
          break;
      }
    }
    return rec.finish(q.toArray(), `Queue (front → rear): [${q.toArray().join(', ')}].`, q.state());
  },
};

export const QUEUE_ALGORITHMS: AlgorithmDef[] = [queueOperations];
