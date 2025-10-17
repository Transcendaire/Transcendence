"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabase = getDatabase;
exports.resetDatabase = resetDatabase;
var database_js_1 = require("./database.js");
var singleton = null;
function getDatabase() {
    if (!singleton)
        singleton = new database_js_1.DatabaseService();
    return singleton;
}
function resetDatabase() {
    singleton = null;
}
