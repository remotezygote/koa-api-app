export const websocket = require('koa-easy-ws')

export const disableTimeout = async (ctx: any, next: any) => {
  if (ctx.ws) {
    ctx.request.socket.setTimeout(30 * 60 * 1000)
  }
  await next()
}