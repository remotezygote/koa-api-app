const pino = require('pino')
import options from './env.ts'

const prettyPrint = process.env.PINO_PRETTY === 'true' || process.env.PINO_PRETTY === undefined
const singleLine = process.env.PINO_SINGLE_LINE === 'true'

const logger = pino({
	...options,
	...(prettyPrint ? {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				singleLine,
			}
		}
	} : {}),
})

export default logger