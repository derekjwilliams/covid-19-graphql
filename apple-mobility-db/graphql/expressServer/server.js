const pg = require('pg')
const express = require('express')
const { postgraphile } = require('postgraphile')
const ConnectionFilterPlugin = require('postgraphile-plugin-connection-filter')
const PostgisPlugin =  require("@graphile/postgis")
const PgConnectionFilterPostgisPlugin = require("postgraphile-plugin-connection-filter-postgis");
const { default: FederationPlugin } = require("@graphile/federation")
const rateLimit = require("express-rate-limit")
require('dotenv').config()
const app = express()

 
// Enable if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
// see https://expressjs.com/en/guide/behind-proxies.html
// app.set('trust proxy', 1);
 
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
 
//  apply to all requests
app.use(limiter);

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
      appendPlugins: [ConnectionFilterPlugin, PostgisPlugin.default, PgConnectionFilterPostgisPlugin, FederationPlugin],
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

const port = process.env.PORT || 5000
app.listen(port)
console.log(`🚀 Server ready at http://[host]:${port}/graphql`)
console.log(`🚀 Graphiql UI ready at http://[host]:${port}/graphiql`)
