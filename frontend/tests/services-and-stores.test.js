import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let viteServer;
let clientModule;
let authServiceModule;
let apiServiceModule;
let authStoreModule;
let todoStoreModule;

before(async () => {
  viteServer = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  clientModule = await viteServer.ssrLoadModule('./src/lib/firebase/client.ts');
  authServiceModule = await viteServer.ssrLoadModule('./src/lib/services/auth.service.ts');
  apiServiceModule = await viteServer.ssrLoadModule('./src/lib/services/api.service.ts');
  authStoreModule = await viteServer.ssrLoadModule('./src/lib/stores/auth.store.ts');
  todoStoreModule = await viteServer.ssrLoadModule('./src/lib/stores/todo.store.ts');
});

after(async () => {
  if (viteServer) {
    await viteServer.close();
  }
});

describe('1. Firebase Client Configuration & SDK Module', () => {
  it('should initialize Firebase App with afl2-7e2a5 project config', () => {
    const { firebaseConfig, app } = clientModule;
    assert.ok(firebaseConfig, 'firebaseConfig must be defined');
    assert.equal(firebaseConfig.projectId, 'afl2-7e2a5');
    assert.equal(firebaseConfig.authDomain, 'afl2-7e2a5.firebaseapp.com');
    assert.equal(
      firebaseConfig.databaseURL,
      'https://afl2-7e2a5-default-rtdb.asia-southeast1.firebasedatabase.app'
    );
    assert.equal(firebaseConfig.storageBucket, 'afl2-7e2a5.firebasestorage.app');
    assert.equal(firebaseConfig.appId, '1:644541676544:web:0c2f5e12fc9eb744536ce5');
    assert.ok(app, 'Firebase app instance should be initialized');
  });

  it('should export getAuth and getDatabase functions and singleton instances', () => {
    const { auth, database, getAuth, getDatabase, app } = clientModule;
    assert.ok(auth, 'auth instance must be exported');
    assert.ok(database, 'database instance must be exported');
    assert.equal(typeof getAuth, 'function');
    assert.equal(typeof getDatabase, 'function');
    assert.equal(getAuth(app), auth);
    assert.equal(getDatabase(app), database);
  });

  it('should export emulator connection helper and RTDB listeners', () => {
    const { setupEmulators, listenToUserTodos, stopListeningToUserTodos } = clientModule;
    assert.equal(typeof setupEmulators, 'function');
    assert.equal(typeof listenToUserTodos, 'function');
    assert.equal(typeof stopListeningToUserTodos, 'function');
  });
});

describe('2. AuthService Class & Methods', () => {
  it('should provide complete authentication API methods', () => {
    const { AuthService, authService } = authServiceModule;
    assert.ok(AuthService, 'AuthService class must be exported');
    assert.ok(authService, 'authService singleton instance must be exported');
    assert.equal(typeof authService.signInWithEmailAndPassword, 'function');
    assert.equal(typeof authService.createUserWithEmailAndPassword, 'function');
    assert.equal(typeof authService.signOut, 'function');
    assert.equal(typeof authService.onAuthStateChanged, 'function');
    assert.equal(typeof authService.getIdToken, 'function');
    assert.equal(typeof authService.devDemoSignIn, 'function');
  });

  it('should handle devDemoSignIn for seamless offline/presentation testing', async () => {
    const { authService } = authServiceModule;
    const result = await authService.devDemoSignIn('test.student@ciputra.ac.id', 'Test Student');

    assert.ok(result.user);
    assert.equal(result.user.email, 'test.student@ciputra.ac.id');
    assert.equal(result.user.displayName, 'Test Student');
    assert.ok(result.token, 'Demo token must be generated');

    const activeToken = await authService.getIdToken();
    assert.ok(activeToken, 'getIdToken should return active token');

    const currentUser = authService.getCurrentUser();
    assert.ok(currentUser);
    assert.equal(currentUser.email, 'test.student@ciputra.ac.id');
  });

  it('should notify subscribers on onAuthStateChanged and handle signOut', async () => {
    const { authService } = authServiceModule;
    let notifiedUser = undefined;

    const unsubscribe = authService.onAuthStateChanged((user) => {
      notifiedUser = user;
    });

    await authService.devDemoSignIn('subscriber@test.com', 'Subscriber');
    assert.ok(notifiedUser);
    assert.equal(notifiedUser.email, 'subscriber@test.com');

    await authService.signOut();
    assert.equal(notifiedUser, null);
    unsubscribe();
  });
});

