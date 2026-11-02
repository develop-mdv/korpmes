// Runs against a disposable local API. Never point STAFFHUB_TEST_API at production.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { io } = require('socket.io-client');
const api = process.env.STAFFHUB_TEST_API;

test('username migration backfills existing accounts without collisions or changing their data', {
  skip: process.env.STAFFHUB_TEST_MIGRATION !== '1', timeout: 30000,
}, async () => {
  assert.equal(process.env.DB_NAME, 'staffhub_personal_test');
  const { Client } = require('pg');
  require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json'), transpileOnly: true });
  const { AddUsernames1764000000001 } = require('../src/database/migrations/1764000000001-AddUsernames');
  const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query(`CREATE SCHEMA username_migration_${Date.now()}`);
    const schema = (await db.query("SELECT nspname FROM pg_namespace WHERE nspname LIKE 'username_migration_%' ORDER BY nspname DESC LIMIT 1")).rows[0].nspname;
    await db.query(`SET LOCAL search_path TO ${schema}`);
    await db.query('CREATE TABLE users (id uuid PRIMARY KEY, email text, first_name text)');
    await db.query("INSERT INTO users SELECT md5(i::text)::uuid, 'legacy-' || i || '@example.test', 'Legacy' FROM generate_series(1, 501) AS i");
    await db.query("INSERT INTO users VALUES ('11111111-1111-4111-8111-111111111110', 'near-1@example.test', 'Legacy'), ('11111111-1111-4111-8111-111111111111', 'near-2@example.test', 'Legacy')");
    const migration = new AddUsernames1764000000001();
    const runner = { query: (sql, params) => db.query(sql, params).then((response) => response.rows) };
    await migration.up(runner);
    const rows = (await db.query('SELECT * FROM users')).rows;
    assert.equal(rows.length, 503);
    assert.equal(new Set(rows.map((row) => row.username)).size, 503);
    assert.ok(rows.every((row) => /^[a-z][a-z0-9_]{2,31}$/.test(row.username) && row.first_name === 'Legacy' && row.email.endsWith('@example.test')));
    await db.query('SAVEPOINT duplicate_username');
    await assert.rejects(() => db.query('UPDATE users SET username = $1 WHERE id = $2', [rows[0].username, rows[1].id]), { code: '23505' });
    await db.query('ROLLBACK TO SAVEPOINT duplicate_username');
    await migration.down(runner);
    assert.equal((await db.query('SELECT count(*) FROM users')).rows[0].count, '503');
  } finally { await db.query('ROLLBACK'); await db.end(); }
});

test('personal workspace migration preserves existing organization data and refuses a destructive rollback', {
  skip: process.env.STAFFHUB_TEST_MIGRATION !== '1', timeout: 30000,
}, async () => {
  assert.equal(process.env.DB_NAME, 'staffhub_personal_test');
  const { Client } = require('pg');
  require('ts-node').register({ project: require('node:path').join(__dirname, '../tsconfig.json'), transpileOnly: true });
  const { AddPersonalWorkspaces1763000000001 } = require('../src/database/migrations/1763000000001-AddPersonalWorkspaces');
  const db = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  await db.connect();
  try {
    await db.query('BEGIN');
    const schema = `workspace_migration_${Date.now()}`;
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`SET LOCAL search_path TO ${schema}`);
    await db.query('CREATE TABLE chats (organization_id uuid NOT NULL, type varchar NOT NULL, last_message_at timestamp, deleted_at timestamp)');
    await db.query('CREATE TABLE files (organization_id uuid NOT NULL, uploader_id uuid NOT NULL, created_at timestamp DEFAULT now())');
    const orgId = '11111111-1111-4111-8111-111111111111';
    await db.query("INSERT INTO chats (organization_id, type) VALUES ($1, 'PERSONAL')", [orgId]);
    await db.query('INSERT INTO files (organization_id, uploader_id) VALUES ($1, $1)', [orgId]);
    const migration = new AddPersonalWorkspaces1763000000001();
    const runner = { query: (sql) => db.query(sql).then((response) => response.rows) };
    await migration.up(runner);
    assert.equal((await db.query('SELECT organization_id FROM chats')).rows[0].organization_id, orgId);
    assert.equal((await db.query('SELECT organization_id FROM files')).rows[0].organization_id, orgId);
    await db.query("INSERT INTO chats (organization_id, type) VALUES (NULL, 'PERSONAL')");
    await assert.rejects(() => migration.down(runner), /personal chats or files exist/);
    await db.query('SAVEPOINT invalid_type');
    await assert.rejects(() => db.query("INSERT INTO chats (organization_id, type) VALUES (NULL, 'CHANNEL')"), { code: '23514' });
    await db.query('ROLLBACK TO SAVEPOINT invalid_type');
    await db.query('DELETE FROM chats WHERE organization_id IS NULL');
    await migration.down(runner);
    const nullable = await db.query("SELECT is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'chats' AND column_name = 'organization_id'", [schema]);
    assert.equal(nullable.rows[0].is_nullable, 'NO');
  } finally {
    await db.query('ROLLBACK');
    await db.end();
  }
});

