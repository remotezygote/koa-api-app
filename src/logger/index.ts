import { Logger, LoggerOptions, pino } from 'pino'
import options from './env.ts'

const prettyPrint = process.env.PINO_PRETTY === 'true' || process.env.PINO_PRETTY === undefined
const singleLine = process.env.PINO_SINGLE_LINE === 'true'
const extensions: LoggerOptions = prettyPrint ? {
		transport: {
			target: 'pino-pretty',
			options: {
				colorize: true,
				singleLine,
			}
		}
	} : {}

const logger: Logger = pino({
	...options,
	...extensions,
})

export default logger