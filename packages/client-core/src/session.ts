import {
  sessionSchema,
  type RegistrationInput,
  type Session,
} from "./contracts";
import { ResponseValidationError } from "./errors";
import type {
  AuthState,
  LocalDatabaseLifecycle,
  SessionController,
  SyncController,
} from "./application";

export interface SessionCredentialStore {
  read(): Promise<string | null>;
  write(refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthenticationTransport {
  login(email: string, password: string): Promise<Session>;
  register(input: RegistrationInput): Promise<Session>;
  refresh(refreshToken: string | null): Promise<Session>;
  logout(
    accessToken: string | null,
    refreshToken: string | null,
  ): Promise<void>;
}

export interface SessionControllerOptions {
  transport: AuthenticationTransport;
  credentials?: SessionCredentialStore;
  sync?: SyncController;
  localDatabase?: LocalDatabaseLifecycle;
  registerDevice?: (session: Session) => Promise<void>;
  refreshSkewMs?: number;
  now?: () => number;
}

export class ApplicationSessionController implements SessionController {
  private current: AuthState = { status: "restoring", session: null };
  private readonly listeners = new Set<(state: AuthState) => void>();
  private refreshPromise: Promise<Session> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private activeDatabaseUserId: string | null = null;
  private readonly now: () => number;

  constructor(private readonly options: SessionControllerOptions) {
    this.now = options.now ?? Date.now;
  }

  state() {
    return this.current;
  }

  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    listener(this.current);
    return () => this.listeners.delete(listener);
  }

  async restore() {
    if (this.current.status === "authenticated") return this.current;
    const refreshToken = await this.options.credentials?.read();
    try {
      const session = await this.options.transport.refresh(
        refreshToken ?? null,
      );
      await this.accept(session);
    } catch {
      await this.clear();
    }
    return this.current;
  }

  async login(email: string, password: string) {
    const session = await this.options.transport.login(email, password);
    await this.accept(session);
    return session;
  }

  async register(input: RegistrationInput) {
    const session = await this.options.transport.register(input);
    await this.accept(session);
    return session;
  }

  refresh() {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async getAccessToken() {
    return this.current.status === "authenticated"
      ? this.current.session.tokens.accessToken
      : null;
  }

  async logout() {
    const accessToken = await this.getAccessToken();
    const refreshToken = await this.options.credentials?.read();
    try {
      await this.options.sync?.disconnect();
      await this.options.transport.logout(accessToken, refreshToken ?? null);
    } finally {
      await this.options.localDatabase?.close();
      this.activeDatabaseUserId = null;
      await this.clear();
    }
  }

  private async performRefresh() {
    const refreshToken = await this.options.credentials?.read();
    try {
      const session = await this.options.transport.refresh(
        refreshToken ?? null,
      );
      await this.accept(session);
      return session;
    } catch (error) {
      await this.options.sync?.disconnect();
      await this.options.localDatabase?.close();
      this.activeDatabaseUserId = null;
      await this.clear();
      throw error;
    }
  }

  private async accept(input: Session) {
    const parsed = sessionSchema.safeParse(input);
    if (!parsed.success)
      throw new ResponseValidationError(
        "session",
        parsed.error.issues.map((issue) => issue.path.join(".")),
      );
    const session = parsed.data;
    if (session.tokens.refreshToken)
      await this.options.credentials?.write(session.tokens.refreshToken);
    this.set({ status: "authenticated", session });
    try {
      if (this.activeDatabaseUserId !== session.user.id) {
        await this.options.localDatabase?.open(session.user.id);
        this.activeDatabaseUserId = session.user.id;
      }
      await this.options.registerDevice?.(session);
    } catch (error) {
      await this.clear();
      throw error;
    }
    this.scheduleRefresh(session);
  }

  private scheduleRefresh(session: Session) {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const delay = Math.max(
      1_000,
      session.tokens.expiresIn * 1_000 - (this.options.refreshSkewMs ?? 60_000),
    );
    this.refreshTimer = setTimeout(
      () => void this.refresh().catch(() => {}),
      delay,
    );
    (
      this.refreshTimer as ReturnType<typeof setTimeout> & {
        unref?: () => void;
      }
    ).unref?.();
  }

  private async clear() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.refreshTimer = null;
    await this.options.credentials?.clear();
    this.set({ status: "anonymous", session: null });
  }

  private set(state: AuthState) {
    this.current = state;
    for (const listener of this.listeners) listener(state);
  }
}

export class MemoryCredentialStore implements SessionCredentialStore {
  private value: string | null = null;
  async read() {
    return this.value;
  }
  async write(value: string) {
    this.value = value;
  }
  async clear() {
    this.value = null;
  }
}
