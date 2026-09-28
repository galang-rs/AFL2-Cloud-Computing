import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let viteServer;
let authServiceModule;
let authStoreModule;

before(async () => {
  viteServer = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  authServiceModule = await viteServer.ssrLoadModule('./src/lib/services/auth.service.ts');
  authStoreModule = await viteServer.ssrLoadModule('./src/lib/stores/auth.store.ts');
});

after(async () => {
  if (viteServer) {
    await viteServer.close();
  }
});

describe('Firebase Auth Official Email Verification Tests', () => {
  it('should export email verification methods in authService', () => {
    const { authService } = authServiceModule;
    assert.equal(typeof authService.sendVerificationEmail, 'function');
    assert.equal(typeof authService.checkEmailVerification, 'function');
    assert.equal(typeof authService.createUserWithEmailAndPassword, 'function');
    assert.equal(typeof authService.signInWithEmailAndPassword, 'function');
  });

  it('should export email verification state and actions in authStore', () => {
    const {
      authStore,
      isEmailVerificationPending,
      pendingVerificationEmail,
      resendCooldown,
    } = authStoreModule;

    assert.ok(authStore);
    assert.equal(typeof authStore.signUp, 'function');
    assert.equal(typeof authStore.checkEmailVerificationStatus, 'function');
    assert.equal(typeof authStore.resendVerificationEmail, 'function');
    assert.equal(typeof authStore.cancelVerification, 'function');
    assert.ok(isEmailVerificationPending);
    assert.ok(pendingVerificationEmail);
    assert.ok(resendCooldown);
  });

  it('should handle cancelVerification and reset pending state', async () => {
    const { authStore } = authStoreModule;
    await authStore.cancelVerification();

    let stateValue;
    const unsub = authStore.subscribe((s) => {
      stateValue = s;
    });

    assert.ok(stateValue);
    assert.equal(stateValue.isEmailVerificationPending, false);
    assert.equal(stateValue.pendingVerificationEmail, null);
    unsub();
  });
});
