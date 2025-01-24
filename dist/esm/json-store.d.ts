export declare class JSONStore {
    private data;
    private filePath;
    constructor(filePath: string);
    init(): Promise<void>;
    private loadStore;
    private saveStore;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
}
//# sourceMappingURL=json-store.d.ts.map