"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const pick = require("lodash.pick");
const db_1 = require("./db");
const mysql_1 = require("./db/mysql");
const db = mysql_1.getMySQLInstance();
async function updateLocales(clientId, locales) {
    const [savedLocales] = await db.query(`
      SELECT id, (SELECT name FROM locales WHERE id = locale_id) AS locale, accent
      FROM user_client_accents
      WHERE client_id = ?
      ORDER BY id
    `, [clientId]);
    let startAt = savedLocales.findIndex((savedLocale, i) => {
        const locale = locales[i];
        return (!locale ||
            savedLocale.locale !== locale.locale ||
            savedLocale.accent !== locale.accent);
    });
    if (startAt == -1) {
        if (locales.length <= savedLocales.length) {
            return;
        }
        startAt = savedLocales.length;
    }
    const deleteIds = savedLocales.slice(startAt).map(s => s.id);
    if (deleteIds.length > 0) {
        await db.query('DELETE FROM user_client_accents WHERE id IN (?)', [
            deleteIds,
        ]);
    }
    const newAccents = await Promise.all(locales
        .slice(startAt)
        .map(async (l) => [clientId, await db_1.getLocaleId(l.locale), l.accent]));
    if (newAccents.length > 0) {
        await db.query('INSERT INTO user_client_accents (client_id, locale_id, accent) VALUES ?', [newAccents]);
    }
}
const UserClient = {
    async findAllWithLocales({ client_id, email, }) {
        const [rows] = await db.query(`
        SELECT u.*, accents.accent, locales.name AS locale
        FROM user_clients u
        LEFT JOIN user_client_accents accents on u.client_id = accents.client_id
        LEFT JOIN locales on accents.locale_id = locales.id
        WHERE (u.client_id = ? OR email = ?) AND sso_id IS NULL
      `, [client_id || null, email || null]);
        return Object.values(rows.reduce((obj, row) => {
            const client = obj[row.client_id];
            obj[row.client_id] = Object.assign({}, pick(row, 'client_id', 'accent', 'age', 'gender'), { locales: (client ? client.locales : []).concat(row.accent ? { accent: row.accent, locale: row.locale } : []) });
            return obj;
        }, {}));
    },
    async findAccount(sso_id) {
        const [rows] = await db.query(`
        SELECT DISTINCT
          u.*,
          accents.accent,
          locales.name AS locale,
          COUNT(DISTINCT clips.id) AS clips_count,
          COUNT(DISTINCT votes.id) AS votes_count
        FROM user_clients u
        LEFT JOIN user_client_accents accents on u.client_id = accents.client_id
        LEFT JOIN locales on accents.locale_id = locales.id
        LEFT JOIN clips on u.client_id = clips.client_id
        LEFT JOIN votes on u.client_id = votes.client_id
        WHERE u.sso_id = ?
        GROUP BY u.client_id, accents.id
        ORDER BY accents.id ASC
      `, [sso_id]);
        return rows.length == 0
            ? null
            : rows.reduce((client, row) => (Object.assign({}, pick(row, 'accent', 'age', 'email', 'gender', 'username', 'basket_token', 'skip_submission_feedback', 'visible', 'avatar_url', 'clips_count', 'votes_count'), { locales: client.locales.concat(typeof row.accent == 'string'
                    ? { accent: row.accent, locale: row.locale }
                    : []) })), { locales: [] });
    },
    async saveAccount(sso_id, _a) {
        var { client_id, email, locales } = _a, data = __rest(_a, ["client_id", "email", "locales"]);
        const [[[account]], [clients]] = await Promise.all([
            db.query('SELECT client_id FROM user_clients WHERE sso_id = ?', [sso_id]),
            email
                ? db.query('SELECT client_id FROM user_clients WHERE email = ?', [
                    email,
                ])
                : [],
        ]);
        const accountClientId = account ? account.client_id : client_id;
        const clientIds = clients.map((c) => c.client_id).concat(client_id);
        const userData = await Promise.all(Object.entries(Object.assign({ sso_id,
            email }, pick(data, 'age', 'gender', 'username', 'skip_submission_feedback', 'visible'))).map(async ([key, value]) => key + ' = ' + (await db.escape(value))));
        await db.query(`
        UPDATE user_clients
        SET ${userData.join(', ')}
        WHERE client_id = ?
      `, [accountClientId]);
        await Promise.all([
            db.query('UPDATE IGNORE clips SET client_id = ? WHERE client_id IN (?)', [
                accountClientId,
                clientIds,
            ]),
            db.query('UPDATE IGNORE votes SET client_id = ? WHERE client_id IN (?)', [
                accountClientId,
                clientIds,
            ]),
            locales && updateLocales(accountClientId, locales),
        ]);
        return UserClient.findAccount(sso_id);
    },
    async save({ client_id, email, age, gender }) {
        const [[row]] = await db.query('SELECT sso_id FROM user_clients WHERE client_id = ?', [client_id]);
        if (row && row.sso_id)
            return false;
        if (row) {
            await db.query(`
        UPDATE user_clients SET email  = ?, age  = ?, gender = ? WHERE client_id = ?
      `, [email, age, gender, client_id]);
        }
        else {
            await db.query(`
        INSERT INTO user_clients (client_id, email, age, gender) VALUES (?, ?, ?, ?)
      `, [client_id, email, age, gender]);
        }
    },
    async updateBasketToken(email, basketToken) {
        await db.query('UPDATE user_clients SET basket_token = ? WHERE email = ?', [
            basketToken,
            email,
        ]);
    },
    async updateSSO(old_sso_id, new_sso_id, email) {
        await db.query('UPDATE user_clients SET sso_id = ?, email = ? WHERE sso_id = ?', [new_sso_id, email, old_sso_id]);
    },
    async updateAvatarURL(sso_id, url) {
        await db.query('UPDATE user_clients SET avatar_url = ? WHERE sso_id = ?', [
            url,
            sso_id,
        ]);
    },
    async hasSSO(client_id) {
        return Boolean((await db.query('SELECT 1 FROM user_clients WHERE client_id = ? AND sso_id IS NOT NULL', [client_id]))[0][0]);
    },
    async findClientId(sso_id) {
        const [[row]] = await db.query('SELECT client_id FROM user_clients WHERE sso_id = ?', [sso_id]);
        return row ? row.client_id : null;
    },
};
exports.default = UserClient;
//# sourceMappingURL=user-client.js.map