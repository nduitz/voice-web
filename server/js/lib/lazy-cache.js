"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function lazyCache(f, timeMs) {
    const caches = {};
    return async (...args) => {
        const key = JSON.stringify(args);
        let cached = caches[key];
        if (cached) {
            const { at, promise, value } = cached;
            if (Date.now() - at < timeMs) {
                return value;
            }
            if (promise)
                return value || promise;
        }
        else {
            caches[key] = cached = {};
        }
        return (cached.promise = new Promise(async (resolve) => {
            const hasOldCache = cached && cached.value;
            if (hasOldCache)
                resolve(cached.value);
            Object.assign(cached, {
                at: Date.now(),
                value: await f(...args),
                promise: null,
            });
            if (!hasOldCache)
                resolve(cached.value);
        }));
    };
}
exports.default = lazyCache;
//# sourceMappingURL=lazy-cache.js.map