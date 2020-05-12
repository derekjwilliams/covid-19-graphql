import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()
import k from 'knex'; 
import LineByLine from 'n-readlines'

// after this is run do a merge to our COVID-19 fork
// const origin =
//   process.env.GLOBAL_CONFIRMED_FILENAME ||
//   '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'

const kind = 'confirmed'
const tablePrefix = 'case'
const incrementOrigin =
  process.env[`GLOBAL_${kind.toUpperCase()}_INCREMENT_FILENAME}`] ||
  `../../../PARENT-COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${kind}_global.csv`
// process.env.dbcredential
const valueSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
const knex = k({
  client: 'pg',
  connection: 'postgres://postgres:postgres@localhost:5433/covid',
  searchPath: ['johns_hopkins', 'public'],
  debug: true
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
const createLocationCodeMap = (locationCodes) => {
  const result = new Map()
  const codeLines = locationCodes.split('\n')
  codeLines.forEach(line => {
    const codeValues = line.split(valueSplitRegex)
    result.set(codeValues[0], new Array(codeValues[1], codeValues[2], codeValues[3]))
  })
  return result
}

const selectData = async (table, locationId) => {
  return await knex(table)
          .where({location_id: `${locationId}`})
          .then(data => data)
}
const updateRow = async (table, locationId, values) => {
  return await knex(table).where({location_id: locationId}).update({counts: values}).then(data => data)
}
// const findMostRecentDatabaseTime = async () => {
//   return await knex.raw("SELECT case_count.time FROM case_count, location WHERE location.id = case_count.location_id and location.country_region = 'US' ORDER BY time desc limit 1")
//     .then(data => data)
// }
const selectJsonValues = async () => {
 return await knex.raw("SELECT case_count_jsonb.counts FROM case_count_jsonb, location WHERE location.id = case_count_jsonb.location_id and location.country_region = 'US' limit 100")
    .then(data => data)
}

const selectLocData = async (table) => {
  return await knex(table)
          .whereNot({country_region: 'US'})
          .then(data => data)
}
const findFirstDateIndex = (values) => {
  return values.findIndex(value => {
    const dateCandidate = moment(value, 'M/DD/YY', true)
    return dateCandidate.isValid()
  })
}

// return a map with the Combined_Key value as the key and and array of date:count pairs
const getNewDataRows = async (filename, countryMap, after) => {
  const result = new Map()

  const dataHeader = new LineByLine(incrementOrigin).next().toString('ascii').split(',')
  const provinceStateIndex = dataHeader.findIndex(value => value === 'Province/State')
  const countryRegionIndex = dataHeader.findIndex(value => value === 'Country/Region')
  const dataLength = dataHeader.length
  const firstDateIndex = findFirstDateIndex(dataHeader)
  const lastDate = moment.utc(dataHeader[dataLength-1], "MM/DD/YY").toISOString();
  const newLines = (await fsPromises.readFile(filename,'utf8')
      .then(_ =>  _.split('\n')))
      .map(line => replaceName(line, countryMap))
  const startIndex = newLines[0].split(valueSplitRegex).splice(firstDateIndex).findIndex(value => 
    moment.utc(value, "MM/DD/YY").toISOString() === after.toISOString()) + firstDateIndex + 1

  const dates = newLines[0].split(valueSplitRegex).splice(startIndex).map(_ => _)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(valueSplitRegex)
      const counts = values.splice(startIndex).map(_ => +_) // convert strings to numbers
      const countryRegion = values[countryRegionIndex][0] ==='"' ? values[countryRegionIndex].slice(1,-1): values[countryRegionIndex]
      const provinceState = values[provinceStateIndex][0] ==='"' ? values[provinceStateIndex].slice(1,-1): values[provinceStateIndex]
      const resultValue = counts.map((count, countIndex) => ({time: dates[countIndex], count: count}))
      result.set(countryRegion + '-' + provinceState, resultValue)
    }
  }
  return result
}
const getMaxTime = (row) => 
  row.counts.reduce((a, entry) => 
    moment(entry.time).utc().isAfter(a) ? moment(entry.time).utc() : a
  , moment(0).utc())

const processData = async () => {
  const nameMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
  const jsonValues = await selectJsonValues()
  const maxTimeFromDatabase = getMaxTime(jsonValues.rows.find(row => row.counts.length))
  const newData = await getNewDataRows(incrementOrigin, nameMap, maxTimeFromDatabase)

  const existingLocationsInDatabase = await selectLocData('location')
  for (const location of existingLocationsInDatabase) {
    const combinedKey = location.country_region + '-' + location.province_state
    const match = newData.has(combinedKey)
    if (match) {
      const insertValue = newData.get(combinedKey).map(entry => ({"time": moment.utc(entry.time, "MM/DD/YY").toISOString(), "count": entry.count }))
      await updateRow ('case_count_jsonb', location.id, JSON.stringify(insertValue))
      // for (const newData of newDataRow) {
      //   const timestamp = moment.utc(newData.date, "MM/DD/YY").toISOString();
      //   //await insertRow ('case_count', {id:`${uuid.v4()}`,location_id: `${location.id}`,time: timestamp, count: newData.count})
      // }
    } else {
      // console.log('not found: ' + combinedKey)
    }
  }
  knex.destroy();
}
processData()




