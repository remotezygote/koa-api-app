import { Duplex } from 'stream'

import logger from '../logger/index.ts'

import websocket from 'koa-easy-ws'

export { websocket }

const websocketTimeout = process.env.WEBSOCKET_TIMEOUT || 30 * 60 * 1000

export const disableTimeout = async (ctx: any, next: any) => {
  if (ctx.ws) {
    ctx.log.debug('Setting timeout for websocket')
    ctx.request.socket.setTimeout(websocketTimeout)
  }
  await next()
}
export const clientErrorHandler = 
(error: Error, socket: Duplex) => {
		logger.debug(`Client error: ${error.message}`)
		logger.debug(error)
	}