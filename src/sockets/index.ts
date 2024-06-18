import { Duplex } from 'stream'

import logger from '../logger/index.ts'

export const websocket = require('koa-easy-ws')

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