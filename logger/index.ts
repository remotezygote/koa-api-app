import pino from 'pino'
import options from './env'

const logger = pino({
	...options,
	transport: {
		target: 'pino-pretty',
		options: {
			colorize: true,
		},
	},
})

export default logger