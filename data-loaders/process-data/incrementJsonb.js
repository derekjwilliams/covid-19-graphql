import { promises as fsPromises } from 'fs'
import moment from 'moment'
import dotenv from 'dotenv'
dotenv.config()
import k from 'knex';
import LineByLine from 'n-readlines'

const valueSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
const dbCredentials = process.env.DB_CREDENTIALS || 'postgres:postgres'
const host = process.env.DB_HOST || 'localhost:5434'
const dbConnection = `postgres://${dbCredentials}@${host}/covid`

const usKeys = ['Combined_Key']
const worldKeys =  ['Country/Region','Province/State']
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

const insertRows = async (table, insertValues) => 
  await knex(table).insert(insertValues).then(data => data)

const cleanTable = async(table) => {
  await knex.raw(`TRUNCATE TABLE ${table} CASCADE`).then(data => data)
}
const selectJsonValues = async (tablePrefix) =>
  await knex.raw(`SELECT ${tablePrefix}_count_jsonb.counts FROM ${tablePrefix}_count_jsonb, location WHERE location.id = ${tablePrefix}_count_jsonb.location_id and location.country_region = 'US' limit 100`)
     .then(data => data)

const selectLocData = async (place) => {
  if (place !== 'US') {
    return await knex('location')
            .whereNot({country_region: 'US'})
            .then(data => data)
  } else {
    return await knex('location')
            .where({country_region: 'US'})
            .then(data => data)
  }
}

const findFirstDateIndex = (values) =>
  values.findIndex(value => {
    const dateCandidate = moment(value, 'M/DD/YY', true)
    return dateCandidate.isValid()
  })

const createKey = (values, indices) => {
  try {
    return indices.map(index => values[index].indexOf('"') !== -1 ? values[index].slice(1,-1): values[index]).join('-')
  } catch (e) {
    console.log(e)
    return 'no key found'
  }
}

const createKeyIndices = (header, keys) =>
{
  try {
    return keys.map (key => header.findIndex(value => value ===  key))
  } catch (e) {
    console.log(e)
    return []
  }
}
// return a map with the Combined Key (Country/Region and Province/State for the world) value as the key and and array of time:count pairs
const getNewDataMap = async (countryMap, place, filename) => {
  const result = new Map()
  const dataHeader = new LineByLine(filename).next().toString('ascii').split(',')
  const keyIndices = createKeyIndices(dataHeader, place === 'US' ? usKeys : worldKeys)
  const firstDateIndex = findFirstDateIndex(dataHeader)
  console.log(filename)
  const newLines = (await fsPromises.readFile(filename,'utf8')
      .then(_ =>  _.split('\n')))
      .map(line => replaceName(line, countryMap))
      .filter(line => line.trim().length > 10)
  const dates = newLines[0].split(valueSplitRegex).splice(firstDateIndex)
  for (const [i, newLine] of newLines.entries()) {
    if (i > 0 && !!newLine.length) {
      const values = newLine.split(valueSplitRegex)
      const counts = values.splice(firstDateIndex).map(_ => +_) // convert strings to numbers
      if (counts.length > dates.length) {
        console.log(`Length mismatch between Dates and Counts,  Dates: ${dates}, Counts: ${counts}.  Excess count values will not be inserted`)
        counts.splice(dates.length)
      }
      const key = createKey(values, keyIndices)
      result.set(createKey(values, keyIndices), counts.map((count, countIndex) => ({time: dates[countIndex], count: count})))
    }
  }
  return result
}

const getMaxTime = (row) =>
  row.counts.reduce((a, entry) =>
    moment(entry.time).utc().isAfter(a) ? moment(entry.time).utc() : a
  , moment(0).utc())

const getOrigin = (place, kind) =>
{
  const envNameKind = kind.toUpperCase()
  const envNamePlace = place.toUpperCase()
  console.log(`${envNamePlace}_${envNameKind}_INCREMENT_FILENAME`)
  return process.env[`${envNamePlace}_${envNameKind}_INCREMENT_FILENAME`] ||
  `../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_${kind}_${place}.csv`

}

const processData = async (place, kind) => {
  try {
    const nameMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
    const origin = getOrigin(place, kind)
    console.log(origin)
    const tablePrefix = kind === 'confirmed' ? 'case' : kind === 'deaths' ? 'death' : kind
    const tableName = `${tablePrefix}_count_jsonb`
    const newData = await getNewDataMap(nameMap, place, origin)
    let i = 0
    let values = []
    const locs = await selectLocData(place)
    const locLength = locs.length;
    const bulkCount = 100;

    cleanTable(tableName)
    for (const location of locs) {
      const combinedKey = place === 'US' ? location.combined_key: location.country_region + '-' + location.province_state
      if (newData.has(combinedKey)) {
        i++
        const insertValue = newData.get(combinedKey).map(entry => ({"time": moment.utc(entry.time, "MM/DD/YY").toISOString(), "count": entry.count }))
        values.push({'location_id': location.id, 'counts': JSON.stringify(insertValue)})
        if ((i % bulkCount === 0) || i > (Math.round((locLength / bulkCount) - 1)* bulkCount)) {
          if (i % bulkCount === 0 || i === locLength) {
            console.log(`${insertValue.length} values inserted for ${values.length} locations (${i} out of ${locLength}), last location: ${combinedKey} into table ${tableName} on host ${host}`);
            // await insertRows(tableName, values)
            values = []
          }
        }
      } else {
        console.log('not found: ' + combinedKey)
      }
    }
  } catch (e) {
    console.log(e)
  }
}
;(async () => {
    await processData('US', 'deaths')
    await processData('global', 'deaths')
    await processData('US', 'confirmed')
    await processData('global', 'confirmed')
    await processData('global', 'recovered')
    knex.destroy()
})()
