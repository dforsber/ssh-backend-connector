export declare class JSONStore {
    private data;
    private filePath;
    private readonly maxFileSizeBytes;
    private static readonly DEFAULT_MAX_FILE_SIZE;
    constructor(filePath: string, maxFileSizeBytes?: number);
    init(): Promise<void>;
    private verifyFilePermissions;
    private loadStore;
    private saveStore;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
}
//# sourceMappingURL=json-store.d.ts.map