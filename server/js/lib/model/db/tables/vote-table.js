"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const table_1 = require("../table");
class VoteTable extends table_1.default {
    constructor(mysql) {
        super('votes', mysql);
    }
}
exports.default = VoteTable;
//# sourceMappingURL=vote-table.js.map