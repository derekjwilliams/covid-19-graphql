const pg = require('pg')
const express = require('express')
const { postgraphile } = require('postgraphile')
const ConnectionFilterPlugin = require('postgraphile-plugin-connection-filter')
const PgManyToManyPlugin = require('@graphile-contrib/pg-many-to-many')
const { default: FederationPlugin } = require("@graphile/federation")
require('dotenv').config()
const app = express()

console.log(process.env.POSTGRES_DB)
console.log(process.env.POSTGRES_USER)
const pgPool = new pg.Pool({
  connectionString: (process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/covid'),
})

app.use(
  postgraphile(
    pgPool,
    process.env.SCHEMA_NAMES ? process.env.SCHEMA_NAMES.split(',') : ['apple_mobility'],
    {
      appendPlugins: [FederationPlugin,ConnectionFilterPlugin, PgManyToManyPlugin],
      graphileBuildOptions: {
        connectionFilterRelations: true,
      },
      watchPg: true,
      graphiql: true,
      enhanceGraphiql: true,
      dynamicJson: true,
      enableCors: true,
      allowExplain(req) {
        return true
      },
    }
  )
)

app.listen(process.env.PORT || 5000)
console.log(`🚀 Server ready at http://localhost:5000/graphql`)
console.log(`🚀 Graphiql UI ready at http://localhost:5000/graphiql`)
