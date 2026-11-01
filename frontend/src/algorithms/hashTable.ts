import { InputError, TraceRecorder } from '@/engine/recorder';
import type { HashEntry, HashState, Role } from '@/engine/types';
import type { AlgorithmDef } from './types';
import { num, str } from './util';

type Strategy = HashState['strategy'];
type Slot = HashEntry[] | HashEntry | null | 'TOMBSTONE';

/** Educational polynomial string hash: h = (h * 31 + charCode) mod capacity. */
export function hashKey(key: string, capacity: number): { index: number; calc: string } {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % capacity;
  return { index: h, calc: `hash("${key}") = (Σ h·31 + code) mod ${capacity} = ${h}` };
}

interface Cmd {
  op: 'put' | 'get' | 'remove' | 'contains';
  key: string;
  value?: number;
}

export function parseHashScript(text: string): Cmd[] {
  const parts = text
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 20) throw new InputError('At most 20 operations.');
  return parts.map((p) => {
    const m = /^(put|get|remove|contains)\s+([A-Za-z0-9]{1,10})(?:\s+(-?\d{1,4}))?$/i.exec(p);
    if (!m)
      throw new InputError(
        `Cannot parse "${p}". Use put <key> <value>, get <key>, remove <key>, contains <key>.`,
      );
    const op = m[1].toLowerCase() as Cmd['op'];
    if (op === 'put' && m[3] === undefined) throw new InputError(`"${p}" needs a value.`);
    if (op !== 'put' && m[3] !== undefined) throw new InputError(`"${op}" takes only a key.`);
    return { op, key: m[2].toLowerCase(), value: m[3] === undefined ? undefined : Number(m[3]) };
  });
}

export class EducationalHashTable {
  buckets: Slot[];
  size = 0;
  collisions = 0;
  constructor(
    readonly strategy: Strategy,
    capacity: number,
    readonly maxLoad: number,
  ) {
    this.buckets = this.empty(capacity);
  }
  private empty(cap: number): Slot[] {
    return Array.from({ length: cap }, () => (this.strategy === 'chaining' ? [] : null));
  }
  get capacity() {
    return this.buckets.length;
  }
  get load() {
    return Math.round((this.size / this.capacity) * 100) / 100;
  }
  state(
    active: number | null,
    key: string | null,
    roles: Record<number, Role> = {},
    calc?: string,
  ): HashState {
    return {
      kind: 'hash',
      strategy: this.strategy,
      buckets: structuredClone(this.buckets),
      activeBucket: active,
      activeKey: key,
      bucketRoles: roles,
      size: this.size,
      collisions: this.collisions,
      loadFactor: this.load,
      hashCalc: calc,
    };
  }
  entries(): HashEntry[] {
    return this.buckets.flatMap((b) => (Array.isArray(b) ? b : b && b !== 'TOMBSTONE' ? [b] : []));
  }
}

