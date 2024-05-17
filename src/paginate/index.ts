///<reference path="./custom.d.ts" />

import pagination from 'koa-pagination-v2'

export const paginate = ({
  defaultLimit = parseInt(process.env.DEFAULT_PAGE_LIMIT || '20'),
  maximumLimit = parseInt(process.env.MAX_PAGE_LIMIT || '50')
} = {}) => pagination({ defaultLimit, maximumLimit })