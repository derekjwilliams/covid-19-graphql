import { promises as fsPromises } from 'fs'
import moment from 'moment'
import dotenv from 'dotenv'
dotenv.config()
import k from 'knex'; 
import LineByLine from 'n-readlines'

const kind = 'confirmed'
const tablePrefix = 'case'
const incrementOrigin =
  process.env[`GLOBAL_${kind.toUpperCase()}_INCREMENT_FILENAME}`] ||
  `../../../PARENT-COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${kind}_global.csv`
const valueSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
const dbCredentials = process.env.DB_CREDENTIALS || 'postgres:postgres'
const host = process.env.DB_HOST || 'localhost:5432'
const dbConnection = `postgres://${dbCredentials}@${host}/covid`
console.log(dbCredentials)
const knex = k({
  client: 'pg',
  connection: dbConnection,
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

const updateRow = async (table, locationId, values) => 
  await knex(table).where({location_id: locationId}).update({counts: values}).then(data => data)


const selectJsonValues = async () => 
 await knex.raw(`SELECT ${tablePrefix}_count_jsonb.counts FROM ${tablePrefix}_count_jsonb, location WHERE location.id = ${tablePrefix}_count_jsonb.location_id and location.country_region = 'US' limit 100`)
    .then(data => data)


const selectLocData = async (table) =>
  await knex(table)
          .whereNot({country_region: 'US'})
          .then(data => data)

const findFirstDateIndex = (values) => 
  values.findIndex(value => {
    const dateCandidate = moment(value, 'M/DD/YY', true)
    return dateCandidate.isValid()
  })


// return a map with the Combined Key (Country/Region and Province/State for the world) value as the key and and array of time:count pairs
const getNewDataMap = async (filename, countryMap, after) => {
  const result = new Map()
  const dataHeader = new LineByLine(incrementOrigin).next().toString('ascii').split(',')
  const provinceStateIndex = dataHeader.findIndex(value => value === 'Province/State')
  const countryRegionIndex = dataHeader.findIndex(value => value === 'Country/Region')
  const dataLength = dataHeader.length
  const firstDateIndex = findFirstDateIndex(dataHeader)
  const lastDate = moment.utc(dataHeader[dataLength-1], "MM/DD/YY").toISOString()
  const newLines = (await fsPromises.readFile(filename,'utf8')
      .then(_ =>  _.split('\n')))
      .map(line => replaceName(line, countryMap))
  const startIndex= firstDateIndex + 1
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

;(async () => {
  console.log('here')
  try {
    const nameMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
    const jsonValues = await selectJsonValues()
    const maxTimeFromDatabase = getMaxTime(jsonValues.rows.find(row => row.counts.length))
    const newData = await getNewDataMap(incrementOrigin, nameMap, maxTimeFromDatabase)

    for (const location of (await selectLocData('location'))) {
      const combinedKey = location.country_region + '-' + location.province_state
      if (newData.has(combinedKey)) {
        const insertValue = newData.get(combinedKey).map(entry => ({"time": moment.utc(entry.time, "MM/DD/YY").toISOString(), "count": entry.count }))
        await updateRow (`${tablePrefix}_count_jsonb`, location.id, JSON.stringify(insertValue))
      } else {
        console.log('not found: ' + combinedKey)
      }
    }
  } catch (e) {
    console.log(e)
  } finally {
    knex.destroy()
  }
})()
