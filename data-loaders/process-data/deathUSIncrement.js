import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()
import k from 'knex'
import LineByLine from 'n-readlines'

// after this is run do a merge to our COVID-19 fork
const incrementOrigin =
  process.env.US_DEATHS_FILENAME ||
  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv'

const origin =
  process.env.US_DEATHS_INCREMENT_FILENAME ||
  '../../../PARENT-COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv'

const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

const dbCredentials = process.env.DB_CREDENTIALS || 'postgres:postgres'
const host = process.env.DB_HOST || 'localhost:5432'
const dbConnection = `postgres://${dbCredentials}@${host}/covid`

const knex = k({
  client: 'pg',
  connection: dbConnection,
  searchPath: ['johns_hopkins', 'public'],
  debug: false
})

const selectData = async (table, locationId) => {
  return await knex(table)
          .where({location_id: `${locationId}`})
          .then(data => data)
}
const selectLocData = async (table) => {
  return await knex(table)
          .where({country_region: 'US'})
          .then(data => data)
}
//TODO get last date from database deaths table
const findFirstDate = (values) => {
  return values.findIndex(value => {
    const dateCandidate = moment(value, 'M/DD/YY', true)
    return dateCandidate.isValid()
  })
}

// return a map with the Combined_Key value as the key and and array of date:count pairs
const getNewDataRows = async (filename) => {
  const result = new Map()

  const oldDataHeader = new LineByLine(origin).next().toString('ascii').split(',')
  const combinedKeyIndex = oldDataHeader.findIndex(value => value === 'Combined_Key')
  const oldDataLength = oldDataHeader.length

  const newLines = (await fsPromises.readFile(filename,'utf8')
  .then(_ =>  _.split('\n')))

  const dates = newLines[0].split(regex).splice(oldDataLength).map(_ => _)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(regex)
      const counts = values.splice(oldDataLength).map(_ => +_) // convert strings to numbers
      result.set(values[combinedKeyIndex].slice(1,-1), counts.map((count, countIndex) => ({date: dates[countIndex], count: count})))
    }
  }
  return result
}

const insertRows = async (table, values) => await knex(table).insert(values).then(data => data)

const processData = async () => {
  const newData = await getNewDataRows(incrementOrigin)
  const existingLocationsInDatabase = await selectLocData('location')
  for (const location of existingLocationsInDatabase) {
    const combinedKey = location.combined_key
    const match = newData.has(combinedKey)
    if (match) {
      const newDataRow = newData.get(combinedKey)
      const values = newDataRow.map(newData => ({id:`${uuid.v4()}`,location_id: `${location.id}`,time: moment.utc(newData.date, "MM/DD/YY").toISOString(), count: newData.count}))
      console.log(JSON.stringify(values, null, 2))
      //await insertRows ('death_count', values)
    } else {
      console.log('not found: ' + combinedKey)
    }
  }
  knex.destroy()
}
processData()




