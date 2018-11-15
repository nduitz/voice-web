"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_helper_1 = require("../../config-helper");
/**
 * Server testing harness.
 */
class ApiHarness {
    constructor(config) {
        this.config = config ? config : config_helper_1.getConfig();
    }
    getDomain() {
        return `http://localhost:${this.config.SERVER_PORT}`;
    }
    async fetchIndex() {
        return fetch(this.getDomain());
    }
    /**
     * Return promise that resolves when server is ready.
     */
    ready() {
        return new Promise((res, rej) => {
            // We will poll the server until it is ready.
            let handle = setInterval(async () => {
                try {
                    const response = await this.fetchIndex();
                    if (response && response.status === 200) {
                        clearInterval(handle);
                        handle = null;
                        res();
                    }
                }
                catch (err) {
                    console.error('got error polling index', err);
                }
            }, ApiHarness.SERVER_POLL_INTERVAL);
            setTimeout(() => {
                if (handle) {
                    clearInterval(handle);
                    rej('server timeout');
                }
            }, ApiHarness.READY_TIMEOUT);
        });
    }
}
ApiHarness.READY_TIMEOUT = 1000;
ApiHarness.SERVER_POLL_INTERVAL = 500;
exports.default = ApiHarness;
//# sourceMappingURL=api-harness.js.map