"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Turn a callback function into a promise function.
 */
function run(context, method, args) {
    if (!Array.isArray(args)) {
        args = [args];
    }
    return new Promise((resolve, reject) => {
        method.apply(context, args.concat([
            (err, ...rest) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve.apply(null, rest);
            },
        ]));
    });
}
exports.default = run;
function map(context, method, items) {
    return Promise.all(items.map((item) => {
        return run(context, method, item);
    }));
}
exports.map = map;
//# sourceMappingURL=promisify.js.map