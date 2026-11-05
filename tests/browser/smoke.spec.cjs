const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const mockSdk = readFileSync(join(__dirname, 'mock-supabase.js'), 'utf8');
const fakeConfig = 'window.ALAMERI_SUPABASE={url:"https://mock-project.supabase.co",anonKey:"'+('x'.repeat(55))+'"};';

test.beforeEach(async ({page}) => {
  // Route every browser request: nothing can reach the real Supabase or any remote service.
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/studio/config.js') {
      return route.fulfill({status:200,contentType:'application/javascript',body:fakeConfig});
    }
    if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@supabase/supabase-js@')) {
      return route.fulfill({status:200,contentType:'application/javascript',body:mockSdk});
    }
    if (url.hostname === '127.0.0.1' && url.port === '4173') return route.continue();
    if (url.hostname === 'fonts.googleapis.com') {
      return route.fulfill({status:200,contentType:'text/css',body:''});
    }
    if (url.hostname === 'fonts.gstatic.com') {
      return route.fulfill({status:200,contentType:'font/woff2',body:''});
    }
    return route.abort('blockedbyclient');
  });
});

test('guest: homepage and original poems are readable, without publishing', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('a[href*="studio/"]').first()).toBeVisible();
  const catalog=await page.evaluate(async()=>{
    const r=await fetch('/poems.json');
    return r.json();
  });
  expect(catalog.poems).toHaveLength(10);
  await page.goto('/poems/AM-015.html');
  await expect(page.locator('body')).toContainText('في وجهه خبري');
});

test('guest: menu, back and forward navigate between sections', async ({page}) => {
  await page.goto('/studio/?mock=guest#library');
  await expect(page.locator('#library')).toBeVisible();
  await page.locator('.side-nav [data-jump="editor"]').click();
  await expect(page.locator('#editor')).toBeVisible();
  await expect(page.locator('#nav-back')).toBeEnabled();
  await page.locator('#nav-back').click();
  await expect(page.locator('#library')).toBeVisible();
  await page.locator('#nav-forward').click();
  await expect(page.locator('#editor')).toBeVisible();
});

test('guest: local draft save, restore and preview survive reload', async ({page}) => {
  await page.goto('/studio/?mock=guest#editor');
  await expect(page.locator('.cloud-drafts-panel #cloud-save')).toBeVisible();
  await page.locator('#draft-title').fill('تجربة حفظ النص');
  await page.locator('#draft-body').fill('سطر تجريبي أول\nسطر تجريبي ثان دون نشر');
  await expect(page.locator('#preview-title')).toHaveText('تجربة حفظ النص');
  await page.locator('#save-draft').click();
  await page.reload();
  await page.locator('#restore-draft').click();
  await expect(page.locator('#draft-title')).toHaveValue('تجربة حفظ النص');
  await expect(page.locator('#draft-body')).toHaveValue('سطر تجريبي أول\nسطر تجريبي ثان دون نشر');
  const writes=await page.evaluate(()=>window.__sandbox.writes);
  expect(writes).toEqual([]);
});

test('guest: protected admin and bookmarks routes redirect to account', async ({page}) => {
  await page.goto('/studio/?mock=guest#library');
  await page.evaluate(()=>window.ALAMERI_STUDIO.jump('literary-review'));
  await expect(page.locator('#account')).toBeVisible();
  await expect(page.locator('#literary-review')).toBeHidden();
  await page.evaluate(()=>window.ALAMERI_STUDIO.jump('saved'));
  await expect(page.locator('#account')).toBeVisible();
  await expect(page.locator('#saved')).toBeHidden();
});

test('guest: password field has functional show/hide control', async ({page}) => {
  await page.goto('/studio/?mock=guest#account');
  const password=page.locator('#login-password');
  await expect(password).toHaveAttribute('type','password');
  await page.locator('[data-password-target="login-password"]').click();
  await expect(password).toHaveAttribute('type','text');
  await page.locator('[data-password-target="login-password"]').click();
  await expect(password).toHaveAttribute('type','password');
});

