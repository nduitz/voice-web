"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const locales = require('locales/all.json');
const mysql_1 = require("./mysql");
const db = mysql_1.getMySQLInstance();
async function importLocales() {
    await db.query('INSERT IGNORE INTO locales (name) VALUES ?', [
        locales.map(l => [l]),
    ]);
}
exports.importLocales = importLocales;
//# sourceMappingURL=import-locales.js.map