///<reference path="./custom.d.ts" />

import pagination from 'koa-pagination-v2'

export const paginate = ({
  defaultLimit = process.env.DEFAULT_PAGE_LIMIT || 20,
  maximumLimit = process.env.MAX_PAGE_LIMIT || 50
}) => pagination({ defaultLimit, maximumLimit })