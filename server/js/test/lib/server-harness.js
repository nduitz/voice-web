"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_helper_1 = require("../../config-helper");
const server_1 = require("../../server");
const DB_PREFIX = 'test_';
/**
 * Server testing harness.
 */
class ServerHarness {
    constructor() {
        const config = config_helper_1.getConfig();
        // Use a different database name then default for tests.
        config.MYSQLDBNAME =
            DB_PREFIX +
                config.MYSQLDBNAME +
                '_' +
                Math.random()
                    .toString(36)
                    .substring(7);
        config_helper_1.injectConfig(config);
        this.server = new server_1.default({ bundleCrossLocaleMessages: false });
    }
    get mysql() {
        return this.server.model.db.mysql;
    }
    /**
     * We are finished with this harness, clean it up.
     */
    done() {
        this.server.kill();
    }
    /**
     * Start the web server.
     */
    run() {
        return this.server.run({ doImport: false });
    }
    /**
     * Make sure we are able to connect to the database.
     */
    async connectToDatabase() {
        return this.mysql.ensureRootConnection();
    }
    /**
     * Reset the database to initial factory settings.
     */
    async resetDatabase() {
        return this.server.resetDatabase();
    }
    emptyDatabase() {
        return this.server.emptyDatabase();
    }
    async getClipCount() {
        return this.server.model.db.getClipCount();
    }
}
exports.default = ServerHarness;
//# sourceMappingURL=server-harness.js.map