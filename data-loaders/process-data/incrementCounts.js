import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
const theEnv = dotenv.config()
dotenvExpand(theEnv)
import k from 'knex'; 
import LineByLine from 'n-readlines'

const valueSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

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
    const country = line.split(valueSplitRegex)[1]
    if (!!country) {
      const csseCountryKey = (country[0] !== '"' ? `'${country}'` : country.replace(/"/g, '\'')).replace(/^'|'$/g, '')
      if (countryMap.has(csseCountryKey)) {
        const values = line.split(valueSplitRegex)
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
const selectLocationData = async (inUS) => {
  try {
    if (!inUS) {
      return await knex('location')
        .whereNot({ country_region: 'US' })
        .then(data => data)
    } else {
      return await knex('location')
        .where({ country_region: 'US' })
        .then(data => data)
    }
  } catch (e) {
    console.log(e)
  }
}
const getNewDataRows = async (filename, origin) => {
  const result = new Map()
  const countryMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
  const oldDataHeader = new LineByLine(origin).next().toString('ascii').split(',')
  const provinceStateIndex = oldDataHeader.findIndex(value => value === 'Province/State')
  const countryRegionIndex = oldDataHeader.findIndex(value => value === 'Country/Region')
  const oldDataLength = oldDataHeader.length
  const newLines = (await fsPromises.readFile(filename,'utf8')
  .then(_ =>  _.split('\n')))
  .map(line => replaceName(line, countryMap))

  const dates = newLines[0].split(valueSplitRegex).splice(oldDataLength).map(_ => _)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(valueSplitRegex)
      const counts = values.splice(oldDataLength).map(_ => +_) // convert strings to numbers
      const countryRegion = values[countryRegionIndex][0] ==='"' ? values[countryRegionIndex].slice(1,-1): values[countryRegionIndex]
      const provinceState = values[provinceStateIndex][0] ==='"' ? values[provinceStateIndex].slice(1,-1): values[provinceStateIndex]
      result.set(countryRegion + '-' + provinceState, counts.map((count, countIndex) => ({date: dates[countIndex], count: count})))
    }
  }
  return result
}

const getNewRows = async (filename, origin) => {
  const result = new Map()
  const oldDataHeader = new LineByLine(origin).next().toString('ascii').split(',')
  let newLines = []
  const lines = (await fsPromises.readFile(filename,'utf8').then(_ =>  _.split('\n')))
  if (!oldDataHeader.includes('iso2')) {      // data does not include ISO, so we need to get use the standard country map for our values
    const countryMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
    newLines = lines.map(line => replaceName(line, countryMap))
  } else {
    newLines = lines
  }
  const provinceStateIndex = oldDataHeader.findIndex(value => value === 'Province/State')
  const countryRegionIndex = oldDataHeader.findIndex(value => value === 'Country/Region')
  const oldDataLength = oldDataHeader.length

  const dates = newLines[0].split(valueSplitRegex).splice(oldDataLength).map(_ => _)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(valueSplitRegex)
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
  const newData = await getNewRows(incrementOrigin, origin)
  const existingLocationsInDatabase = await selectLocationData(origin.includes('US'))
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
}
const defaultIncrementPath = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series'
const defaultOldDataPath = '../../../PARENT-COVID-19/csse_covid_19_data/csse_covid_19_time_series'

const worldConfirmedIncrementOrigin =
  process.env.GLOBAL_CONFIRMED_INCREMENT_FILENAME || `${defaultIncrementPath}/time_series_covid19_confirmed_global.csv`
const worldConfirmedOrigin =
  process.env.GLOBAL_CONFIRMED_FILENAME || `${defaultOldDataPath}/time_series_covid19_confirmed_global.csv`

const worldDeathIncrementOrigin =
  process.env.GLOBAL_DEATHS_INCREMENT_FILENAME || `${defaultIncrementPath}/time_series_covid19_deaths_global.csv`
const worldDeathOrigin =
  process.env.GLOBAL_DEATHS_FILENAME || `${defaultOldDataPath}/time_series_covid19_deaths_global.csv`

const worldRecoveredIncrementOrigin =
  process.env.GLOBAL_RECOVERED_INCREMENT_FILENAME || `${defaultIncrementPath}/time_series_covid19_recovered_global.csv`
const worldRecoveredOrigin =
  process.env.GLOBAL_RECOVERED_FILENAME || `${defaultOldDataPath}/time_series_covid19_recovered_global.csv`

const usConfirmedIncrementOrigin =
  process.env.US_CONFIRMED_INCREMENT_FILENAME || `${defaultIncrementPath}/time_series_covid19_confirmed_us.csv`
const usConfirmedOrigin =
  process.env.US_CONFIRMED_FILENAME || `${defaultOldDataPath}/time_series_covid19_confirmed_us.csv`

const usDeathIncrementOrigin =
  process.env.US_DEATHS_INCREMENT_FILENAME || `${defaultIncrementPath}/time_series_covid19_deaths_us.csv`
const usDeathOrigin =
  process.env.US_DEATHS_FILENAME || `${defaultOldDataPath}/time_series_covid19_deaths_us.csv`


;(async () => {
  await processData('case_count', worldConfirmedIncrementOrigin,  worldConfirmedOrigin)
  await processData('death_count', worldDeathIncrementOrigin,  worldDeathOrigin)
  await processData('recovered_count', worldRecoveredIncrementOrigin,  worldRecoveredOrigin)
  await processData('case_count', usConfirmedIncrementOrigin,  usConfirmedOrigin)
  await processData('death_count', usDeathIncrementOrigin,  usDeathOrigin)
  knex.destroy()
})()

