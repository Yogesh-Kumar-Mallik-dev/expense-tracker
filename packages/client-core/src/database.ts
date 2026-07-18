export async function stableUserDatabaseIdentity(userId: string) {
  const bytes = new TextEncoder().encode(userId);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const suffix = [...new Uint8Array(digest)]
    .slice(0, 12)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `expense-tracker-${suffix}.db`;
}

export class DeferredLocalDatabaseLifecycle {
  private activeUserId: string | null = null;

  identityFor(userId: string) {
    return stableUserDatabaseIdentity(userId);
  }
  async open(userId: string) {
    this.activeUserId = userId;
  }
  async close() {
    this.activeUserId = null;
  }
  async remove(userId: string) {
    if (this.activeUserId === userId) await this.close();
  }
}
