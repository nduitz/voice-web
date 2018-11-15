"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
const config_helper_1 = require("../config-helper");
const RandomName = require('node-random-name');
const NAME = 'voice';
const LEVEL_LOG = 'log';
const LEVEL_ERROR = 'error';
class Logger {
    constructor() {
        this.name = NAME;
        this.nickname = RandomName({ last: true });
        this.hostname = os.hostname();
        this.pid = process.pid;
        this.boundLog = null;
        this.boundError = null;
    }
    getDateString() {
        return new Date().toISOString();
    }
    getMessageFields(level, msg) {
        return {
            msg: msg,
            name: this.name,
            nickname: this.nickname,
            level: level,
            hostname: this.hostname,
            pid: this.pid,
            time: this.getDateString(),
            release_version: config_helper_1.getConfig().RELEASE_VERSION,
        };
    }
    printFields(fields) {
        if (!this.boundLog) {
            console.error('unable to print without overriding console');
            return;
        }
        let output = JSON.stringify(fields);
        if (fields.level === LEVEL_LOG) {
            this.boundLog(output);
        }
        else if (fields.level === LEVEL_ERROR) {
            this.boundError(output);
        }
    }
    log(...args) {
        this.printFields(this.getMessageFields(LEVEL_LOG, args.join(', ')));
    }
    error(...args) {
        this.printFields(this.getMessageFields(LEVEL_ERROR, args.join(', ')));
    }
    overrideConsole() {
        if (this.boundLog) {
            this.error('already overrode console');
            return;
        }
        // Override console.log to user our json logger.
        this.boundLog = console.log.bind(console);
        console.log = (...args) => {
            this.log(...args);
        };
        // Override console.error to user our json logger.
        this.boundError = console.error.bind(console);
        console.error = (...args) => {
            this.error(...args);
        };
    }
}
exports.default = Logger;
//# sourceMappingURL=logger.js.map