import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
const theEnv = dotenv.config()
dotenvExpand(theEnv)
import k from 'knex'; 
import LineByLine from 'n-readlines'

// after this is run do a merge to our COVID-19 fork
const worldConfirmedIncrementOrigin =
  process.env.GLOBAL_CONFIRMED_INCREMENT_FILENAME ||
  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
const worldConfirmedOrigin =
  process.env.GLOBAL_CONFIRMED_FILENAME ||
  '../../../PARENT-COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'

console.log(`incrementOrigin: ${incrementOrigin}`)
console.log(`origin: ${origin}`)

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

const replaceName = (line, countryMap) => {
  if (!!line) {
    const country = line.split(regex)[1]
    if (!!country) {
      const csseCountryKey = (country[0] !== '"' ? `'${country}'` : country.replace(/"/g, '\'')).replace(/^'|'$/g, '')
      if (countryMap.has(csseCountryKey)) {
        const values = line.split(regex)
        values[1] = countryMap.get(csseCountryKey)
        return values.join(',')
      }
    }
  }
  return line
}

//TODO get last date from existing database table
const findFirstDate = (values) => {
  return values.findIndex(value => {
    const dateCandidate = moment(value, 'M/DD/YY', true)
    return dateCandidate.isValid()
  })
}

const createLocationCodeMap = (locationCodes) => {
  const result = new Map()
  const codeLines = locationCodes.split('\n')
  codeLines.forEach(line => {
    const codeValues = line.split(regex)
    result.set(codeValues[0], new Array(codeValues[1], codeValues[2], codeValues[3]))
  })
  return result
}

const selectData = async (table, locationId) => {
  return await knex(table)
          .where({location_id: `${locationId}`})
          .then(data => data)
}
const insertRow = async (table, row) => {
  return await knex(table).returning('id').insert(row).then(data => data)
}
const selectLocData = async (table) => {
  return await knex(table)
          .whereNot({country_region: 'US'})
          .then(data => data)
}

const getNewDataWorldRows = async (filename, origin) => {
  const countryMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
  const result = new Map()
  const oldDataHeader = new LineByLine(origin).next().toString('ascii').split(',')
  const provinceStateIndex = oldDataHeader.findIndex(value => value === 'Province/State')
  const countryRegionIndex = oldDataHeader.findIndex(value => value === 'Country/Region')
  const oldDataLength = oldDataHeader.length
  const newLines = (await fsPromises.readFile(filename,'utf8')
  .then(_ =>  _.split('\n')))
  .map(line => replaceName(line, countryMap))

  const dates = newLines[0].split(regex).splice(oldDataLength).map(_ => _)
  console.log(dates)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(regex)
      const counts = values.splice(oldDataLength).map(_ => +_) // convert strings to numbers
      const countryRegion = values[countryRegionIndex][0] ==='"' ? values[countryRegionIndex].slice(1,-1): values[countryRegionIndex]
      const provinceState = values[provinceStateIndex][0] ==='"' ? values[provinceStateIndex].slice(1,-1): values[provinceStateIndex]
      result.set(countryRegion + '-' + provinceState, counts.map((count, countIndex) => ({date: dates[countIndex], count: count})))
    }
  }
  return result
}
const insertRows = async (table, values) => await knex(table).insert(values).then(data => data)

const processData = async (table, incrementOrigin, origin) => {
  const newData = await getNewDataWorldRows(incrementOrigin, origin)

  const existingLocationsInDatabase = await selectLocData('location')
  for (const location of existingLocationsInDatabase) {
    const combinedKey = location.country_region + '-' + location.province_state
    const match = newData.has(combinedKey)
    if (match) {
      const values = newData.get(combinedKey).map(newData => ({id:`${uuid.v4()}`,location_id: `${location.id}`,time: moment.utc(newData.date, "MM/DD/YY").toISOString(), count: newData.count}))
      console.log(JSON.stringify(values, null, 2))
      // comment out next line to prevent accidental insertion while code is in development
      // await insertRows(table, values)
    } else {
      console.log('not found: ' + combinedKey)
    }
  }
  knex.destroy();
}
processData('case_count', worldConfirmedIncrementOrigin,  worldConfirmedOrigin)
