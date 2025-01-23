export default class Store<T> {
  private store = new Map<string, any>();

  get(key: string): any {
    return this.store.get(key);
  }

  set(key: string, value: any): void {
    this.store.set(key, value);
  }
}
