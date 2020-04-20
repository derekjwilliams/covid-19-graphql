# covid-19-graphql
Simple postgraphile based graphql API based on the data from Johns Hopkins, see https://github.com/CSSEGISandData/COVID-19.git

In addition, additional data will be available, e.g. mobility data from Apple and Google

## Note 

The database is stored in the postgres Docker container, 
so to start fresh delete that container first, otherwise the init scripts will not run

## Postgraphile Plugins Used (installed globally for now)

Connection Filter

https://github.com/graphile-contrib/postgraphile-plugin-connection-filter

https://www.npmjs.com/package/postgraphile-plugin-connection-filter

Postgis

https://github.com/graphile/postgis

https://www.npmjs.com/package/@graphile/postgis

Postgis Filter

https://github.com/graphile-contrib/postgraphile-plugin-connection-filter-postgis

https://www.npmjs.com/package/postgraphile-plugin-connection-filter-postgis

## Example Queries

Getting case counts in the US

```{
  allLocations(filter: { iso3: { equalTo: "USA" } }) {
    nodes {
      centroid {
        geojson
        srid
        x
        y
      }
      fips
      admin2
      iso3
      code3
      combinedKey
      caseCountsByLocationId(filter: { time: { equalTo: "2020-04-06" } }) {
        nodes {
          count
        }
      }
    }
  }
}

```

## Mobility Data

### Apple

See https://www.apple.com/covid19/mobility. The data-loaders/example-data folder contains the schema for the apple data

### Google

See https://github.com/pastelsky/covid-19-mobility-tracker. Todo, create schema for this data

### Data Loader Code

See code in data-loaders/process-data

### Running the GraphQL Dockers

There are four Dockerfiles that can be used to run the graphql services, located in the following directories

* graphql (Johns Hopkins GraphQL service with deaths, recoveries, and confirmed cases by location and date)

* apple-mobility (Apple Mobility data, )

* google-mobility

* federation

These first three also contain db folders with init scripts that can be used to run Postgres Dockers, but more typically can be used to populate the covid database.  

To access the local database the pg_hba.conf and postgresql.conf files will need to be updated. To find the correct location of these files you can as postgresql using the psq command:

```
psql -U postgres -c 'SHOW config_file'
psql -U postgres -c 'SHOW SHOW hba_file'
```

The entries that need to be changed are `listen_addresses` in postgresql.conf and `host` entry in pg_hba.conf, for example:

```
listen_addresses='*' #only for dev, narrow this for production
```

and

```
host covid postgres 10.0.1.146/16 trust # Allowing docker container connections to host db
```

In production one would use a dedicated database service, for example an RDS database (in AWS), a Postgresql database in Heroku, or Azure Postgresql.

## Features List

- [x] Database Schemas (compatible with TimescaleDB)
- [x] GraphQL Service (Node/Express/Apollo)
- [ ] OpenAPI 3 Service (Haskell)
- [x] Docker File for GraphQL Service
- [x] Docker Compose File
- [x] Data Loader for US Locations
- [ ] Data Loader for Global Locations
- [x] Data Loader for US Data 
- [ ] Data Loader for Global Data
- [ ] Automatic Incremental Loading of New Data from GitHub (e.g. WHO, JohnsHopkins, Apple Mobility Services)
- [ ] Apollo Federation to Provide Unified Service (e.g. WHO, JohnsHopkins, Apple Mobility Services)
- [ ] TimeScale DB (Timescaledb Postgres 12 Support is in prerelease, use Postgresql 11 in Docker for now)
- [x] Apple Mobility Schema
- [ ] Reference D3 Crossfilter Application
- [ ] Reference React Application






