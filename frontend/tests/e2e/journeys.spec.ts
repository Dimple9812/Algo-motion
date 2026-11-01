import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end journeys. Journeys 1–10 need only the frontend.
 * Journeys 11–15 need the backend behind /api (gateway on :8080); they are skipped with a clear reason when it is down.
 */

async function backendUp(page: Page): Promise<boolean> {
  const r = await page.request.get('/api/v1/status').catch(() => null);
  if (!r || !r.ok()) return false;
  const body = await r.json();
  return body.status === 'UP';
}

async function stepUntil(page: Page, text: RegExp, max = 60) {
  for (let i = 0; i < max; i++) {
    if (text.test((await page.getByTestId('step-explanation').first().textContent()) ?? '')) return;
    await page.getByRole('button', { name: 'Next step' }).first().click();
  }
  throw new Error(`never reached ${text}`);
}

async function toEnd(page: Page) {
  await page.getByRole('slider', { name: 'Timeline' }).first().focus();
  await page.keyboard.press('End');
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('1. array insertion shifts elements and lands the value', async ({ page }) => {
  await page.goto('/visualizer/arrays?algo=array-insert');
  await expect(page.getByRole('heading', { name: 'Insert at index' })).toBeVisible();
  await page.getByRole('slider', { name: 'Timeline' }).focus();
  await page.keyboard.press('End');
  await expect(page.getByTestId('step-explanation')).toContainText('Inserted. 3 element(s) were shifted.');
  await expect(page.getByLabel('index 1 value 15, found')).toBeVisible();
});

test('2. binary search step by step shows low/mid/high and finds the target', async ({ page }) => {
  await page.goto('/visualizer/searching?algo=binary-search');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('step-explanation')).toContainText('mid =');
  await expect(page.getByLabel('pointers').getByText('mid')).toBeVisible();
  await stepUntil(page, /equals the target/);
  await page.getByRole('button', { name: 'Previous step' }).click();
  await expect(page.getByTestId('step-explanation')).toContainText('Compare a[');
});

test('3. sorting runs and algorithms can be compared on the same input', async ({ page }) => {
  await page.goto('/visualizer/sorting?algo=bubble-sort');
  await toEnd(page);
  await expect(page.getByTestId('step-explanation')).toContainText('Bubble sort complete.');
  await page.getByRole('button', { name: /Compare sorts/ }).click();
  await expect(page.getByRole('heading', { name: /Sorting Speedway/ })).toBeVisible();
  await page.getByRole('button', { name: /Start race/ }).click();
  await expect(page.getByText(/✓ finished/).first()).toBeVisible({ timeout: 45_000 });
});

test('4. linked list insertion and deletion', async ({ page }) => {
  await page.goto('/visualizer/linked-lists?algo=ll-insert-at');
  await toEnd(page);
  await expect(page.getByTestId('step-explanation')).toContainText('Inserted 8 at index 2');
  await page.getByRole('button', { name: 'Delete at index' }).click();
  await expect(page.getByRole('heading', { name: 'Delete at index' })).toBeVisible();
  await expect(page.getByTestId('step-explanation')).toContainText('Start with 4 node(s).');
  await toEnd(page);
  await expect(page.getByTestId('step-explanation')).toContainText('Deleted 9 at index 2');
});

test('5. tree traversal', async ({ page }) => {
  await page.goto('/visualizer/trees?algo=tree-inorder');
  await toEnd(page);
  await expect(page.getByTestId('step-explanation')).toContainText('Inorder traversal: 4 2 5 1 3 6');
});

test('6. graph BFS', async ({ page }) => {
  await page.goto('/visualizer/graphs?algo=graph-bfs');
  await expect(page.getByRole('img', { name: /Undirected graph with 8 vertices/ })).toBeVisible();
  await toEnd(page);
  await expect(page.getByTestId('step-explanation')).toContainText('BFS order: A → B → C → D → E → F');
  await expect(page.getByTestId('step-explanation')).toContainText('Unreachable: G, H');
});

test('7. complete a mini-challenge using answers derived from the trace', async ({ page }) => {
  await page.goto('/learn/challenges/stack-blocks');
  await expect(page.getByTestId('challenge-prompt')).toContainText('What is the stack');
  // try each option until correct (validation is deterministic)
  const options = page.getByRole('group', { name: 'Answer options' }).getByRole('button');
  await options.first().click();
  const fb = page.getByTestId('challenge-feedback');
  await expect(fb).toBeVisible();
  if (!/Correct!/.test((await fb.textContent()) ?? '')) {
    await page.getByRole('button', { name: 'Retry this one' }).click();
    const n = await options.count();
    for (let i = 1; i < n; i++) {
      await options.nth(i).click();
      if (/Correct!/.test((await fb.textContent()) ?? '')) break;
      await page.getByRole('button', { name: 'Retry this one' }).click();
    }
  }
  await expect(fb).toContainText('Correct!');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('challenge-finished')).toContainText('1 / 1 correct');
});

