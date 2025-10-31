/**
 * Unit tests for cache utility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Cache, MemoryCacheStore } from '../../../src/utils/cache';

describe('Cache utility', () => {
    let cache: Cache;

    beforeEach(() => {
        cache = new Cache(new MemoryCacheStore());
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should cache values within the ttl window', async () => {
        const fetcher = jest.fn<() => Promise<string>>();
        fetcher.mockResolvedValue('value');

        const first = await cache.getOrSet('key', 60, fetcher);
        const second = await cache.getOrSet('key', 60, fetcher);

        expect(first).toBe('value');
        expect(second).toBe('value');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should expire entries after ttl elapses', async () => {
        jest.useFakeTimers({ now: Date.now() });

        const fetcher = jest.fn<() => Promise<string>>();
        fetcher
            .mockResolvedValueOnce('initial')
            .mockResolvedValueOnce('refetched');

        const first = await cache.getOrSet('key', 1, fetcher);
        expect(first).toBe('initial');
        expect(fetcher).toHaveBeenCalledTimes(1);

        jest.advanceTimersByTime(1000);

        const second = await cache.getOrSet('key', 1, fetcher);
        expect(second).toBe('refetched');
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should avoid duplicate fetches for concurrent calls', async () => {
        const fetcher = jest.fn<() => Promise<string>>().mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'value';
        });

        const [first, second] = await Promise.all([
            cache.getOrSet('key', 60, fetcher),
            cache.getOrSet('key', 60, fetcher)
        ]);

        expect(first).toBe('value');
        expect(second).toBe('value');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('should clear cached entries', async () => {
        const fetcher = jest.fn<() => Promise<string>>();
        fetcher.mockResolvedValue('value');

        await cache.getOrSet('key', 60, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);

        cache.clear();

        await cache.getOrSet('key', 60, fetcher);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('should bypass caching when ttl is zero', async () => {
        const fetcher = jest.fn<() => Promise<string>>();
        fetcher.mockResolvedValue('value');

        await cache.getOrSet('key', 0, fetcher);
        await cache.getOrSet('key', 0, fetcher);

        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
