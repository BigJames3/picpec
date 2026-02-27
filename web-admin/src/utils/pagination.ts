/**
 * Normalisation des réponses paginées API
 * Accepte les formats { data, meta } et { data, total, page, limit }
 * Retourne toujours un format unifié
 */

export interface NormalizedPagination<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Format nouveau (backend NestJS) */
interface MetaFormat {
  data: unknown[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Format ancien (legacy) */
interface LegacyFormat {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

type PaginationResponse<T> = (MetaFormat | LegacyFormat) & { data: T[] };

/**
 * Normalise une réponse paginée API vers un format unifié.
 * Compatible avec les deux formats (meta et legacy).
 */
export function normalizePaginationResponse<T>(
  response: PaginationResponse<T> | null | undefined
): NormalizedPagination<T> {
  if (!response) {
    return { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
  }

  const data = response.data ?? [];

  if ('meta' in response && response.meta) {
    const { meta } = response;
    return {
      data: data as T[],
      total: meta.total ?? 0,
      page: meta.page ?? 1,
      limit: meta.limit ?? 10,
      totalPages: meta.totalPages ?? Math.ceil((meta.total ?? 0) / (meta.limit ?? 10)),
    };
  }

  const total = (response as LegacyFormat).total ?? 0;
  const page = (response as LegacyFormat).page ?? 1;
  const limit = (response as LegacyFormat).limit ?? 10;

  return {
    data: data as T[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
