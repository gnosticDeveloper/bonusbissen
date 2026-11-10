export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type SearchOptions = {
  search: string;
  page: number;
  size: number;
};

export type PagedRequestFunction<T> = (options: SearchOptions) => Promise<PagedResponse<T>>;
