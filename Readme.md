# Koa API App

Use this as the base for your API app. It's very simple:

```javascript
import app, {
  exposed,
  body,
  get,
  post,
  put,
  del,
  start,
} from "@remotezygote/koa-api-app"
import { ParameterizedContext } from "koa"

const getEnvironment = async (ctx: ParameterizedContext) => {}

const getCurrentUser = async (ctx: ParameterizedContext) => {
  const { user } = ctx.state

  ctx.body = user
  ctx.status = 200
}

exposed.get("/env", getEnvironment) // listen at /env with no authentication needed
get("/me", getCurrentUser) // listen at /me with authenication needed
put("/me", body(), updateUser) // update current user with authentication needed (also read the body)
```
