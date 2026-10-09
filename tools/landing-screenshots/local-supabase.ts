import { execFileSync } from 'node:child_process';

/** Conexión a Supabase local, con las claves de `pnpm supabase status` (públicas y solo de prueba). */
export interface LocalSupabase {
  readonly url: string;
  readonly publishableKey: string;
  readonly secretKey: string;
}

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

/**
 * Lee la conexión de Supabase local y se niega a seguir si no apunta a esta máquina: la herramienta
 * crea y borra datos, y nunca debe tocar el proyecto remoto.
 */
export function localSupabase(root: string): LocalSupabase {
  let output: string;
  try {
    output = execFileSync('pnpm', ['exec', 'supabase', 'status', '-o', 'env'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    throw new Error('Supabase local no responde. Arráncalo con `pnpm supabase start`.');
  }
  const values = new Map(
    [...output.matchAll(/^([A-Z_]+)="?([^"\n]*)"?$/gm)].map((match) => [match[1], match[2]]),
  );
  const url = values.get('API_URL');
  const publishableKey = values.get('PUBLISHABLE_KEY');
  const secretKey = values.get('SECRET_KEY');
  if (!url || !publishableKey || !secretKey) {
    throw new Error('`pnpm supabase status` no devolvió API_URL, PUBLISHABLE_KEY y SECRET_KEY.');
  }
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(
      `Supabase no es local (${url}). La herramienta solo trabaja contra esta máquina.`,
    );
  }
  return { url, publishableKey, secretKey };
}

type Json = Record<string, unknown>;

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${new URL(url).pathname}: ${response.status} ${body}`);
  }
  return (body ? JSON.parse(body) : null) as T;
}

/**
 * Cliente mínimo de la API REST de Supabase. Con el token de una persona, la base aplica RLS como
 * en la app; con la clave secreta, la salta (solo para preparar y limpiar el caso).
 */
export class Rest {
  private readonly env: LocalSupabase;
  private readonly token: string;

  constructor(env: LocalSupabase, token: string) {
    this.env = env;
    this.token = token;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const apikey = this.token === this.env.secretKey ? this.env.secretKey : this.env.publishableKey;
    return {
      apikey,
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  /** Inserta filas y devuelve las creadas. */
  insert<T = Json>(table: string, rows: Json | Json[]): Promise<T[]> {
    return request<T[]>(`${this.env.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.headers({ Prefer: 'return=representation' }),
      body: JSON.stringify(rows),
    });
  }

  select<T = Json>(table: string, query: string): Promise<T[]> {
    return request<T[]>(`${this.env.url}/rest/v1/${table}?${query}`, {
      headers: this.headers(),
    });
  }

  update(table: string, query: string, values: Json): Promise<unknown> {
    return request(`${this.env.url}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: this.headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(values),
    });
  }

  delete(table: string, query: string): Promise<unknown> {
    return request(`${this.env.url}/rest/v1/${table}?${query}`, {
      method: 'DELETE',
      headers: this.headers({ Prefer: 'return=minimal' }),
    });
  }

  rpc<T>(fn: string, args: Json): Promise<T> {
    return request<T>(`${this.env.url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(args),
    });
  }
}

interface AdminUser {
  readonly id: string;
  readonly email?: string;
}

/** Usuarios de Supabase Auth local con la API de administración. */
export class Accounts {
  private readonly env: LocalSupabase;

  constructor(env: LocalSupabase) {
    this.env = env;
  }

  private headers(): Record<string, string> {
    return {
      apikey: this.env.secretKey,
      Authorization: `Bearer ${this.env.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async find(email: string): Promise<AdminUser | null> {
    const { users } = await request<{ users: AdminUser[] }>(
      `${this.env.url}/auth/v1/admin/users?page=1&per_page=1000`,
      { headers: this.headers() },
    );
    return users.find((user) => user.email === email) ?? null;
  }

  /** Crea la cuenta con el correo confirmado, o le pone la contraseña si ya existe. */
  async ensure(email: string, password: string): Promise<string> {
    const existing = await this.find(email);
    if (existing) {
      await request(`${this.env.url}/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({ password }),
      });
      return existing.id;
    }
    const created = await request<AdminUser>(`${this.env.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    return created.id;
  }

  async remove(email: string): Promise<void> {
    const existing = await this.find(email);
    if (!existing) return;
    await request(`${this.env.url}/auth/v1/admin/users/${existing.id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });
  }

  /** Token de acceso de la persona, como el que tendría la app al entrar con contraseña. */
  async signIn(email: string, password: string): Promise<string> {
    const session = await request<{ access_token: string }>(
      `${this.env.url}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: { apikey: this.env.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
    );
    return session.access_token;
  }
}
