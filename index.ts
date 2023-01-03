import Koa from 'koa'
import Router from '@koa/router'
import koaLogger from 'koa-pino-logger'
import pino from 'pino'
import cors from '@koa/cors'
import etag from 'koa-etag'
import responseTime from 'koa-response-time'
import session from 'koa-generic-session'
import jwt from 'koa-jwt'
import jwksRsa from 'jwks-rsa'
import body from 'koa-bodyparser'

import { addGracefulShutdownHook, getHealthContextHandler, shutdown } from '@neurocode.io/k8s-graceful-shutdown'

import logger from './logger'

export { logger, body }

const app = new Koa()

app.keys = process.env.APP_KEYS ? process.env.APP_KEYS.split(',') : ['asfsdfs87f6sd8f6sd8f67sdf876', 'sadf86sd8f6s8df6s8d76s87d6fg']
app.use(responseTime())
	.use(cors())
	.use(etag())
	.use(session({
		key: 'o:sess',
	}))

export const router = new Router()

export const get = (...args) => router.get(...args)
export const put = (...args) => router.put(...args)
export const post = (...args) => router.post(...args)
export const patch = (...args) => router.patch(...args)
export const del = (...args) => router.delete(...args)

const exposedRouter = new Router()

export const exposed = {
	get: (...args) => exposedRouter.get(...args),
	put: (...args) => exposedRouter.put(...args),
	post: (...args) => exposedRouter.post(...args),
	patch: (...args) => exposedRouter.patch(...args),
	del: (...args) => exposedRouter.delete(...args),
}

const healthy = ctx => {
	ctx.status = 200
	ctx.body = 'ok'
}

const notHealthy = ctx => {
	ctx.body = 'nope'
	ctx.status = 503
}

const healthCheck = getHealthContextHandler({ healthy, notHealthy })

exposed.get('/health', healthCheck)

const healthcheckLogLevel = process.env.HEALTHCHECK_LOG_LEVEL || 'debug'
const getDefaultLogLevel = () => process.env.PINO_LEVEL || process.env.LOG_LEVEL || 'info'
let defaultLogLevel = getDefaultLogLevel()

const setDebug = () => { defaultLogLevel = 'debug' }
const setDefault = () => { defaultLogLevel = getDefaultLogLevel() }
process.on('SIGUSR1', setDebug)
process.on('SIGUSR2', setDefault)

const chindingsSymbol = pino.symbols.chindingsSym
const customLogLevel = res => {
	if (res.log[chindingsSymbol].split(',"url":"')[1].replace(/\".+/, '') === '/health') {
		return healthcheckLogLevel
	}
	return defaultLogLevel
}

app.use(koaLogger({ logger, customLogLevel }))

const jwksHost = `https://ids.${process.env.DOMAIN}`
const audience = `https://api.${process.env.DOMAIN}`
const issuer = `https://ids.${process.env.DOMAIN}/`

const jwtMiddleware = jwt({
	secret: jwksRsa.koaJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `${jwksHost}/.well-known/jwks.json`
	}),
	audience,
	issuer,
	algorithms: ['RS256']
})

let server
const closeServers = () => {
	return new Promise(resolve => {
		server.close(resolve)
	})
}

const gracePeriodSec = 2 * 1000

export const stop = async () => {
	process.off('SIGUSR1', setDebug)
	process.off('SIGUSR2', setDefault)
	logger.info(`Stopping HTTP server`)
	await app.close()
}

export const start = async (port = process.env.PORT || 3000) => {
	app
		.use(exposedRouter.routes())
		.use(exposedRouter.allowedMethods())
		.use(jwtMiddleware)
		.use(router.routes())
		.use(router.allowedMethods())
	server = app.listen(port)
	server.addListener('close', () => logger.debug('HTTP server has shut down'))
	logger.info(`Started HTTP server on port ${port}`)

	app.close = shutdown(server)
	
	addGracefulShutdownHook(gracePeriodSec, closeServers)

	return stop
}

export default app