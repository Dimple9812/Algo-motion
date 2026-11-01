import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { binarySearch, linearSearch } from '@/algorithms/searching';
import { createPlayerStore } from '@/engine/player';
import { Mascot } from './mascot/Mascot';
import { reactionForEvent, reactionForStep } from './mascot/reactions';
import { Player } from './player/Player';
import { InputForm } from './player/InputForm';
import { ModeToggle } from '@/app/Layout';
import { usePrefs } from '@/store/prefs';
import { BADGES, earnedBadges, totalXp, useProgress } from '@/store/progress';
import { Renderer } from './viz/Renderer';

beforeEach(() => {
  usePrefs.setState({ mode: 'playful', gamification: true, motion: 'reduce' });
  useProgress.setState({ events: [] });
});

describe('Player', () => {
  it('renders explanation, steps with buttons and keyboard, and highlights pseudocode', async () => {
    const store = createPlayerStore();
    act(() => store.getState().load(binarySearch.run({ values: [1, 3, 5, 7], target: 7 })));
    render(<Player store={store} algo={binarySearch} character="byte" />);
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Search for 7');
    expect(screen.getByText('step 1 / ' + store.getState().trace!.steps.length)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('mid =');
    const current = screen.getByRole('list', { name: 'Pseudocode' }).querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent('mid = low + (high - low) / 2');
    fireEvent.keyDown(screen.getByTestId('player'), { key: 'ArrowRight' });
    expect(screen.getByTestId('step-explanation')).toHaveTextContent('Compare a[1]');
    fireEvent.keyDown(screen.getByTestId('player'), { key: 'Home' });
    expect(store.getState().index).toBe(0);
    fireEvent.change(screen.getByRole('slider', { name: 'Timeline' }), { target: { value: '3' } });
    expect(store.getState().index).toBe(3);
  });

  it('play button toggles to pause and speed buttons are pressed-state toggles', async () => {
    const store = createPlayerStore();
    act(() => store.getState().load(linearSearch.run({ values: [1, 2, 3], target: 3 })));
    render(<Player store={store} algo={linearSearch} character="byte" />);
    await userEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(screen.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(store.getState().playing).toBe(false);
  });

  it('shows the mascot only in playful mode; technical mode shows operation labels', () => {
    const store = createPlayerStore();
    act(() => store.getState().load(linearSearch.run({ values: [1], target: 1 })));
    const { rerender, container } = render(<Player store={store} algo={linearSearch} character="byte" />);
    expect(container.querySelector('[data-character="byte"]')).not.toBeNull();
    act(() => usePrefs.setState({ mode: 'technical' }));
    rerender(<Player store={store} algo={linearSearch} character="byte" />);
    expect(container.querySelector('[data-character="byte"]')).toBeNull();
    expect(screen.getAllByText('INIT').length).toBeGreaterThan(0);
  });
});

describe('InputForm', () => {
  it('parses numbers and reports invalid input without crashing', async () => {
    let submitted: unknown = null;
    render(
      <InputForm
        algo={linearSearch}
        value={linearSearch.defaultInput}
        onSubmit={(v) => (submitted = v)}
        error="Values must be whole numbers"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Array' });
    await userEvent.clear(input);
    await userEvent.type(input, '3, 9, x');
    await userEvent.click(screen.getByRole('button', { name: 'Run with this input' }));
    expect((submitted as { values: number[] }).values.slice(0, 2)).toEqual([3, 9]);
    expect(Number.isNaN((submitted as { values: number[] }).values[2])).toBe(true);
    expect(screen.getByTestId('input-error')).toHaveTextContent('whole numbers');
    expect(() => linearSearch.run(submitted as never)).toThrow();
  });
});

describe('mascot reactions', () => {
  it('are derived from trace operations, and still during fast playback / reduced motion', () => {
    const t = linearSearch.run({ values: [5, 7], target: 7 });
    expect(reactionForStep(t.steps.find((s) => s.operation === 'COMPARE')).event).toBe('COMPARE_ELEMENTS');
    expect(reactionForStep(t.steps.find((s) => s.operation === 'FOUND')).event).toBe('VALUE_FOUND');
    expect(reactionForStep(t.steps.at(-1)).event).toBe('ALGORITHM_COMPLETED');
    expect(reactionForStep(t.steps[1], { fast: true }).animation).toBe('none');
    expect(reactionForEvent('TESTS_PASSED').mood).toBe('excited');
    expect(reactionForEvent('TESTS_FAILED').animation).toBe('hint');
  });

  it('mascot exposes an accessible label', () => {
    render(<Mascot character="node" mood="happy" />);
    expect(screen.getByRole('img', { name: /Node the builder looks happy/ })).toBeInTheDocument();
  });
});

describe('mode toggle', () => {
  it('is a switch that persists the preference', async () => {
    render(
      <MemoryRouter>
        <ModeToggle />
      </MemoryRouter>,
    );
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(usePrefs.getState().mode).toBe('technical');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });
});

describe('renderer accessibility', () => {
  it('labels cells with value and role so state is not colour-only', () => {
    const t = linearSearch.run({ values: [4, 8], target: 8 });
    render(<Renderer state={t.steps.find((s) => s.operation === 'FOUND')!.state} playful={false} />);
    expect(screen.getByLabelText('index 1 value 8, found')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Legend')).getByText('found')).toBeInTheDocument();
  });
});

describe('progress', () => {
  it('awards XP once per key (no farming) and unlocks badges at thresholds', () => {
    const { award } = useProgress.getState();
    expect(award('challenge:find-number', 'challenge', 'searching')).not.toBeNull();
    expect(award('challenge:find-number', 'challenge', 'searching')).toBeNull();
    award('viz:binary-search', 'visualization', 'searching');
    const events = useProgress.getState().events;
    expect(totalXp(events)).toBe(30);
    expect(earnedBadges(events).map((b) => b.id)).toEqual(['array-explorer']);
    expect(BADGES).toHaveLength(9);
  });
});
