"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lazy_cache_1 = require("../lib/lazy-cache");
describe('lazyCache', () => {
    test('result is returned', async () => {
        expect(lazy_cache_1.default(async () => 23, 0)()).resolves.toBe(23);
    });
    test('f is called once', async () => {
        const f = jest.fn().mockReturnValue(23);
        const cachedF = lazy_cache_1.default(f, 1000);
        await cachedF();
        await cachedF();
        expect(f).toHaveBeenCalledTimes(1);
    });
    test('f is called twice', async () => {
        const f = jest.fn().mockReturnValue(23);
        const cachedF = lazy_cache_1.default(f, 0);
        await cachedF();
        await cachedF();
        expect(f).toHaveBeenCalledTimes(2);
    });
    test('serves old cache while refreshing', async () => {
        const f = jest
            .fn()
            .mockReturnValueOnce(23)
            .mockReturnValueOnce(42);
        const cachedF = lazy_cache_1.default(f, 1000);
        expect(await cachedF()).toBe(23);
        await new Promise(resolve => setTimeout(resolve, 1000));
        expect(await cachedF()).toBe(23);
        expect(await cachedF()).toBe(42);
    });
    test('same parameters hit the same cache', async () => {
        const f = jest.fn().mockReturnValue(23);
        const cachedF = lazy_cache_1.default(f, 1000);
        await cachedF(234);
        await cachedF(234);
        expect(f).toHaveBeenCalledTimes(1);
    });
    test('different parameters dont hit the same cache', async () => {
        const f = jest.fn().mockReturnValue(23);
        const cachedF = lazy_cache_1.default(f, 1000);
        await cachedF(234);
        await cachedF(567);
        expect(f).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=lazy-cache.test.js.map