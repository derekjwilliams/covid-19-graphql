# covid-19-graphql

Simple Postgraphile based graphQL API based on the data from Johns Hopkins, see https://github.com/CSSEGISandData/COVID-19.git

Mobility data services based on the mobility data from Apple is also provided, and Google and Fitbit data soon.

A simple federation service (Apollo Federation) is provided to connect these three services together, allowing the client to query for both Johns Hopkins case counts and mobility information for a set of locations in one graphql query.


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

### Case Counts for the first 10 locations in the US on April 7

```graphql
{
  allLocations(first 10 filter: { iso3: { equalTo: "USA" } }) {
    nodes {
      centroid {
        srid
        x
        y
      }
      fips
      admin2
      iso3
      code3
      combinedKey
      caseCountsByLocationId(filter: { time: { equalTo: "2020-04-07T00:00Z" } }) {
        nodes {
          count
        }
      }
    }
  }
}

```

### Deaths in Larimer and Multnomah counties between April 9 (inclusive) and April 17 (exclusive)

```graphql
{
  allLocations(
    filter: {
      or: [
        { admin2: { includes: "Multnomah" } }
        { admin2: { includes: "Larimer" } }
      ]
    }
  ) {
    nodes {
      code3
      admin2
      countryRegion
      provinceState
      combinedKey
      deathCountsByLocationId(
        orderBy: TIME_ASC
        filter: {
          and: [
            { time: { greaterThan: "2020-04-09T00:00Z" } }
            { time: { lessThanOrEqualTo: "2020-04-18T00:00Z" } }
          ]
        }
      ) {
        nodes {
          time
          count
        }
      }
    }
  }
}
```

### Order by Population

```graphql
{
  allLocations(
    first:10
    orderBy:POPULATION_DESC
  ) {
    nodes {
      iso2
      iso3
      code3
      admin2
      population
      centroid {
        srid
        x
        y
      }
      countryRegion
      provinceState
      combinedKey
      deathCountsByLocationId(
        orderBy: TIME_ASC
        filter: {
          and: [
            { time: { equalTo: "2020-04-07T00:00Z" } }
          ]
        }
      ) {
        nodes {
          time
          count
        }
      }
    }
  }
}
```

### Simple Geospatial Query with Point

```graphql
{
  allLocations(
    filter: {
      centroid: {
        equals: { type: "Point", coordinates: [-86.64408227, 32.53952745] }
      }
    }
  ) {
    nodes {
      admin2
      provinceState
      deathCountsByLocationId {
        totalCount
      }
    }
  }
}
```

### Simple Geospatial Within Query (see Postgis [ST_Within](https://postgis.net/docs/ST_Within.html))

```graphql
{
  allLocations(
    filter: {
      centroid: {
        within: {
          type: "Polygon"
          coordinates: [
            [
              [-88.0, 32.0]
              [-86.0, 32.0]
              [-86.0, 33.0]
              [-88.0, 33.0]
              [-88.0, 32.0]
            ]
          ]
        }
      }
    }
  ) {
    nodes {
      admin2
      provinceState
      deathCountsByLocationId {
        totalCount
      }
    }
  }
}
```

### Chinese Provinces With Population and Province Centroid

```graphql
{
  allLocations(
    orderBy: PROVINCE_STATE_ASC
    filter: { countryRegion: { equalTo: "China" } }
  ) {
    nodes {
      provinceState
      population
      centroid {
        geojson
      }
      deathCountsByLocationId(orderBy: TIME_DESC) {
        nodes {
          time
          count
        }
      }
      caseCountsByLocationId(orderBy:TIME_DESC) {
        nodes {
          time
          count
        }       
      }
      recoveredCountsByLocationId(orderBy:TIME_DESC) {
        nodes {
          time
          count
        }
      }
    }
  }
}
```



## Mobility Data

### Apple

See https://www.apple.com/covid19/mobility. The apple-mobility/init folder contains the schema for the apple data

