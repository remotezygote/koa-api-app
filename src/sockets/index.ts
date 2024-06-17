import { ParameterizedContext, Next } from 'koa'
import { Duplex } from 'stream'

export const websocket = require('koa-easy-ws')

export const socketIgnoreTimeout = async (ctx: ParameterizedContext, next: Next) => {
	if (ctx.ws){
    // @ts-ignore
		ctx.req.socket.ignoreTimeout = true
	} else {
		return await next()
	}
}

export const socketErrorHandler = (error: Error, socket: Duplex) => {
    // @ts-ignore
  if(error.code === 'ERR_HTTP_REQUEST_TIMEOUT' && socket.ignoreTimeout) {
    return
  }

  console.warn(`client error:`, error)
  socket.destroy()
}
	