describe('3. ApiService Class & Backend CRUD Integration', () => {
  it('should provide CRUD methods for Cloud Functions Express backend', () => {
    const { ApiService, apiService } = apiServiceModule;
    assert.ok(ApiService, 'ApiService class must be exported');
    assert.ok(apiService, 'apiService singleton must be exported');
    assert.equal(typeof apiService.getTodos, 'function');
    assert.equal(typeof apiService.getTodoById, 'function');
    assert.equal(typeof apiService.createTodo, 'function');
    assert.equal(typeof apiService.updateTodo, 'function');
    assert.equal(typeof apiService.deleteTodo, 'function');
  });

  it('should perform createTodo with normalized fields', async () => {
    const { apiService } = apiServiceModule;
    const res = await apiService.createTodo({
      title: 'TDD Test Task',
      description: 'Testing 5-point contract',
      priority: 'high',
      category: 'academic',
      color: 'amber',
    });

    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.equal(res.data.title, 'TDD Test Task');
    assert.equal(res.data.priority, 'high');
    assert.equal(res.data.completed, false);
    assert.ok(res.data.id);
  });

  it('should retrieve todos via getTodos and getTodoById', async () => {
    const { apiService } = apiServiceModule;
    const listRes = await apiService.getTodos();

    assert.equal(listRes.success, true);
    assert.ok(Array.isArray(listRes.data));
    assert.ok(listRes.data.length > 0);

    const firstId = listRes.data[0].id;
    const itemRes = await apiService.getTodoById(firstId);
    assert.equal(itemRes.success, true);
    assert.ok(itemRes.data);
    assert.equal(itemRes.data.id, firstId);
  });

  it('should update and delete todos', async () => {
    const { apiService } = apiServiceModule;
    const createRes = await apiService.createTodo({
      title: 'Task to be updated and deleted',
      completed: false,
    });
    assert.ok(createRes.data);
    const todoId = createRes.data.id;

    // Update
    const updateRes = await apiService.updateTodo(todoId, {
      title: 'Task is now updated',
      completed: true,
    });
    assert.equal(updateRes.success, true);
    assert.equal(updateRes.data.completed, true);
    assert.equal(updateRes.data.title, 'Task is now updated');

    // Delete
    const deleteRes = await apiService.deleteTodo(todoId);
    assert.equal(deleteRes.success, true);
  });
});

describe('4. Auth Svelte Store', () => {
  it('should expose reactive auth state and actions', async () => {
    const { authStore } = authStoreModule;
    let state;
    const unsubscribe = authStore.subscribe((val) => {
      state = val;
    });

    assert.ok(state, 'Auth state must be initialized');
    assert.equal(typeof state.isLoading, 'boolean');
    assert.equal(typeof state.isAuthenticated, 'boolean');

    // Sign in demo user
    const success = await authStore.signInDemo('store.user@ciputra.ac.id', 'Store User');
    assert.equal(success, true);
    assert.equal(state.isAuthenticated, true);
    assert.equal(state.currentUser.email, 'store.user@ciputra.ac.id');

    // Sign out
    await authStore.signOut();
    assert.equal(state.isAuthenticated, false);
    assert.equal(state.currentUser, null);

    unsubscribe();
  });
});

describe('5. Todo Svelte Store with Optimistic Updates & Derived Stores', () => {
  it('should expose reactive todo state, filters, and CRUD operations', async () => {
    const { todoStore, filteredTodos, todoStats } = todoStoreModule;

    let currentState;
    let currentFiltered;
    let currentStats;

    const unsubs = [
      todoStore.subscribe((val) => (currentState = val)),
      filteredTodos.subscribe((val) => (currentFiltered = val)),
      todoStats.subscribe((val) => (currentStats = val)),
    ];

    assert.ok(currentState);
    assert.equal(typeof todoStore.fetchTodos, 'function');
    assert.equal(typeof todoStore.createTodo, 'function');
    assert.equal(typeof todoStore.toggleComplete, 'function');
    assert.equal(typeof todoStore.deleteTodo, 'function');
    assert.equal(typeof todoStore.setFilter, 'function');

    // Create a task
    const newTodo = await todoStore.createTodo({
      title: 'Store Test Note',
      description: 'Reactive store validation',
      priority: 'high',
      category: 'work',
      color: 'emerald',
    });

    assert.ok(newTodo);
    assert.equal(newTodo.title, 'Store Test Note');
    assert.ok(currentState.todos.some((t) => t.id === newTodo.id));

    // Optimistic toggle
    const toggleSuccess = await todoStore.toggleComplete(newTodo.id);
    assert.equal(toggleSuccess, true);
    const toggled = currentState.todos.find((t) => t.id === newTodo.id);
    assert.equal(toggled.completed, true);

    // Filter verification
    todoStore.setFilter('completed');
    assert.ok(currentFiltered.every((t) => t.completed === true));

    todoStore.setFilter('active');
    assert.ok(currentFiltered.every((t) => t.completed === false));

    todoStore.setFilter('all');
    todoStore.setSearch('Store Test Note');
    assert.ok(currentFiltered.length >= 1);
    assert.ok(currentFiltered.some((t) => t.id === newTodo.id));

    // Stats verification
    assert.ok(currentStats.total >= 1);
    assert.equal(typeof currentStats.completed, 'number');
    assert.equal(typeof currentStats.active, 'number');

    // Cleanup
    await todoStore.deleteTodo(newTodo.id);
    assert.ok(!currentState.todos.some((t) => t.id === newTodo.id));

    unsubs.forEach((unsub) => unsub());
  });
});
