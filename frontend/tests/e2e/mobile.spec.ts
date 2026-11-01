import { expect, test } from '@playwright/test';

test('mobile navigation menu and visualizer controls work on a small screen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('navigation', { name: 'Mobile' }).getByRole('link', { name: 'AlgoVerse' }).click();
  await expect(page.getByRole('heading', { name: 'The AlgoVerse' })).toBeVisible();
  await page.getByTestId('world-stacks').click();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('step-explanation')).toContainText('push 5');
});
