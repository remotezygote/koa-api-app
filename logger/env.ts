import camelCase from 'lodash.camelcase'

const options: { [key: string]: string } = {}

// load main pino options
if (process.env.PINO) {
  Object.assign(options, JSON.parse(process.env.PINO))
}

// load individual pino options
Object.keys(process.env).filter(key => key.startsWith('PINO_')).forEach(key => {
  const optionKey = camelCase(key.substr(5))
  const rawValue = `${process.env[key]}`
  let value
  try {
    value = JSON.parse(rawValue)
  }
  catch (err) {
    value = rawValue
  }
  options[optionKey] = value
})

export default options