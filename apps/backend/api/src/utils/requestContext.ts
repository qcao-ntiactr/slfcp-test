import { AsyncLocalStorage } from 'async_hooks';

import { Request } from 'express';

const asyncLocalStorage = new AsyncLocalStorage<Request>();

export const requestContext = {
  run: <T>(req: Request, fn: () => T) => asyncLocalStorage.run(req, fn),
  get: (): Request | undefined => asyncLocalStorage.getStore(),
};
