import { Duplex } from 'stream'

export const websocket = require('koa-easy-ws')

export const socketErrorHandler = (error: Error, socket: Duplex) => {
  console.error(`client error:`, error)
}
