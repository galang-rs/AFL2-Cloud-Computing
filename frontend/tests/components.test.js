import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

test('Micro-Atomic TDD 5-Point Check: Component Hierarchy & Zero Inline Styles', async (t) => {
  await t.test('1. DOM & Atomic Structure: All required components exist', () => {
    const requiredFiles = [
      // Atoms
      'components/atoms/Button.svelte',
      'components/atoms/Badge.svelte',
      'components/atoms/Input.svelte',
      'components/atoms/Select.svelte',
      'components/atoms/Textarea.svelte',
      'components/atoms/Pin.svelte',
      'components/atoms/index.ts',
      // Molecules
      'components/molecules/DailyHeader.svelte',
      'components/molecules/StickyNoteCard.svelte',
      'components/molecules/SearchFilterBar.svelte',
      'components/molecules/ConfirmationModal.svelte',
      'components/molecules/TodoModal.svelte',
      'components/molecules/index.ts',
      // Organisms
      'components/organisms/Navbar.svelte',
      'components/organisms/KanbanColumn.svelte',
      'components/organisms/KanbanBoard.svelte',
      'components/organisms/index.ts',
      // Templates
      'components/templates/AuthLayout.svelte',
      'components/templates/DashboardLayout.svelte',
      'components/templates/index.ts',
      // Pages
      'pages/LoginPage.svelte',
      'pages/RegisterPage.svelte',
      'pages/DashboardPage.svelte',
      'pages/index.ts',
      // App root
      'App.svelte',
    ];

    for (const relPath of requiredFiles) {
      const fullPath = path.join(SRC_DIR, relPath);
      assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
    }
  });

  await t.test('2. Strict No Inline Styles Mandate: Zero style="..." attributes in Svelte templates', () => {
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (file.endsWith('.svelte')) {
          const content = fs.readFileSync(full, 'utf-8');
          // Check for inline style attribute
          const inlineStyleRegex = /<[a-zA-Z0-9_-]+[^>]*\sstyle\s*=\s*["'{]/g;
          const matches = content.match(inlineStyleRegex);
          assert.equal(
            matches,
            null,
            `File ${path.relative(SRC_DIR, full)} contains forbidden inline styles: ${matches ? matches.join(', ') : ''}`
          );
        }
      }
    }

    scanDir(SRC_DIR);
  });

  await t.test('3. Syntactic Correctness & Proper Exports: All index modules export components', () => {
    const atomIndex = fs.readFileSync(path.join(SRC_DIR, 'components/atoms/index.ts'), 'utf-8');
    assert.match(atomIndex, /export.*Button/);
    assert.match(atomIndex, /export.*Badge/);
    assert.match(atomIndex, /export.*Input/);
    assert.match(atomIndex, /export.*Select/);
    assert.match(atomIndex, /export.*Textarea/);
    assert.match(atomIndex, /export.*Pin/);

    const molIndex = fs.readFileSync(path.join(SRC_DIR, 'components/molecules/index.ts'), 'utf-8');
    assert.match(molIndex, /export.*DailyHeader/);
    assert.match(molIndex, /export.*StickyNoteCard/);
    assert.match(molIndex, /export.*SearchFilterBar/);
    assert.match(molIndex, /export.*ConfirmationModal/);
    assert.match(molIndex, /export.*TodoModal/);

    const orgIndex = fs.readFileSync(path.join(SRC_DIR, 'components/organisms/index.ts'), 'utf-8');
    assert.match(orgIndex, /export.*Navbar/);
    assert.match(orgIndex, /export.*KanbanColumn/);
    assert.match(orgIndex, /export.*KanbanBoard/);

    const tplIndex = fs.readFileSync(path.join(SRC_DIR, 'components/templates/index.ts'), 'utf-8');
    assert.match(tplIndex, /export.*AuthLayout/);
    assert.match(tplIndex, /export.*DashboardLayout/);

    const pageIndex = fs.readFileSync(path.join(SRC_DIR, 'pages/index.ts'), 'utf-8');
    assert.match(pageIndex, /export.*LoginPage/);
    assert.match(pageIndex, /export.*RegisterPage/);
    assert.match(pageIndex, /export.*DashboardPage/);
  });

  await t.test('4. Success Path & 5. Props/Input/Return: Component structures define valid TypeScript interfaces', () => {
    const buttonSvelte = fs.readFileSync(path.join(SRC_DIR, 'components/atoms/Button.svelte'), 'utf-8');
    assert.match(buttonSvelte, /interface Props/);
    assert.match(buttonSvelte, /variant\?:/);
    assert.match(buttonSvelte, /size\?:/);

    const badgeSvelte = fs.readFileSync(path.join(SRC_DIR, 'components/atoms/Badge.svelte'), 'utf-8');
    assert.match(badgeSvelte, /type\?: 'priority' \| 'status' \| 'category' \| 'default'/);

    const pinSvelte = fs.readFileSync(path.join(SRC_DIR, 'components/atoms/Pin.svelte'), 'utf-8');
    assert.match(pinSvelte, /color\?: 'crimson' \| 'gold' \| 'brass' \| 'silver'/);

    const kanbanBoardSvelte = fs.readFileSync(path.join(SRC_DIR, 'components/organisms/KanbanBoard.svelte'), 'utf-8');
    assert.match(kanbanBoardSvelte, /KanbanColumn/);
    assert.match(kanbanBoardSvelte, /todoList/);
    assert.match(kanbanBoardSvelte, /inProgressList/);
    assert.match(kanbanBoardSvelte, /completedList/);
  });
});
