"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const request = require("request-promise-native");
const schema_1 = require("../lib/model/db/schema");
const server_harness_1 = require("./lib/server-harness");
const config_helper_1 = require("../config-helper");
let serverHarness;
let schema;
beforeAll(async () => {
    serverHarness = new server_harness_1.default();
    schema = new schema_1.default(serverHarness.mysql);
    await serverHarness.run();
});
beforeEach(async () => {
    await serverHarness.emptyDatabase();
});
afterAll(async () => {
    if (serverHarness) {
        await serverHarness.resetDatabase();
        serverHarness.done();
    }
});
// For Travis tests on PRs, we don't have AWS credentials,
// so we will skip this S3 upload test in this case.
/*(AWS.getS3().config.credentials ? test : test.skip)*/
/**
 * With the way locales are being imported with the sentences,
 * this has become very hard to test realistically
 */
test.skip('recording is uploaded and inserted into the db', async () => {
    expect(await serverHarness.getClipCount()).toBe(0);
    const sentence = 'Wubba lubba dub dub!';
    await request({
        uri: `http://localhost:${config_helper_1.getConfig().SERVER_PORT}/api/v1/en/clips`,
        method: 'POST',
        headers: {
            'Content-Type': 'audio/ogg; codecs=opus4',
            client_id: 'wat',
            sentence: encodeURIComponent(sentence),
        },
        body: fs.createReadStream(path.join(__dirname, 'test.ogg')),
    });
    expect(await serverHarness.getClipCount()).toBe(1);
});
//# sourceMappingURL=upload-recording.test.js.map