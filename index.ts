import Koa, { Context } from 'koa'
import Router from '@koa/router'
import koaLogger from 'koa-pino-logger'
import pino, { LevelWithSilent, Level } from 'pino'
import cors from '@koa/cors'
import etag from 'koa-etag'
import responseTime from 'koa-response-time'
import session from 'koa-generic-session'
import jwt from 'koa-jwt'
import jwksRsa from 'jwks-rsa'
import bodyParser from 'koa-bodyparser'

import { addGracefulShutdownHook, getHealthContextHandler, shutdown } from '@neurocode.io/k8s-graceful-shutdown'

import logger from './logger'
import { IncomingMessage, Server, ServerResponse } from 'http'

const loggerInstance = logger.child({ context: null })

const app = new Koa()

app.keys = process.env.APP_KEYS ? process.env.APP_KEYS.split(',') : ['asfsdfs87f6sd8f6sd8f67sdf876', 'sadf86sd8f6s8df6s8d76s87d6fg']
app.use(responseTime())
	.use(cors())
	.use(etag())
	.use(session({
		key: 'o:sess',
	}))

export const router = new Router()

export const get = router.get
export const put = router.put
export const post = router.post
export const patch = router.patch
export const del = router.delete

const exposedRouter = new Router()

export const exposed = {
	get: exposedRouter.get,
	put: exposedRouter.put,
	post: exposedRouter.post,
	patch: exposedRouter.patch,
	del: exposedRouter.delete,
}

const healthy = (ctx: Context) => {
	ctx.status = 200
	ctx.body = 'ok'
}

const notHealthy = (ctx: Context) => {
	ctx.body = 'nope'
	ctx.status = 503
}

const healthCheck = getHealthContextHandler({ healthy, notHealthy })

exposed.get('/health', healthCheck)

const healthcheckLogLevel: Level = process.env.HEALTHCHECK_LOG_LEVEL as Level || 'debug'
const getDefaultLogLevel: () => Level = () => process.env.PINO_LEVEL as Level || process.env.LOG_LEVEL || 'info'
let defaultLogLevel = getDefaultLogLevel()

const setDebug = () => { defaultLogLevel = 'debug' }
const setDefault = () => { defaultLogLevel = getDefaultLogLevel() }
process.on('SIGUSR1', setDebug)
process.on('SIGUSR2', setDefault)

const chindingsSymbol = pino.symbols.chindingsSym
const customLogLevel = (res: ServerResponse<IncomingMessage>) => {
	// @ts-ignore
	if (res.log[chindingsSymbol].split(',"url":"')[1].replace(/\".+/, '') === '/health') {
		return healthcheckLogLevel
	}
	return defaultLogLevel as LevelWithSilent
}

const usedLogger = koaLogger({ logger, customLogLevel })
app.use(usedLogger)

const jwksHost = process.env.AUTH_JWKS_HOST || `https://ids.${process.env.DOMAIN}`
const audience = process.env.AUTH_AUDIENCE || `https://api.${process.env.DOMAIN}`
const issuer = process.env.AUTH_ISSUER_HOST || process.env.AUTH_JWKS_HOST || `https://ids.${process.env.DOMAIN}/`

loggerInstance.debug(`Using jwksHost: ${jwksHost}`)
loggerInstance.debug(`Using audience: ${audience}`)
loggerInstance.debug(`Using issuer: ${issuer}`)

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

let server: Server
const closeServers = () => {
	return new Promise(resolve => {
		server.close(resolve)
	})
}

const gracePeriodSec = 2 * 1000

let close: Function
export const stop = async () => {
	process.off('SIGUSR1', setDebug)
	process.off('SIGUSR2', setDefault)
	logger.info(`Stopping HTTP server`)
	await close()
}

export const start = async (port = process.env.PORT || 3000) => {
	app
		.use(exposedRouter.routes())
		.use(exposedRouter.allowedMethods())
  
  if (process.env.BYPASS_AUTH !== 'true') {
		app.use(jwtMiddleware)
  }
	
  app
    .use(router.routes())
		.use(router.allowedMethods())
	
  server = app.listen(port)
	server.addListener('close', () => logger.debug('HTTP server has shut down'))
	logger.info(`Started HTTP server on port ${port}`)

	close = shutdown(server)
	
	addGracefulShutdownHook(gracePeriodSec, closeServers)

	return stop
}
const body = () => bodyParser()

export { loggerInstance as logger, body }

export default app