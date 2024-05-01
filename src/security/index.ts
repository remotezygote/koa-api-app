type Mechanism = string | Function

const runMechanism = (mechanism: Mechanism, ctx: any, next: Function) => {
  if (typeof mechanism === 'function') {
    const output = mechanism(ctx, next)
    return { output, success: output.success }
  } else if (typeof mechanism === 'string') {
    return {success: true, output: mechanism}
  } else if (typeof mechanism === 'object') {
    return {success: true, output: mechanism}
  } else {
    return {success: false, output: {}}
  }
}
export const security = (func: Function, mechanism: Mechanism) => {
  return async (ctx: any, next: Function) => {
    try {
      const { success, output } = await runMechanism(mechanism, ctx, next)
      const { status, body, message } = output
      if(success) {
        ctx.state.security = output
        return await func(ctx, next)
      }
      ctx.status = status || 403
      ctx.body = {
        message: message || 'Authorization not granted to resource.',
        ...body
      }
    } catch (err) {
      ctx.status = 500
      ctx.body = {
        message: (err as Error).message
      }
    }
  }
}
