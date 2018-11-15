"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../lib/model/db/schema");
const server_harness_1 = require("./lib/server-harness");
let serverHarness;
let schema;
beforeAll(async () => {
    serverHarness = new server_harness_1.default();
    schema = new schema_1.default(serverHarness.mysql);
    await serverHarness.connectToDatabase();
});
beforeEach(async () => {
    await serverHarness.resetDatabase();
});
afterAll(() => {
    if (serverHarness) {
        serverHarness.done();
    }
});
test('migrations run without errors', () => {
    return expect(schema.upgrade()).resolves.toBeUndefined();
});
//# sourceMappingURL=schema-migration.test.js.map