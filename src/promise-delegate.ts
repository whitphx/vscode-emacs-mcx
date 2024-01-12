export class PromiseDelegate<T> {
  private _promise: Promise<T>;
  // @ts-expect-error -- This will be initialized in the promise initializer function which will be called immediately in the constructor.
  private resolve: (value: T | PromiseLike<T>) => void;
  // @ts-expect-error -- This will be initialized in the promise initializer function which will be called immediately in the constructor.
  private reject: (reason?: unknown) => void;

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  public get promise(): Promise<T> {
    return this._promise;
  }

  public resolvePromise(value: T | PromiseLike<T>): void {
    this.resolve(value);
  }

  public rejectPromise(reason?: unknown): void {
    this.reject(reason);
  }
}