test('personal and organization workspaces', { skip: !api, timeout: 90000 }, async (t) => {
  assert.match(api, /^http:\/\/(127\.0\.0\.1|localhost):\d+\/api$/);
  const suffix = Date.now();
  const password = 'WorkspaceTest123!';
  const sockets = [];
  t.after(() => sockets.forEach((socket) => socket.disconnect()));
  const request = async (path, { token, method = 'GET', body, form, status } = {}) => {
    const response = await fetch(`${api}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: form ?? (body ? JSON.stringify(body) : undefined),
    });
    const json = await response.json();
    if (status !== undefined) assert.equal(response.status, status, JSON.stringify(json));
    else assert.ok(response.ok, `${response.status}: ${JSON.stringify(json)}`);
    return json.data ?? json;
  };
  const register = (name) => request('/auth/register', { method: 'POST', body: {
    email: `${name}.${suffix}@example.test`, firstName: name, lastName: 'Test', password,
  } });
  const alice = await register('alice');
  const bob = await register('bob');
  const stranger = await register('stranger');
  const a = alice.accessToken;
  const b = bob.accessToken;
  const c = stranger.accessToken;
  const waitFor = (socket, event, predicate = () => true) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Timed out: ${event}`)); }, 5000);
    const handler = (data) => { if (predicate(data)) { clearTimeout(timer); socket.off(event, handler); resolve(data); } };
    socket.on(event, handler);
  });
  const connect = async (token) => {
    const socket = io(api.replace(/\/api$/, ''), { auth: { token }, transports: ['websocket'], forceNew: true, autoConnect: false });
    sockets.push(socket);
    const connected = waitFor(socket, 'connect'); socket.connect(); await connected;
    return socket;
  };
  const aliceSocket = await connect(a);
  const bobSocket = await connect(b);
  const send = async (chatId, content, fileIds) => {
    const received = waitFor(aliceSocket, 'message:new', (message) => message.chatId === chatId && message.content === content);
    aliceSocket.emit('message:send', { chatId, content, ...(fileIds ? { fileIds } : {}) });
    return received;
  };
  const create = (token, body) => request('/chats', { token, method: 'POST', body });
  const upload = (token, orgId) => {
    const form = new FormData(); form.append('file', new Blob(['personal-workspace-test'], { type: 'text/plain' }), 'workspace-test.txt');
    return request(`/files/upload${orgId ? `?orgId=${orgId}` : ''}`, { token, method: 'POST', form });
  };
  let personal, group, org, work, workFile, personalFile, workDownload;

  await t.test('registration works without membership, login is case insensitive, and secrets stay private', async () => {
    assert.equal(alice.user.email, `alice.${suffix}@example.test`);
    assert.equal(alice.user.passwordHash, undefined);
    assert.equal(alice.user.twoFactorSecret, undefined);
    assert.deepEqual(await request('/organizations', { token: a }), []);
    await request('/auth/login', { method: 'POST', body: { email: alice.user.email.toUpperCase(), password } });
    await request('/auth/register', { status: 409, method: 'POST', body: { email: alice.user.email.toUpperCase(), firstName: 'duplicate', lastName: 'Test', password } });
  });
  await t.test('saved messages are created once under concurrent requests without an organization', async () => {
    const lists = await Promise.all(Array.from({ length: 5 }, () => request('/chats', { token: a })));
    const ids = lists.flat().filter((chat) => chat.members.length === 1).map((chat) => chat.id);
    assert.equal(new Set(ids).size, 1);
    assert.ok(lists.every((list) => list.every((chat) => chat.organizationId === null)));
  });
  await t.test('personal discovery requires exact email and does not expose password hashes', async () => {
    assert.deepEqual(await request('/users/search?q=bob', { token: a }), []);
    const found = await request(`/users/search?q=${encodeURIComponent(bob.user.email.toUpperCase())}`, { token: a });
    assert.equal(found.length, 1); assert.equal(found[0].id, bob.user.id); assert.equal(found[0].passwordHash, undefined);
  });
  const bobUsername = `nick_${suffix}`;
  const strangerUsername = `nickx${suffix}`;
  await t.test('every account has a username and registration accepts a chosen case insensitive handle', async () => {
    for (const user of [alice.user, bob.user, stranger.user]) assert.match(user.username, /^[a-z][a-z0-9_]{2,31}$/);
    assert.equal(new Set([alice.user.username, bob.user.username, stranger.user.username]).size, 3);
    const custom = await request('/auth/register', { method: 'POST', body: { email: `custom.${suffix}@example.test`, firstName: 'Custom', lastName: 'Test', password, username: ` @Chosen_${suffix} ` } });
    assert.equal(custom.user.username, `chosen_${suffix}`);
    await request('/auth/register', { status: 409, method: 'POST', body: { email: `duplicate-nick.${suffix}@example.test`, firstName: 'Duplicate', lastName: 'Test', password, username: `CHOSEN_${suffix}` } });
  });
  await t.test('profile usernames persist on the server and normalize a leading @, case and whitespace', async () => {
    const updated = await request('/users/me', { token: b, method: 'PATCH', body: { username: ` @NICK_${suffix} ` } });
    assert.equal(updated.username, bobUsername);
    assert.equal((await request('/users/me', { token: b })).username, bobUsername);
    const login = await request('/auth/login', { method: 'POST', body: { email: bob.user.email, password } });
    assert.equal(login.user.username, bobUsername);
    await request('/users/me', { token: c, method: 'PATCH', body: { username: strangerUsername } });
  });
  await t.test('nickname search supports @, prefixes, case, exact-match priority and literal underscores', async () => {
    for (const query of [bobUsername, `@${bobUsername.toUpperCase()}`, '@NICK_']) {
      const found = await request(`/users/search?q=${encodeURIComponent(query)}`, { token: a });
      assert.ok(found.some((user) => user.id === bob.user.id && user.username === bobUsername));
      assert.ok(!found.some((user) => user.id === stranger.user.id));
    }
    await request('/users/me', { token: c, method: 'PATCH', body: { username: `${bobUsername}_team` } });
    const found = await request(`/users/search?q=${bobUsername}`, { token: a });
    assert.equal(found[0].id, bob.user.id); assert.ok(found.some((user) => user.id === stranger.user.id));
    const results = await request(`/search?q=${bobUsername}&scope=members`, { token: a });
    assert.ok(results.results.some((result) => result.id === bob.user.id && result.snippet === `@${bobUsername}`));
    assert.deepEqual(await request('/users/search?q=%40ni', { token: a }), []);
    assert.deepEqual(await request('/users/search?q=%40%25%25%25', { token: a }), []);
  });
  await t.test('concurrent claims produce one winner and a clear conflict, with no duplicate users', async () => {
    const username = `race_${suffix}`;
    const claim = (token) => fetch(`${api}/users/me`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
    const responses = await Promise.all([claim(b), claim(c)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
    const conflict = await responses.find((response) => response.status === 409).json();
    assert.match(JSON.stringify(conflict), /никнейм уже занят/);
    assert.equal((await request(`/users/search?q=${username}`, { token: a })).length, 1);
    await request('/users/me', { token: b, method: 'PATCH', body: { username: bobUsername } });
    await request('/users/me', { token: c, method: 'PATCH', body: { username: strangerUsername } });
  });
  await t.test('invalid usernames are rejected and an unchanged nickname remains available to its owner', async () => {
    for (const username of ['ab', 'a'.repeat(33), '123nick', 'bad-name', 'two words', 'никнейм', null, true, 12345]) {
      await request('/users/me', { token: b, method: 'PATCH', body: { username }, status: 400 });
    }
    await request('/users/me', { token: b, method: 'PATCH', body: { username: bobUsername.toUpperCase() } });
    assert.equal((await request('/users/me', { token: b })).username, bobUsername);
    await request('/users/me', { token: c, method: 'PATCH', body: { username: bobUsername }, status: 409 });
  });
  await t.test('direct and group chats work across users without a shared organization', async () => {
    const announced = waitFor(bobSocket, 'chat:created');
    personal = await create(a, { type: 'PERSONAL', memberIds: [bob.user.id] });
    assert.equal((await announced).id, personal.id);
    assert.equal(personal.organizationId, null);
    assert.ok(personal.members.every((member) => member.user.passwordHash === undefined));
    const duplicates = await Promise.all(Array.from({ length: 4 }, () => create(b, { type: 'PERSONAL', memberIds: [alice.user.id], organizationId: null })));
    assert.ok(duplicates.every((chat) => chat.id === personal.id));
    group = await create(a, { type: 'GROUP', name: 'Personal group', memberIds: [bob.user.id, stranger.user.id] });
    assert.equal(group.organizationId, null);
    await request('/chats', { token: a, method: 'POST', body: { type: 'CHANNEL', name: 'Invalid personal channel', memberIds: [bob.user.id] }, status: 400 });
  });
  await t.test('personal messages are delivered in real time and unread counts are returned', async () => {
    const received = waitFor(bobSocket, 'message:new', (message) => message.chatId === personal.id);
    await send(personal.id, 'personal-only-marker'); await received;
    const bobChats = await request('/chats', { token: b });
    assert.equal(bobChats.find((chat) => chat.id === personal.id).unreadCount, 1);
    await request(`/chats/${personal.id}/messages`, { token: c, status: 403 });
    await request(`/chats/${personal.id}`, { token: c, status: 403 });
    await request(`/chats/${personal.id}/members`, { token: c, status: 403 });
    await request(`/chats/${group.id}/members`, { token: b, method: 'POST', body: { userId: alice.user.id }, status: 403 });
  });
  await t.test('organization onboarding preserves invitations and the default team chat', async () => {
    org = await request('/organizations', { token: a, method: 'POST', body: { name: 'Workspace Test', slug: `test-${suffix}` } });
    const invite = await request(`/organizations/${org.id}/invite-link`, { token: a, method: 'POST' });
    await request(`/organizations/invites/${invite.invite.token}/accept`, { token: b, method: 'POST' });
    const bobWork = await request(`/chats?orgId=${org.id}`, { token: b });
    assert.ok(bobWork.some((chat) => chat.name === 'Общий'));
    work = await create(a, { type: 'PERSONAL', organizationId: org.id, memberIds: [bob.user.id] });
    assert.notEqual(work.id, personal.id);
    await request(`/chats?orgId=${org.id}`, { token: c, status: 403 });
    await request(`/users/search?q=alice&orgId=${org.id}`, { token: c, status: 403 });
    await request('/chats', { token: a, method: 'POST', body: { type: 'PERSONAL', organizationId: org.id, memberIds: [stranger.user.id] }, status: 400 });
    await request(`/organizations/invites/${invite.invite.token}/accept`, { token: c, method: 'POST' });
    await request(`/organizations/${org.id}/members/${stranger.user.id}/role`, { token: a, method: 'PATCH', body: { role: 'admin' } });
    const membersByNick = await request(`/users/search?q=${bobUsername}&orgId=${org.id}`, { token: a });
    assert.ok(membersByNick.some((user) => user.id === bob.user.id));
  });
  await t.test('the same users have independent personal and work conversations', async () => {
    await send(work.id, 'work-only-marker');
    const personalChats = await request('/chats', { token: a });
    const workChats = await request(`/chats?orgId=${org.id}`, { token: a });
    assert.ok(personalChats.some((chat) => chat.id === personal.id));
    assert.ok(!personalChats.some((chat) => chat.id === work.id));
    assert.ok(workChats.some((chat) => chat.id === work.id));
    assert.ok(!workChats.some((chat) => chat.id === personal.id));
  });
  await t.test('personal uploads remain private until attached, then belong to chat participants', async () => {
    personalFile = await upload(a);
    assert.equal(personalFile.organizationId, null);
    await request(`/files/${personalFile.id}`, { token: b, status: 403 });
    await send(personal.id, 'personal attachment', [personalFile.id]);
    await request(`/files/${personalFile.id}`, { token: b });
    await request(`/files/${personalFile.id}`, { token: c, status: 403 });
    assert.ok((await request('/files', { token: b })).some((file) => file.id === personalFile.id));
  });
  await t.test('work files cannot be attached to personal messages and private work files remain private', async () => {
    workFile = await upload(a, org.id);
    const rejected = waitFor(aliceSocket, 'error');
    aliceSocket.emit('message:send', { chatId: personal.id, content: 'invalid attachment', fileIds: [workFile.id] });
    await rejected;
    await send(work.id, 'work attachment', [workFile.id]);
    workDownload = (await request(`/files/${workFile.id}/download`, { token: b })).url;
    assert.ok(!(await request('/files', { token: b })).some((file) => file.id === workFile.id));
    assert.ok(!(await request(`/files?orgId=${org.id}`, { token: b })).some((file) => file.id === personalFile.id));
  });
  await t.test('search isolates work and personal content and only searches accessible chats', async () => {
    const personalSearch = await request('/search?q=marker&scope=all', { token: a });
    assert.ok(personalSearch.results.some((result) => result.metadata.chatId === personal.id));
    assert.ok(!personalSearch.results.some((result) => result.metadata.chatId === work.id));
    const workSearch = await request(`/search?q=marker&scope=messages&orgId=${org.id}`, { token: a });
    assert.ok(workSearch.results.some((result) => result.metadata.chatId === work.id));
    assert.ok(!workSearch.results.some((result) => result.metadata.chatId === personal.id));
    assert.equal((await request('/search?q=marker&scope=messages', { token: c })).total, 0);
    assert.equal((await request(`/search?q=marker&orgId=${org.id}`, { token: c })).total, 0);
    await request(`/search?q=marker&chatId=${personal.id}`, { token: c, status: 403 });
    await request(`/files/${personalFile.id}`, { token: c, status: 403 });
    await request(`/files/${workFile.id}`, { token: c, status: 403 });
    assert.ok(!(await request(`/files?orgId=${org.id}`, { token: c })).some((file) => file.id === workFile.id));
  });
  await t.test('call history is scoped to the selected space', async () => {
    const personalCall = await request('/calls', { token: a, method: 'POST', body: { chatId: personal.id, type: 'AUDIO' } });
    await request(`/calls/${personalCall.id}/hangup`, { token: a, method: 'PATCH' });
    const workCall = await request('/calls', { token: a, method: 'POST', body: { chatId: work.id, type: 'AUDIO' } });
    await request(`/calls/${workCall.id}/hangup`, { token: a, method: 'PATCH' });
    const personalHistory = await request('/calls/history/all', { token: a });
    const workHistory = await request(`/calls/history/all?orgId=${org.id}`, { token: a });
    assert.ok(personalHistory.some((call) => call.id === personalCall.id)); assert.ok(!personalHistory.some((call) => call.id === workCall.id));
    assert.ok(workHistory.some((call) => call.id === workCall.id)); assert.ok(!workHistory.some((call) => call.id === personalCall.id));
    await request('/calls', { token: c, method: 'POST', body: { chatId: personal.id, type: 'AUDIO' }, status: 403 });
  });
  await t.test('removing organization membership revokes work access and existing signed links while preserving personal chats', async () => {
    const revoked = waitFor(bobSocket, 'organization:removed');
    await request(`/organizations/${org.id}/members/${bob.user.id}`, { token: a, method: 'DELETE' }); await revoked;
    await request(`/chats/${work.id}/messages`, { token: b, status: 403 });
    await request(`/files/${workFile.id}`, { token: b, status: 403 });
    assert.equal((await fetch(workDownload)).status, 403);
    await request(`/files/${personalFile.id}`, { token: b });
    assert.ok((await request('/chats', { token: b })).some((chat) => chat.id === personal.id));
    const remainingWork = await request(`/chats?orgId=${org.id}`, { token: a });
    assert.ok(remainingWork.some((chat) => chat.id === work.id && chat.members.length === 2));
    assert.ok(remainingWork.some((chat) => chat.id !== work.id && chat.type === 'PERSONAL' && chat.members.length === 1));
    let leaked = false;
    const monitor = (message) => { if (message.chatId === work.id) leaked = true; };
    bobSocket.on('message:new', monitor); await send(work.id, 'after removal');
    await request(`/chats/${work.id}/messages`, { token: a });
    bobSocket.off('message:new', monitor); assert.equal(leaked, false);
  });
  if (process.env.STAFFHUB_TEST_FIXTURE_PATH) {
    require('node:fs').writeFileSync(process.env.STAFFHUB_TEST_FIXTURE_PATH, JSON.stringify({ email: alice.user.email, password, personalChatId: personal.id, organizationId: org.id, workChatId: work.id }));
  }
});
