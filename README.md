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

