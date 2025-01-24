// src/crypto-wrapper.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
var CryptoWrapper = class {
  key;
  algorithm = "aes-256-gcm";
  constructor(props) {
    this.key = scryptSync(props.secretKey, props.salt, 32);
  }
  encrypt(text) {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
  }
  decrypt(encryptedData) {
    const [ivHex, encryptedHex, tagHex] = encryptedData.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
};
export {
  CryptoWrapper
};