test('8. switch between playful and technical modes', async ({ page }) => {
  await page.goto('/visualizer/searching?algo=linear-search');
  await expect(page.locator('[data-character]').first()).toBeVisible();
  await page.getByTestId('mode-toggle').first().click();
  await expect(page.getByTestId('mode-toggle').first()).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('player').locator('[data-character]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('mode-toggle').first()).toHaveAttribute('aria-checked', 'true');
});

test('9. open easy, medium and hard problems', async ({ page }) => {
  for (const d of ['Easy', 'Medium', 'Hard']) {
    await page.goto('/problems');
    await page.getByRole('group', { name: 'Difficulty' }).getByRole('button', { name: d }).click();
    await expect(page).toHaveURL(new RegExp(`difficulty=${d.toUpperCase()}`));
    const rows = page.getByRole('list', { name: 'Problems' }).getByRole('listitem');
    await expect(rows.first()).toContainText(d.toLowerCase());
    await rows.first().getByRole('link').click();
    await expect(page.locator('header').getByText(d.toLowerCase(), { exact: true })).toBeVisible();
  }
});

test('10. compare brute-force and optimized solutions and their visualizations', async ({ page }) => {
  await page.goto('/problems/binary-search');
  await page.getByRole('tab', { name: 'Brute force' }).click();
  await expect(page.getByRole('heading', { name: 'Linear scan' })).toBeVisible();
  await page.getByRole('tab', { name: 'Optimized' }).click();
  await expect(page.getByRole('heading', { name: 'Binary search', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Visualization' }).click();
  await page.getByRole('button', { name: 'Brute force' }).click();
  await expect(page.getByTestId('mini-player')).toHaveAttribute('aria-label', /Linear search/);
  await page.getByRole('button', { name: 'Optimized' }).click();
  await expect(page.getByTestId('mini-player')).toHaveAttribute('aria-label', /Binary search/);
});

test.describe('with backend', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!(await backendUp(page)), 'Backend gateway not reachable on /api — start the stack to run journeys 11–15');
  });

  test('11. submit a supported question to the AI solver', async ({ page }) => {
    await page.goto('/solve');
    await page.getByLabel('1. Problem statement').fill('You are climbing a staircase. Each time you can climb 1 or 2 steps. In how many distinct ways can you reach the top?');
    await page.getByRole('button', { name: '2. Generate solutions' }).click();
    await expect(page).toHaveURL(/\/solve\/[0-9a-f-]{36}/);
    await expect(page.getByText('Tests passed').first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('mini-player').first()).toBeVisible();
  });

  test('12. upload a problem file and review the extracted text', async ({ page }) => {
    await page.goto('/solve');
    await page.getByLabel('Upload a problem file').setInputFiles({ name: 'q.txt', mimeType: 'text/plain', buffer: Buffer.from('Reverse a singly linked list and print the values from the new head.') });
    await expect(page.getByLabel('1. Problem statement')).toHaveValue(/Reverse a singly linked list/);
    await expect(page.getByRole('status').filter({ hasText: 'Extracted via' })).toBeVisible();
  });

  test('13. run Java code against test cases', async ({ page }) => {
    await page.goto('/problems/two-sum');
    await page.getByRole('button', { name: 'Load reference solution' }).click();
    await page.getByRole('button', { name: /Run tests/ }).click();
    await expect(page.getByTestId('execution-results')).toContainText('5 / 5 tests passed', { timeout: 60_000 });
  });

  test('14 & 15. save and reopen a session; another user cannot read it', async ({ page, browser }) => {
    const email = `e2e${Date.now()}@example.com`;
    await page.goto('/register');
    await page.getByLabel('Display name').fill('E2E Tester');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: /Hi, E2E Tester/ })).toBeVisible();
    await page.goto('/visualizer/sorting?algo=merge-sort');
    await page.getByRole('button', { name: /Save session/ }).click();
    await expect(page.getByText('Saved to your history')).toBeVisible();
    await page.goto('/history');
    const link = page.getByTestId('history-list').getByRole('link').first();
    await expect(link).toContainText('Merge sort');
    await link.click();
    await expect(page.getByRole('heading', { name: 'Merge sort' })).toBeVisible();

    // reopen after reload: session restored from the httpOnly refresh cookie
    await page.reload();
    await page.goto('/history');
    await expect(page.getByTestId('history-list')).toBeVisible();

    // another user (fresh browser context) sees none of it, and cannot fetch it by id
    const api = page.request;
    const token = await page.evaluate(async () => ((await (await fetch('/api/v1/auth/refresh', { method: 'POST' })).json()) as { accessToken: string }).accessToken);
    const sessions = (await (await api.get('/api/v1/users/me/history', { headers: { Authorization: `Bearer ${token}` } })).json()) as { id: string }[];
    const other = await browser.newContext();
    const reg = await other.request.post('/api/v1/auth/register', { data: { email: `other${Date.now()}@example.com`, password: 'secret123', displayName: 'Other' } });
    const otherToken = (await reg.json()).accessToken;
    const res = await other.request.get(`/api/v1/users/me/sessions/${sessions[0].id}`, { headers: { Authorization: `Bearer ${otherToken}` } });
    expect(res.status()).toBe(404);
    const theirs = await (await other.request.get('/api/v1/users/me/history', { headers: { Authorization: `Bearer ${otherToken}` } })).json();
    expect(theirs).toHaveLength(0);
    await other.close();
  });
});
