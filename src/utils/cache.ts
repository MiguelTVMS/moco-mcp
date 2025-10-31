/**
 * Simple cache abstraction with pluggable storage backend.
 * Starts with an in-memory implementation but can be extended
 * to external providers (e.g., Redis) without changing callers.
 */

export interface CacheStore {
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    delete(key: string): void;
    clear(): void;
}

interface MemoryCacheEntry<T> {
    value: T;
    expiresAt?: number;
}

/**
 * In-memory cache store with TTL support.
 */
export class MemoryCacheStore implements CacheStore {
    private store = new Map<string, MemoryCacheEntry<unknown>>();

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) {
            return undefined;
        }

        if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
            this.store.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        if (ttlSeconds !== undefined && ttlSeconds <= 0) {
            // Zero or negative TTL effectively disables caching for this entry.
            this.store.delete(key);
            return;
        }

        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
        this.store.set(key, { value, expiresAt });
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}

/**
 * Cache facade that coordinates fetch de-duplication and TTL handling.
 */
export class Cache {
    private pendingFetches = new Map<string, Promise<unknown>>();

    constructor(private store: CacheStore = new MemoryCacheStore()) { }

    get<T>(key: string): T | undefined {
        return this.store.get<T>(key);
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        this.store.set<T>(key, value, ttlSeconds);
    }

    delete(key: string): void {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
        this.pendingFetches.clear();
    }

    async getOrSet<T>(
        key: string,
        ttlSeconds: number,
        fetcher: () => Promise<T> | T
    ): Promise<T> {
        if (ttlSeconds <= 0) {
            return await Promise.resolve(fetcher());
        }

        const cached = this.get<T>(key);
        if (cached !== undefined) {
            return cached;
        }

        const existingPending = this.pendingFetches.get(key);
        if (existingPending) {
            return existingPending as Promise<T>;
        }

        const pending = Promise.resolve()
            .then(fetcher)
            .then((result) => {
                this.set<T>(key, result, ttlSeconds);
                return result;
            })
            .finally(() => {
                this.pendingFetches.delete(key);
            });

        this.pendingFetches.set(key, pending);
        return pending;
    }

    setStore(store: CacheStore): void {
        this.store = store;
        this.clear();
    }
}

export const cache = new Cache();
