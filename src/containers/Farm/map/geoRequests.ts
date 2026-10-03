
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || (err as { name?: string })?.name === "AbortError") throw err;
      await sleep(1500 * 2 ** attempt);
    }
  }
}

/** react-query retry settings with the same back-off. */
export const QUERY_RETRY = { retry: 2, retryDelay: (attempt: number) => 1500 * 2 ** attempt } as const;

/** Runs at most `limit` tasks at a time; the rest wait their turn. */
export function createLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active += 1;
    queue.shift()!();
  };
  return function run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            next();
          });
      });
      next();
    });
  };
}
