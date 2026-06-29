import { useState } from 'react';
import { loginWithPassword, logout } from '../auth/supabaseAuth';
import { ottApi } from '../api/ottApiClient';
import { canAccessModule, getRoles } from '../auth/moduleAccess';

export function ApiConnectionTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState<unknown>('No test run yet.');
  const [status, setStatus] = useState('Ready');

  async function run(label: string, fn: () => Promise<unknown>) {
    setStatus(`Running ${label}...`);
    try {
      const result = await fn();
      setStatus(`PASS ${label}`);
      setOutput(result);
    } catch (error) {
      setStatus(`FAIL ${label}`);
      setOutput(error);
    }
  }

  async function moduleAccessTest() {
    const me = await ottApi.me();
    const modules = ['dashboard', 'upload', 'cargo', 'recovery', 'ptt', 'warehouse', 'damage', 'release', 'forklift', 'equipment', 'accounting', 'customerPortal', 'admin'];
    return {
      roles: getRoles(me as never),
      modules: modules.map((moduleKey) => ({ moduleKey, allowed: canAccessModule(me as never, moduleKey) }))
    };
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>OTT Phase 3A API Connection Test</h1>

      <section>
        <h2>Public checks</h2>
        <button onClick={() => run('/health', ottApi.health)}>Test /health</button>{' '}
        <button onClick={() => run('/health/db', ottApi.dbHealth)}>Test /health/db</button>{' '}
        <button onClick={() => run('/api/v1/version', ottApi.version)}>Test version</button>
      </section>

      <section>
        <h2>Login</h2>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />{' '}
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />{' '}
        <button onClick={() => run('Supabase login', () => loginWithPassword(email, password))}>Login</button>{' '}
        <button onClick={() => run('/auth/me', ottApi.me)}>Test /auth/me</button>{' '}
        <button onClick={() => run('logout', logout)}>Logout</button>
      </section>

      <section>
        <h2>Module access</h2>
        <button onClick={() => run('module access', moduleAccessTest)}>Show allowed modules</button>
      </section>

      <section>
        <h2>{status}</h2>
        <pre style={{ background: '#111827', color: '#e5e7eb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
          {JSON.stringify(output, null, 2)}
        </pre>
      </section>
    </main>
  );
}
