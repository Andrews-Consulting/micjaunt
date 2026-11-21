// R81: the first launch opens a welcome screen on top of Songs: what the
// app is for, how the pieces fit, and the first steps, installing first.
// Get started lands on Songs and the welcome never shows again; the back
// gesture lands there too but leaves it due; a singer with songs never sees it.
import { test, expect } from '@playwright/test';
import {
  openApp, launchApp, expectTab, openScope, scopeBar, addSong,
} from './helpers.js';

const welcome = (page) => page.getByRole('heading', { level: 2, name: 'Welcome to Mic Jaunt' });
const seenAt = (page) => page.evaluate(() => localStorage.getItem('welcomeSeenAt'));

test.describe('Welcome', () => {
  test('R81: a first launch shows the welcome over Songs with the dock hidden, and Get started lands on Songs for good', async ({ page }) => {
    await launchApp(page, { welcome: true });
    await expect(welcome(page)).toBeVisible();
    await expect(page.locator('#view-title')).toHaveText('Welcome');
    await expect(scopeBar(page)).toBeHidden();
    await expect(page.getByRole('searchbox')).toBeHidden();

    // What it says: Help's words (R76), so the two cannot drift apart, with
    // installing as the step before Help's five in a browser tab (R65).
    await expect(page.locator('.welcome-view')).toContainText('Mic Jaunt remembers what you sang where and when');
    await expect(page.locator('.welcome-view h3')).toHaveText(['How it fits together', 'First steps']);
    await expect(page.getByRole('region', { name: 'How it fits together' }).locator('li > strong'))
      .toHaveText(['Songs', 'Lists', 'Tonight\'s set', 'Next time']);
    const steps = page.getByRole('region', { name: 'First steps' }).locator('ol > li');
    await expect(steps).toHaveCount(7);
    await expect(steps.first()).toContainText('Home Screen: put the app there before anything else');
    await expect(steps.first()).toContainText('the KaraFun catalog and your songs would go with it');
    await expect(steps.nth(1)).toContainText('Settings: load the KaraFun catalog');
    const guide = page.getByRole('link', { name: 'Full guide' });
    await expect(guide).toHaveAttribute('href', 'help/');
    await expect(guide).toHaveAttribute('target', '_blank');
    expect(await seenAt(page)).toBeNull();

    // Get started: a tap target (R31) that lands on Songs, dock back, ready to add.
    const start = page.getByRole('button', { name: 'Get started' });
    expect((await start.boundingBox()).height).toBeGreaterThanOrEqual(44);
    await start.click();
    await expect(welcome(page)).toHaveCount(0);
    await expectTab(page, 'Songs');
    await expect(scopeBar(page)).toBeVisible();
    await expect(page.locator('#view-title')).toHaveText('Songs');
    await expect(page.getByText('Add a song', { exact: true })).toBeVisible();
    expect(await seenAt(page)).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Never again, songs or no songs.
    await page.goto('./');
    await expectTab(page, 'Songs'); // a reload keeps the scope
    await expect(page.getByText('Add a song', { exact: true })).toBeVisible();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('R81: the back gesture leaves the welcome for Songs without dismissing it, and Show me how opens Help at the Install card', async ({ page }) => {
    await launchApp(page, { welcome: true });
    await expect(welcome(page)).toBeVisible();

    // Back: Songs, with the dock, but the welcome is still due next time.
    await page.goBack();
    await expect(welcome(page)).toHaveCount(0);
    await expectTab(page, 'Songs');
    await expect(scopeBar(page)).toBeVisible();
    expect(await seenAt(page)).toBeNull();
    await page.goto('./');
    await expect(welcome(page)).toBeVisible();

    // Show me how: Help at its Install card, on top; Back returns through Settings to the welcome.
    await page.getByRole('button', { name: 'Show me how to install' }).click();
    await expect(page.getByRole('heading', { level: 2, name: 'Help' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Put it on your Home Screen' })).toBeInViewport();
    await expectTab(page, 'Settings');
    await page.goBack();
    await expect(page.getByText('Appearance', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(welcome(page)).toBeVisible();
    await expect(scopeBar(page)).toBeHidden();

    // Asking how counts as having read it.
    expect(await seenAt(page)).not.toBeNull();
    await page.goto('./');
    await expectTab(page, 'Songs');
    await expect(page.getByText('Add a song', { exact: true })).toBeVisible();
    await expect(welcome(page)).toHaveCount(0);
  });

  test('R81: a singer with songs never sees the welcome', async ({ page }) => {
    await openApp(page);
    await addSong(page, { title: 'Valerie', artist: 'Amy Winehouse' });

    // As if upgrading: songs in place, the welcome never marked seen. A
    // reload keeps the scope, so back to Tonight first.
    await openScope(page, 'Tonight');
    await page.evaluate(() => localStorage.removeItem('welcomeSeenAt'));
    await page.goto('./');
    await expectTab(page, 'Tonight');
    await expect(page.getByText('Nothing in tonight\'s set yet', { exact: false })).toBeVisible();
    await page.waitForTimeout(500); // the welcome check reads the database after Tonight draws
    await expect(welcome(page)).toHaveCount(0);
    await expect(scopeBar(page)).toBeVisible();
  });
});
