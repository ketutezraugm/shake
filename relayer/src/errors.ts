import type { ContentfulStatusCode } from "hono/utils/http-status";

/** An error the caller caused and can read: the app turns it into `{error}` with this status. */
export class HttpError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message);
  }
}
