type SortDirection = 'asc' | 'desc';

export type QueryParamsPost = {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
};
