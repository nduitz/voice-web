"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const md5 = require('js-md5');
const DEFAULT_SALT = '8shd9fg3oi0fj';
/**
 * Hash the string.
 */
function hash(str, salt) {
    return md5(str + (salt || DEFAULT_SALT));
}
exports.hash = hash;
/**
 * Get elapsed seconds from timestamp.
 */
function getElapsedSeconds(timestamp) {
    return Math.round((Date.now() - timestamp) / 1000);
}
exports.getElapsedSeconds = getElapsedSeconds;
/**
 * Returns the first defined argument. Returns null if there are no defined
 * arguments.
 */
function getFirstDefined(...options) {
    for (let i = 0; i < options.length; i++) {
        if (options[i] !== undefined) {
            return options[i];
        }
    }
    return null;
}
exports.getFirstDefined = getFirstDefined;
class APIError extends Error {
    constructor(message) {
        // 'Error' breaks prototype chain here
        super(message);
        // restore prototype chain
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
            Object.setPrototypeOf(this, actualProto);
        }
        else {
            this.__proto__ = new.target.prototype;
        }
    }
}
exports.APIError = APIError;
class ServerError extends APIError {
}
exports.ServerError = ServerError;
class ClientError extends APIError {
}
exports.ClientError = ClientError;
class ClientParameterError extends ClientError {
    constructor() {
        super('Invalid Parameters');
    }
}
exports.ClientParameterError = ClientParameterError;
//# sourceMappingURL=utility.js.map