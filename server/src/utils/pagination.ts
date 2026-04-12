export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> extends PaginationMeta {
  data: T[];
}

export const getPaginationParams = (page = 1, limit = 10, maxLimit = 100): PaginationParams => {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(maxLimit, Math.max(1, Math.floor(Number(limit) || 10)));
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  };
};

export const buildPaginatedResult = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> => ({
  data,
  total,
  page,
  limit,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
