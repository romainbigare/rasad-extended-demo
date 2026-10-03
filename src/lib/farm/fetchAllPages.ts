import { rbacRequest } from "@shared/network/rbacRequest";

const PAGE_SIZE = 1000;
/** Safety stop: 200 pages = 200,000 rows. */
const MAX_PAGES = 200;

export async function fetchAllPages<T>(url: string, params: Record<string, string | number> = {}): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await rbacRequest<T[]>(
      url,
      "GET",
      undefined,
      { params: { ...params, limit: PAGE_SIZE, offset: page * PAGE_SIZE } },
      { silent: true },
    );
    rows.push(...result.data);
    if (result.data.length < PAGE_SIZE) break;
  }
  return rows;
}
