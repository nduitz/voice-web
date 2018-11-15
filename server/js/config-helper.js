"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const DEFAULTS = {
    VERSION: null,
    RELEASE_VERSION: null,
    PROD: false,
    SERVER_PORT: 9000,
    DB_ROOT_USER: 'root',
    DB_ROOT_PASS: 'voice',
    MYSQLUSER: 'voicecommons',
    MYSQLPASS: 'voicecommons',
    MYSQLDBNAME: 'voiceweb',
    MYSQLHOST: 'localhost',
    MYSQLPORT: 3306,
    BUCKET_NAME: 'test-bucket-9e',
    BUCKET_LOCATION: 'eu-central-1',
    ENVIRONMENT: 'default',
    SECRET: 'TODO: Set a secure SECRET in config.json',
    ADMIN_EMAILS: '[]',
    S3_CONFIG: {
        signatureVersion: 'v4',
    },
    AUTH0: {
        DOMAIN: '',
        CLIENT_ID: '',
        CLIENT_SECRET: '',
    },
    IMPORT_SENTENCES: true,
};
let injectedConfig;
function injectConfig(config) {
    injectedConfig = Object.assign({}, DEFAULTS, config);
}
exports.injectConfig = injectConfig;
let loadedConfig;
function getConfig() {
    if (injectedConfig) {
        return injectedConfig;
    }
    if (loadedConfig) {
        return loadedConfig;
    }
    let config = null;
    try {
        let config_path = process.env.SERVER_CONFIG_PATH || './config.json';
        config = JSON.parse(fs.readFileSync(config_path, 'utf-8'));
    }
    catch (err) {
        console.log('could not load config.json, using defaults', err);
    }
    loadedConfig = Object.assign({}, DEFAULTS, config);
    return loadedConfig;
}
exports.getConfig = getConfig;
//# sourceMappingURL=config-helper.js.map
