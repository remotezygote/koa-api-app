type Mechanism = string | Function

const runMechanism = (mechanism: Mechanism, ctx: any, next: Function) => {
  if (typeof mechanism === 'function') {
    return mechanism(ctx, next)
  } else if (typeof mechanism === 'string') {
    return true
  } else if (typeof mechanism === 'object') {
    return true
  } else {
    return false
  }
}
export const security = (func: Function, mechanism: Mechanism) => {
  return async (ctx: any, next: Function) => {
    try {
      if(await runMechanism(mechanism, ctx, next)) {
        return await func(ctx, next)
      }
    } catch (err) {
      ctx.status
        ? ctx.status = 500
        : ctx.status = 500
      ctx.body = {
        message: (err as Error).message
      }
    }
  }
}
