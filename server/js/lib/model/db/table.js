"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Base object for dealing with data in MySQL table.
 */
class Table {
    constructor(name, mysql) {
        this.name = name;
        this.mysql = mysql;
    }
    getName() {
        return this.name;
    }
    /**
     * Get the count of rows currently in this table.
     */
    async getCount() {
        const [rows, fields] = await this.mysql.query(`SELECT COUNT(*) AS count FROM ${this.getName()}`);
        return rows ? rows[0].count : 0;
    }
    async update(fields) {
        const [columns, values] = Object.entries(fields).reduce(([columns, values], [column, value]) => [
            columns.concat(column),
            values.concat(typeof value == 'boolean' ? Number(value) : value),
        ], [[], []]);
        await this.mysql.upsert(this.getName(), columns, values);
    }
}
exports.default = Table;
//# sourceMappingURL=table.js.map