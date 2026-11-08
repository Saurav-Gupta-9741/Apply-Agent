/** Node 20 (the CI runner) lacks Promise.withResolvers, which pdf.js uses to read resumes; Chrome has had it since
 * 119 and Node since 22. Added for the TEST environment only: the extension itself runs in Chrome. */
const P = Promise as PromiseConstructor & { withResolvers?: <T>() => { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } };
if (typeof P.withResolvers !== "function") {
  P.withResolvers = <T>() => {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}
