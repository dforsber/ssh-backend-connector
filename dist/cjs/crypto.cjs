"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const node_crypto_1 = require("node:crypto");
const ALGORITHM = "aes-256-gcm";
const SALT = "your-salt-value-here";
// Generate a 32 byte (256 bit) key using scrypt
const KEY = (0, node_crypto_1.scryptSync)("your-secret-key", SALT, 32);
function encrypt(text) {
    const iv = (0, node_crypto_1.randomBytes)(16);
    const cipher = (0, node_crypto_1.createCipheriv)(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}
function decrypt(encryptedData) {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = (0, node_crypto_1.createDecipheriv)(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
