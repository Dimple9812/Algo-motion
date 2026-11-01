import type { Highlight, Role, VisualState } from '@/engine/types';
import type { CharacterId } from '../mascot/Mascot';
import { ArrayView } from './ArrayView';
import { GraphView } from './GraphView';
import { GridView, RecursionView } from './GridRecursionView';
import { LinkedListView } from './LinkedListView';
import { RoleLegend } from './roles';
import { HashView, QueueView, StackView } from './StackQueueHashView';
import { TreeView } from './TreeView';

export interface RendererProps {
  state: VisualState;
  playful: boolean;
  character?: CharacterId;
  /** disable motion (reduced-motion preference or fast playback) */
  still?: boolean;
}

function rolesIn(state: VisualState): Role[] {
  const hl = (h?: Highlight[]) => (h ?? []).map((x) => x.role);
  switch (state.kind) {
    case 'array':
      return [...hl(state.highlights), ...(state.aux ?? []).flatMap((a) => hl(a.highlights))];
    case 'linkedList':
    case 'tree':
      return [...Object.values(state.nodeRoles), ...(state.kind === 'tree' ? hl(state.arrayHighlights) : [])];
    case 'graph':
      return [...Object.values(state.nodeRoles), ...Object.values(state.edgeRoles)];
    case 'grid':
      return state.highlights.map((h) => h.role);
    case 'stack':
    case 'queue':
      return hl(state.highlights);
    case 'hash':
      return Object.values(state.bucketRoles);
    default:
      return [];
  }
}

export function Renderer({ state, playful, character, still }: RendererProps) {
  let body;
  switch (state.kind) {
    case 'array':
      body = <ArrayView state={state} playful={playful} character={character} still={still} />;
      break;
    case 'linkedList':
      body = <LinkedListView state={state} playful={playful} still={still} />;
      break;
    case 'stack':
      body = <StackView state={state} playful={playful} still={still} />;
      break;
    case 'queue':
      body = <QueueView state={state} playful={playful} />;
      break;
    case 'hash':
      body = <HashView state={state} playful={playful} />;
      break;
    case 'tree':
      body = <TreeView state={state} playful={playful} still={still} />;
      break;
    case 'graph':
      body = <GraphView state={state} playful={playful} still={still} />;
      break;
    case 'grid':
      body = <GridView state={state} playful={playful} />;
      break;
    case 'recursion':
      body = <RecursionView state={state} playful={playful} />;
      break;
  }
  return (
    <div className="flex flex-col gap-2" data-testid="renderer" data-kind={state.kind}>
      {body}
      <RoleLegend roles={rolesIn(state)} />
    </div>
  );
}