test('member: saving a cloud draft does not publish or approve it', async ({page}) => {
  await page.goto('/studio/?mock=member#editor');
  await expect(page.locator('#member-badge')).toContainText('عضو');
  await page.locator('#draft-title').fill('مسودة تجريبية خاصة');
  await page.locator('#draft-body').fill('قصيدة اختبارية خاصة لا تنشر ولا تعتمد');
  await page.locator('#cloud-save').click();
  await expect(page.locator('#cloud-status')).toContainText('1 مسودة');
  const snapshot=await page.evaluate(()=>({
    draftRows:window.__sandbox.db.literary_drafts.length,
    published:window.__sandbox.db.posts.length,
    poems:window.__sandbox.db.diwan_poems.length,
    writes:window.__sandbox.writes
  }));
  expect(snapshot.draftRows).toBe(1);
  expect(snapshot.published).toBe(0);
  expect(snapshot.poems).toBe(0);
  expect(snapshot.writes.every(x=>x.table==='literary_drafts')).toBeTruthy();
});

test('member: selecting another cloud draft must not overwrite without opening it', async ({page}) => {
  await page.goto('/studio/?mock=member#editor');
  await page.locator('#draft-title').fill('مسودة أولى');
  await page.locator('#draft-body').fill('محتوى أول محفوظ على السحابة دون نشر');
  await page.locator('#cloud-save').click();
  await expect(page.locator('#cloud-status')).toContainText('1 مسودة');
  const originalId=await page.evaluate(()=>window.__sandbox.db.literary_drafts[0].id);
  await page.locator('#cloud-new').click();
  await page.locator('#draft-title').fill('مسودة ثانية');
  await page.locator('#draft-body').fill('محتوى ثان لا يجب أن يستبدل المسودة الأولى');
  await page.locator('#cloud-drafts-select').selectOption(originalId);
  await page.locator('#cloud-save').click();
  await expect(page.locator('#toast')).toContainText('افتح المسودة المحددة');
  const after=await page.evaluate(()=>window.__sandbox.db.literary_drafts.map(d=>({title:d.title,body:d.body})));
  expect(after).toEqual([{title:'مسودة أولى',body:'محتوى أول محفوظ على السحابة دون نشر'}]);
});

test('member: invalid WhatsApp is rejected before any profile update', async ({page}) => {
  await page.goto('/studio/?mock=member#account');
  await expect(page.locator('#profile-name')).toHaveValue('عضو الاختبار');
  await page.locator('#profile-whatsapp').fill('not-a-phone');
  await page.locator('#profile-form').evaluate(form=>form.requestSubmit());
  await expect(page.locator('#toast')).toContainText('الصيغة دولية صحيحة');
  const writes=await page.evaluate(()=>window.__sandbox.writes);
  expect(writes.filter(x=>x.table==='profiles')).toHaveLength(0);
});

test('member: logging out clears private profile and navigation', async ({page}) => {
  await page.goto('/studio/?mock=member#account');
  await expect(page.locator('#profile-whatsapp')).toHaveValue('+967700000001');
  await page.locator('#logout').click();
  await expect(page.locator('#profile-whatsapp')).toHaveValue('');
  await expect(page.locator('#profile-name')).toHaveValue('');
  await expect(page.locator('#member-badge')).toHaveText('زائر');
  await expect(page.locator('[data-guest-nav]').first()).toBeVisible();
  await expect(page.locator('#literary-review-nav')).toBeHidden();
});

test('reviewer: cannot open final approval panel', async ({page}) => {
  await page.goto('/studio/?mock=reviewer#library');
  await expect(page.locator('#member-badge')).toContainText('لجنة المراجعة');
  await expect(page.locator('#review-nav')).toBeVisible();
  await expect(page.locator('#literary-review-nav')).toBeHidden();
  await page.evaluate(()=>window.ALAMERI_STUDIO.jump('literary-review'));
  await expect(page.locator('#account')).toBeVisible();
});

test('admin: review panel opens but no decision is made without a deliberate click', async ({page}) => {
  await page.goto('/studio/?mock=admin#library');
  await expect(page.locator('#literary-review-nav')).toBeVisible();
  await page.evaluate(()=>window.ALAMERI_STUDIO.jump('literary-review'));
  await expect(page.locator('#literary-review')).toBeVisible();
  await expect(page.locator('#literary-review-list')).toContainText('لا توجد أعمال');
  const actions=await page.evaluate(()=>window.__sandbox.rpcCalls);
  expect(actions).toHaveLength(0);
});

test('mobile: menu opens and closes after navigating to editor', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/studio/?mock=guest#library');
  await page.locator('#side-menu-toggle').click();
  await expect(page.locator('#side-menu-toggle')).toHaveAttribute('aria-expanded','true');
  await page.locator('.side-nav [data-jump="editor"]').click();
  await expect(page.locator('#editor')).toBeVisible();
  await expect(page.locator('#side-menu-toggle')).toHaveAttribute('aria-expanded','false');
});
