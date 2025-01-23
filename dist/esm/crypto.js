import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
const ALGORITHM = "aes-256-gcm";
const SALT = "your-salt-value-here";
// Generate a 32 byte (256 bit) key using scrypt
const KEY = scryptSync("your-secret-key", SALT, 32);
export function encrypt(text) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}
export function decrypt(encryptedData) {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
