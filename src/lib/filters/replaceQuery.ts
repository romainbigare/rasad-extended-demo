import type { NextRouter } from "next/router";

/** Replaces run one after another, so each patch is built on the address the previous one left. */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Sets (a string) or removes (null) some query keys of the current page and leaves every other key as
 * the address bar has it right now - read when the patch runs, after the earlier patches have finished.
 * Several effects change the link in one go (the region and crop filter, the Farm Monitoring view, the
 * farm and field the page has read); each replacing the whole query from what it saw would undo the others.
 */
export function replaceQuery(router: NextRouter, patch: Record<string, string | null>): Promise<unknown> {
  queue = queue
    .catch(() => undefined)
    .then(() => {
      const params = new URLSearchParams(window.location.search);
      const before = params.toString();
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      if (params.toString() === before) return undefined;
      return router.replace({ pathname: router.pathname, query: Object.fromEntries(params.entries()) }, undefined, { shallow: true });
    });
  return queue;
}
