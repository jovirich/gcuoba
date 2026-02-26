import { toErrorResponse } from './api-error';

type RouteExecutor = () => Promise<Response>;

export async function withApiHandler(execute: RouteExecutor) {
  try {
    return await execute();
  } catch (error) {
    return toErrorResponse(error);
  }
}
