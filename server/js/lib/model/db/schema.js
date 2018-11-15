"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const DBMigrate = require('db-migrate');
const config_helper_1 = require("../../../config-helper");
class Schema {
    constructor(mysql) {
        this.mysql = mysql;
        this.name = mysql.getMysqlOptions().database;
    }
    /**
     * Make sure we have created the database, and are using it.
     */
    async ensureDatabase() {
        await this.mysql.rootQuery(`CREATE DATABASE IF NOT EXISTS ${this.name};
       USE ${this.name};`);
    }
    /**
     * Drop the current database.
     */
    async dropDatabase() {
        await this.mysql.rootQuery(`DROP DATABASE IF EXISTS ${this.name}`);
    }
    /**
     * Make sure we have the user privs set up.
     */
    async ensureDatabaseUser() {
        // Fetch the default username and password.
        const opts = this.mysql.getMysqlOptions();
        const username = opts.user;
        const password = opts.password;
        const host = opts.host;
        const database = opts.database;
        await this.mysql.rootTransaction(`GRANT SELECT, INSERT, UPDATE, DELETE
       ON ${database}.* TO '${username}'@'${host}'
       IDENTIFIED BY '${password}'; FLUSH PRIVILEGES;`);
        // Have the new user use the database.
        await this.mysql.query(`USE ${this.name};`);
    }
    /**
     * Make sure the database structure (DB, DB USER, TABLES) is configured.
     */
    async ensure() {
        await this.ensureDatabase();
        await this.ensureDatabaseUser();
    }
    async upgrade() {
        const { MYSQLDBNAME, MYSQLHOST, DB_ROOT_PASS, DB_ROOT_USER, VERSION, } = config_helper_1.getConfig();
        const dbMigrate = DBMigrate.getInstance(true, {
            config: {
                dev: {
                    driver: 'mysql',
                    database: MYSQLDBNAME,
                    host: MYSQLHOST,
                    password: DB_ROOT_PASS,
                    user: DB_ROOT_USER,
                    multipleStatements: true,
                },
            },
            cwd: path.isAbsolute(__dirname)
                ? __dirname
                : path.resolve(path.join('server', __dirname)),
        });
        console.log(VERSION
            ? 'Running migrations for version ' + VERSION
            : 'Running migrations');
        await (VERSION ? dbMigrate.sync(VERSION) : dbMigrate.up());
    }
}
exports.default = Schema;
//# sourceMappingURL=schema.js.map