"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const table_1 = require("../table");
/**
 * Handles transactions with the user table.
 */
class UserTable extends table_1.default {
    constructor(mysql) {
        super('users', mysql);
    }
    /**
     * Update and Insert user record.
     */
    async update(fields) {
        await super.update(fields);
        const [[user]] = await this.mysql.query(`SELECT * FROM ${this.getName()} WHERE email = ?`, [fields.email]);
        console.log('DB --', 'User', JSON.stringify(user, null, 2));
    }
}
exports.UserTable = UserTable;
//# sourceMappingURL=user-table.js.map