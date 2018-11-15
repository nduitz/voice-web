"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Generate RFC4122 compliant globally unique identifier.
 */
function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0, v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
exports.generateGUID = generateGUID;
//# sourceMappingURL=utility.js.map