#### Example Query

```graphql
{
  allMobilityLocations(
    filter: {
      and: [
        { region: { equalTo: "Portland" } }
        { transportationType: { equalTo: "transit" } }
      ]
    }
  ) {
    nodes {
      region
      geoType
      alternativeName
      transportationType
      valuesByLocationId(orderBy: TIME_ASC) {
        nodes {
          time
          value
        }
      }
    }
  }
}
```

### Google

#### Example Query

```graphql
{
  allMobilityChangeLocations(filter: { countryRegion: { equalTo: "France" } }) {
    nodes {
      countryRegion
      subRegion1
      subRegion2
      countryRegionCode
      mobilityChangesByLocationId(
        filter: { time: { greaterThanOrEqualTo: "2020-03-15" } }
        first: 100
        orderBy: TIME_ASC
      ) {
        nodes {
          time
          residential
          parks
          workplaces
          retailAndRecreation
          groceryAndPharmacy
          transitStations
        }
      }
    }
  }
}
```



## Data Loader Code

### Johns Hopkins COVID-19 death, cases, and recoveries


See `/data-loaders/process-data/simpleSqlGeneration.js` for US data and `/data-loaders/process-data/simpleWorldSqlGeneration.js` for the rest of the world

These read the Johns Hopkins time series data and creates sql files to create the `johns_hopkins` schema and insert the death, confirmed cases, and recovered data into the database, See `51-johns-hopkins-us-deaths-data.sql` and.  Example input data is provided in the data-loaders/example-data directory.  To load the latest, one should perform a git clone of the Johns Hopkins github data repository (https://github.com/CSSEGISandData/COVID-19.git) and then run `simpleSqlGeneration.js` and `simpleWorldSqlGeneration.js`.  The location of the input and destination sql files is specified in `/data-loaders/process-data/.env`, change the input locations to point to the location of the Johns Hopkins time series data.

### Inserting into Database

Create the the johns_hopkins schema, for instance (10.0.1.146 is the host in this example):

```
psql postgres -h 10.0.1.146 -d covid -f 00-johnshopkins-schema.sql

```

then run the subsequent data sql files.  A bash script is inlcuded (`/db/init/load-data.sh`) to run all of the scripts, edit the bash script to accomodate the location of your database and sql files.

### Running the GraphQL Dockers

There are four Dockerfiles that can be used to run the graphql services, located in the following directories

* graphql (Johns Hopkins GraphQL service with deaths, recoveries, and confirmed cases by location and date)

* apple-mobility (Apple Mobility data)

* google-mobility (Google Mobility data)

* federation (using Apollo Federation)

These first three also contain db folders with init scripts that can be used to run a Postgres Docker (e.g. for development without a local Postgresql), but more typically can be used to populate the covid database in a local instance of Postgresql (for development), or a cloud base Postgres database in production.  

To access the local database the pg_hba.conf and postgresql.conf files will need to be updated. To find the correct location of these files you can as postgresql using the psq command:

```
psql -U postgres -c 'SHOW config_file'
psql -U postgres -c 'SHOW hba_file'
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

*Note: if using the provided docker-compose yml, The database is stored in the postgres Docker container.  This means that in order to start fresh the old containers need to be deleted first; otherwise the init scripts will not run.  The database is also very large, on the order of 900,000 rows, so running in docker-compose takes a very, very long time to load.  To avoid this run Postgres locally instead of in a Docker, or (to just look at a few hundred locations, to get a feel for the API), shorten the case, death, and recovery sql files*

## Population Data

Johns Hopkins has the population data per county in the `time_series_covid19_deaths_US.csv` file, but no population is provided for the global data, so the population data from the UN is used, see `example-data/WPP2019_TotalPopulationBySex.csv` (https://population.un.org/wpp/Download/Standard/CSV/). This CSV file uses ISO 3166 country codes (LocID column), see https://en.wikipedia.org/wiki/List_of_ISO_3166_country_codes for a list of country codes, this cooresponds to the code3 column in the Postgresql locations table, i.e. LocID in the UN data is code3 in the Johns Hopkins data.  In order to include the province data the location uid (which is used on the US data ending at 84099999) will be added, starting at 90000000, e.g. `British Columbia,Canada` might have a uid of 90000301, with a code3 of 124.  Since there is no row for Canada, and the UN data does not break down population by province, individual country rows will be added for countries that include provinces, e.g. Australia, Canada, China, Denmark, France, United States, Netherlands, United Kingdom.  There are outliers in the Johns Hopkins, global data, e.g. `Recovered, Canada`, these can be identified by having a Lat and Lon of `0.0,0.0`, this data is not included for now.

## Features List

- [x] Database Schemas (compatible with TimescaleDB)
- [x] GraphQL Service (Node/Express/Apollo)
- [ ] OpenAPI 3 Service (Haskell)
- [x] Docker File for GraphQL Service
- [x] Docker Compose File
- [x] Data Loader for US Locations
- [x] Data Loader for Global Locations
- [x] Data Loader for US Data 
- [x] Data Loader for US JSONB Data
- [x] Data Loader for Global Data
- [x] Data Loader for Global JSONB Data
- [ ] Automatic Incremental Loading of New Data from GitHub (e.g. WHO, JohnsHopkins, Apple Mobility Services)
- [ ] Apollo Federation to Provide Unified Service (e.g. WHO, JohnsHopkins, Apple Mobility Services)
- [ ] TimeScale DB (Note: TimescaleDB support not present on AWS, however it may be possible to use AWS Timestream, or the TimescaleDB service)
- [x] Apple Mobility Schema
- [x] Apple Mobility Data Loaders
- [x] ISO country codes, and country centroids in Apple Mobility Data
- [x] Google Mobility Schema
- [x] Apple Mobility Data Loaders
- [ ] Country centroids in Google Mobility Data
- [x] Reference D3 Crossfilter Application (see https://github.com/foundobjx/covid-map)
- [x] Reference React Application
- [ ] Incorporate Data from [COVID-19 Projections Using Machine Learning](https://github.com/youyanggu/covid19_projections)

### Deployments

- [x] Deploy Database to Covid Relief Coalition (Jason Redcedar)
- [x] Develop AWS Fargate Deployment for Services (Jason Redcedar)
- [x] Configure Load Balancer  (Jason Redcedar)
- [x] Deploy Johns Hopkins time series data service (Jason Redcedar)
- [] Deploy Apollo Mobility data service
- [] Deploy Google Mobility data service
- [ ] Deploy Reference React To Covid Relief Coalition (see https://github.com/foundobjx/covid-map)


### References

Country Centroids are from https://worldmap.harvard.edu/data/geonode:country_centroids_az8, these are not present in the Johns Hopkins Global data

### Other Data Sources

https://covidtracking.com/data

### Simple Client Example

https://github.com/foundobjx/covid-map

### Timescale Installation Issues (on Postgres 12.2 with OSX)

Timescale is still fairly new to postgres 12.  If building from source make sure set and pass the appropriate environment variables.  In addition  pg_isolation_regress.sh is not installed by default with postgres, so disable.

Typical command lines

```
export PG_PATH=/usr/local/bin
export PG_PATH=OPENSSL_ROOT_DIR=/usr/local/opt/openssl
./bootstrap -DPG_CONFIG=/usr/local/bin/pg_config -DREGRESS_CHECKS=OFF
```

Check the location of Postgres and openssl on the system and modify the above appropriately.

Refs: 
https://github.com/timescale/timescaledb/blob/master/docs/BuildSource.md
https://github.com/timescale/timescaledb/issues/1655

### What About Models?

We are not consuming any data from models yet, however https://covid19-projections.com/ looks to be of very high quality.