export const hashTableOps: AlgorithmDef = {
  id: 'hash-table',
  name: 'Hash table (chaining / linear probing)',
  category: 'hashing',
  visual: 'hash',
  summary:
    'Map keys to buckets with a hash function, resolve collisions, and resize when the load factor gets too high.',
  pseudocode: [
    'i = hash(key) mod capacity',
    'chaining: scan bucket i list for key; append or update',
    'probing: while slot i occupied by another key: i = (i + 1) mod capacity',
    'get: follow the same path until key found or empty slot / end of chain',
    'remove: chaining unlinks; probing leaves a TOMBSTONE so later probes continue',
    'if size / capacity > maxLoad: resize to 2·capacity and rehash every entry',
  ],
  complexity: { time: { best: 'O(1)', average: 'O(1) expected', worst: 'O(n)' }, space: 'O(n)' },
  assumptions: [
    "This is an educational table. Java's HashMap differs: it spreads hashCode bits, uses power-of-two tables, a 0.75 load factor, and converts long chains to red-black trees.",
  ],
  inputs: [
    {
      key: 'strategy',
      label: 'Collision strategy',
      type: 'select',
      options: [
        { value: 'chaining', label: 'Separate chaining' },
        { value: 'linear-probing', label: 'Linear probing' },
      ],
    },
    { key: 'script', label: 'Operations', type: 'text', maxLength: 260 },
    { key: 'capacity', label: 'Initial capacity', type: 'number', min: 2, max: 13 },
  ],
  defaultInput: {
    strategy: 'chaining',
    script:
      'put cat 3, put dog 7, put owl 1, put bat 9, get dog, put cat 5, remove owl, contains owl, put eel 2',
    capacity: 5,
  },
  run(input) {
    const strategy = String(input.strategy) as Strategy;
    if (strategy !== 'chaining' && strategy !== 'linear-probing') throw new InputError('Unknown strategy');
    const cap = num(input, 'capacity', { min: 2, max: 13 });
    const cmds = parseHashScript(str(input, 'script', 260));
    const maxLoad = strategy === 'chaining' ? 1.0 : 0.7;
    const t = new EducationalHashTable(strategy, cap, maxLoad);
    const rec = new TraceRecorder<HashState>('hash-table', { strategy, script: input.script, capacity: cap });
    const vars = () => ({ size: t.size, capacity: t.capacity, loadFactor: t.load, collisions: t.collisions });
    rec.snap('INIT', `Empty table, ${t.capacity} buckets, max load factor ${maxLoad}.`, t.state(null, null), {
      vars: vars(),
    });

    const insertRaw = (key: string, value: number, animate: boolean): void => {
      const { index, calc } = hashKey(key, t.capacity);
      if (animate)
        rec.snap('HASH', calc, t.state(index, key, { [index]: 'active' }, calc), {
          line: 1,
          vars: { key, index },
        });
      if (strategy === 'chaining') {
        const chain = t.buckets[index] as HashEntry[];
        const existing = chain.find((e) => e.key === key);
        if (existing) {
          existing.value = value;
          if (animate)
            rec.snap(
              'UPDATE',
              `Key "${key}" exists — update value to ${value}.`,
              t.state(index, key, { [index]: 'found' }),
              { line: 2, vars: vars() },
            );
          return;
        }
        if (chain.length > 0) {
          t.collisions++;
          if (animate)
            rec.snap(
              'COLLISION',
              `Bucket ${index} already holds ${chain.length} entr${chain.length > 1 ? 'ies' : 'y'} — collision; append to the chain.`,
              t.state(index, key, { [index]: 'error' }),
              { line: 2, vars: vars() },
            );
        }
        chain.push({ key, value });
        t.size++;
        if (animate)
          rec.snap(
            'INSERT',
            `Store ("${key}", ${value}) in bucket ${index}.`,
            t.state(index, key, { [index]: 'write' }),
            { line: 2, vars: vars() },
          );
        return;
      }
      let i = index;
      let firstTomb: number | null = null;
      for (let probes = 0; probes < t.capacity; probes++) {
        const slot = t.buckets[i] as HashEntry | null | 'TOMBSTONE';
        if (slot === null) break;
        if (slot === 'TOMBSTONE') {
          if (firstTomb === null) firstTomb = i;
        } else if (slot.key === key) {
          slot.value = value;
          if (animate)
            rec.snap(
              'UPDATE',
              `Key "${key}" found at slot ${i} — update to ${value}.`,
              t.state(i, key, { [i]: 'found' }),
              { line: 3, vars: vars() },
            );
          return;
        } else {
          t.collisions++;
          if (animate)
            rec.snap(
              'COLLISION',
              `Slot ${i} holds "${slot.key}" — collision.`,
              t.state(i, key, { [i]: 'error' }),
              { line: 3, vars: vars() },
            );
        }
        i = (i + 1) % t.capacity;
        if (animate)
          rec.snap('PROBE', `Probe next slot ${i}.`, t.state(i, key, { [i]: 'compare' }), {
            line: 3,
            vars: { ...vars(), probe: i },
          });
      }
      const target = firstTomb ?? i;
      t.buckets[target] = { key, value };
      t.size++;
      if (animate)
        rec.snap(
          'INSERT',
          `Store ("${key}", ${value}) at slot ${target}.`,
          t.state(target, key, { [target]: 'write' }),
          { line: 3, vars: vars() },
        );
    };

    const find = (key: string): { index: number; found: boolean } => {
      const { index, calc } = hashKey(key, t.capacity);
      rec.snap('HASH', calc, t.state(index, key, { [index]: 'active' }, calc), {
        line: 1,
        vars: { key, index },
      });
      if (strategy === 'chaining') {
        const chain = t.buckets[index] as HashEntry[];
        for (const e of chain) {
          rec.snap(
            'COMPARE',
            `Compare "${e.key}" with "${key}".`,
            t.state(index, key, { [index]: 'compare' }),
            { line: 4 },
          );
          if (e.key === key) return { index, found: true };
        }
        return { index, found: false };
      }
      let i = index;
      for (let probes = 0; probes < t.capacity; probes++) {
        const slot = t.buckets[i] as HashEntry | null | 'TOMBSTONE';
        if (slot === null) return { index: i, found: false };
        if (slot !== 'TOMBSTONE') {
          rec.snap(
            'COMPARE',
            `Slot ${i}: compare "${slot.key}" with "${key}".`,
            t.state(i, key, { [i]: 'compare' }),
            { line: 4 },
          );
          if (slot.key === key) return { index: i, found: true };
        } else
          rec.snap('PROBE', `Slot ${i} is a tombstone — keep probing.`, t.state(i, key, { [i]: 'muted' }), {
            line: 5,
          });
        i = (i + 1) % t.capacity;
      }
      return { index: i, found: false };
    };

    const maybeResize = () => {
      if (t.size / t.capacity <= maxLoad) return;
      const old = t.entries();
      const newCap = Math.min(t.capacity * 2, 32);
      if (newCap === t.capacity) return;
      rec.snap(
        'RESIZE',
        `Load factor ${t.load} exceeds ${maxLoad}: resize ${t.capacity} → ${newCap} and rehash.`,
        t.state(null, null),
        { line: 6, vars: vars() },
      );
      t.buckets = Array.from({ length: newCap }, () => (strategy === 'chaining' ? [] : null));
      t.size = 0;
      for (const e of old) insertRaw(e.key, e.value as number, false);
      rec.snap('RESIZE', `Rehashed ${old.length} entries into ${newCap} buckets.`, t.state(null, null), {
        line: 6,
        vars: vars(),
      });
    };

    for (const c of cmds) {
      if (c.op === 'put') {
        insertRaw(c.key, c.value!, true);
        maybeResize();
      } else {
        const { index, found } = find(c.key);
        if (c.op === 'get' || c.op === 'contains') {
          const entry = found
            ? strategy === 'chaining'
              ? (t.buckets[index] as HashEntry[]).find((e) => e.key === c.key)!
              : (t.buckets[index] as HashEntry)
            : null;
          rec.snap(
            found ? 'FOUND' : 'NOT_FOUND',
            found
              ? `${c.op}("${c.key}") → ${c.op === 'get' ? entry!.value : true}.`
              : `${c.op}("${c.key}") → ${c.op === 'get' ? 'null' : false}.`,
            t.state(index, c.key, { [index]: found ? 'found' : 'muted' }),
            { line: 4, vars: vars() },
          );
        } else if (!found) {
          rec.snap('NOT_FOUND', `remove("${c.key}"): key not present.`, t.state(index, c.key), {
            line: 5,
            vars: vars(),
          });
        } else {
          if (strategy === 'chaining') {
            const chain = t.buckets[index] as HashEntry[];
            chain.splice(
              chain.findIndex((e) => e.key === c.key),
              1,
            );
            rec.snap(
              'DELETE',
              `Unlink "${c.key}" from bucket ${index}.`,
              t.state(index, c.key, { [index]: 'write' }),
              { line: 5, vars: vars() },
            );
          } else {
            t.buckets[index] = 'TOMBSTONE';
            rec.snap(
              'DELETE',
              `Replace "${c.key}" with a tombstone at slot ${index}.`,
              t.state(index, c.key, { [index]: 'write' }),
              { line: 5, vars: vars() },
            );
          }
          t.size--;
        }
      }
    }
    const result: Record<string, number> = {};
    t.entries().forEach((e) => (result[e.key] = e.value as number));
    return rec.finish(
      result,
      `Table holds ${t.size} entr${t.size === 1 ? 'y' : 'ies'}; ${t.collisions} collision(s) observed.`,
      t.state(null, null),
    );
  },
};

export const HASH_ALGORITHMS: AlgorithmDef[] = [hashTableOps];
