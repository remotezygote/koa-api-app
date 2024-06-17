import './global.d.ts'
import Koa, { Context, Middleware } from 'koa'
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
import errorHandler from 'koa-better-error-handler'
import koa404Handler from 'koa-404-handler'

import { websocket, disableTimeout } from './sockets/index.ts'

import { addGracefulShutdownHook, getHealthContextHandler, shutdown } from '@neurocode.io/k8s-graceful-shutdown'

import logger from './logger/index.ts'
import { IncomingMessage, Server, ServerResponse } from 'http'

const loggerInstance = logger.child({ context: null })

const app = new Koa()
app.context.onerror = errorHandler
app.context.api = true
app.use(koa404Handler)

app.keys = process.env.APP_KEYS ? process.env.APP_KEYS.split(',') : ['asfsdfs87f6sd8f6sd8f67sdf876', 'sadf86sd8f6s8df6s8d76s87d6fg']

app.use(websocket())
app.use(disableTimeout)

app.use(responseTime())
	.use(etag())
	.use(session({
		key: 'o:sess',
	}))
	.use(cors())

export const router: Router = new Router()

export const get = router.get.bind(router)
export const put = router.put.bind(router)
export const post = router.post.bind(router)
export const patch = router.patch.bind(router)
export const del = router.delete.bind(router)

const exposedRouter: Router = new Router()

export const exposed = {
	get: exposedRouter.get.bind(exposedRouter),
	put: exposedRouter.put.bind(exposedRouter),
	post: exposedRouter.post.bind(exposedRouter),
	patch: exposedRouter.patch.bind(exposedRouter),
	del: exposedRouter.delete.bind(exposedRouter),
}

const healthyPacket = {
	status: 'pass'
}

const healthy = (ctx: Context) => {
	ctx.status = 200
	ctx.body = healthyPacket
}

const nothealthyPacket = {
	status: 'fail'
}

const notHealthy = (ctx: Context) => {
	ctx.status = 503
	ctx.body = nothealthyPacket
}

type HealthCheck = () => Promise<boolean>

const healthChecks: HealthCheck[] = []
export const addHealthCheck = (check: () => Promise<boolean>) => {
	healthChecks.push(check)
}

const checkHealth: HealthCheck = async () => {
	let healthy = true
	for (const check of healthChecks) {
		const ret = await check()
		if (!ret) {
			healthy = false
		}
	}
	return healthy
}

const healthCheck = getHealthContextHandler({ healthy, notHealthy, test: checkHealth })

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

interface StartOptions {
	afterAuthMiddlewares?: Array<Middleware>
}

export const start = async (port = process.env.PORT || 3000, { afterAuthMiddlewares = [] }: StartOptions) => {
	app
		.use(exposedRouter.routes())
		.use(exposedRouter.allowedMethods())
	
	if (process.env.BYPASS_AUTH !== 'true') {
		app.use(jwtMiddleware)
		afterAuthMiddlewares.forEach(middleware => app.use(middleware))
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

import { paginate } from './paginate/index.ts'
import { filter } from './filters/index.ts'

export { loggerInstance as logger, body, paginate, filter }

export default app