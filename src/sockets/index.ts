export const websocket = require('koa-easy-ws')

const websocketTimeout = 30 * 60 * 1000
export const disableTimeout = async (ctx: any, next: any) => {
  if (ctx.ws) {
    ctx.log.info('Setting timeout for websocket')
    ctx.request.socket.setTimeout(websocketTimeout)
  }
  await next()
}