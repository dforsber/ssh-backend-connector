export declare class CryptoWrapper {
    private key;
    private readonly algorithm;
    private salt;
    constructor(password: string, existingSalt?: string | null);
    destroy(): void;
    getSalt(): string;
    encrypt(text: string): string;
    decrypt(encryptedData: string): string;
}
//# sourceMappingURL=crypto-wrapper.d.ts.map