import qs from 'qs'

import { Middleware } from 'koa'

export const filter = (options = {}) => {
  const parser: Middleware = async (ctx, next) => {
    if (ctx.request.method === 'GET') {
      ctx.state.filters = qs.parse(ctx.request.querystring, options)
    }

    await next()
  }
  return parser
}