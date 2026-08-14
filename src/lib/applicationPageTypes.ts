import type {
  ApplicationView,
} from "../types";

export interface B2BApplicationPage {
  items: ApplicationView[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
