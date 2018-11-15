"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = async function (db) {
    return db.runSql(`
      CREATE TABLE user_client_activities (
        id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        client_id CHAR(36) NOT NULL,
        locale_id SMALLINT UNSIGNED NOT NULL,
        created_at DATETIME DEFAULT now(),
        CONSTRAINT uca_ibfk_1 FOREIGN KEY (client_id) REFERENCES user_clients (client_id),
        CONSTRAINT uca_ibfk_2 FOREIGN KEY (locale_id) REFERENCES locales (id),
        INDEX created_at_idx (created_at)
      );
    `);
};
exports.down = function () {
    return null;
};
//# sourceMappingURL=20180907112935-user-client-activities.js.map