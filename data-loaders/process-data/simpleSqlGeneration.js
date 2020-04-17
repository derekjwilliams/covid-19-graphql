import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

const usLocationsInsertDestination = process.env.US_LOCATIONS_DESTINATION || '../../db/init/50-johnshopkins-us-location-data.sql'
const usDeathsInsertDestination = process.env.US_DEATHS_DESTINATION || '../../db/init/51-johnshopkins-us-deaths-data.sql'
const usConfirmedInsertDestination = process.env.US_CONFIRMED_DESTINATION || '../../db/init/52-johnshopkins-us-confirmed-data.sql'

// usPopulationsOrigin is used to get locations with populations
const usPopulationsOrigin = process.env.POPULATIONS_FILENAME || '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv' 
const usDeathsOrigin = process.env.DEATHS_FILENAME || '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv'
const usConfirmedOrigin = process.env.DEATHS_FILENAME ||  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv'

const locationHeaderToSqlColumns = new Map([
  ['UID', {name: 'uid', type: 'int8'}],
  ['iso2', {name: 'iso2', length: 2, type: 'varchar'}],
  ['iso3', {name: 'iso3', length: 3, type: 'varchar'}],
  ['code3', {name: 'code3', type: 'int4'}],
  ['FIPS', {name: 'fips', length: 8, type: 'varchar'}],
  ['Admin2', {name:  'admin2', length: 128, type: 'varchar'}],
  ['Province_State',  {name: 'province_state', length: 128, type: 'varchar'}],
  ['Country_Region', {name: 'country_region', length: 128, type: 'varchar'}],
  ['Lat', {name: '', type: 'double'}],
  ['Long_', {name: '', type: 'double'}],
  ['Combined_Key', {name: 'combined_key', length: 256, type: 'varchar'}],
  ['Population', {name: 'population', type: 'int8'}]]
  )
const locationSqlColumns = [
  'id',
  'UID',
  'iso2',
  'iso3',
  'code3',
  'FIPS',
  'Admin2',
  'Province_State',
  'Country_Region',
  'centroid',
  'Combined_Key',
  'Population'
]
const countSqlColumns = [
  'id',
  'location_id',
  'time',
  'count'
]

const keys = Array.from(locationHeaderToSqlColumns.keys())
const indexOfLat = keys.indexOf('Lat')
const indexOfLon = keys.indexOf('Long_')

const usNonDateHeaderString = keys.join(',')
const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/

const wrapLocationDataStringParts = (locationData) => {
  if (locationData.length > 0) {
    const outputLocationData = locationData.slice(0)
    
    let index = 0
    locationHeaderToSqlColumns.forEach((metadata,key) => {
      if(metadata.type === 'varchar') {
        const value = outputLocationData[index].replace("'", "''")// double single quotes to escape any single quotes in the data
        outputLocationData[index] = value[0] !== '"' ? `'${value}'` : value.replace(/"/g, '\'')
      }
      index++
    })
    return outputLocationData
  }
}

// Get a Map with a UUID as the key and location (with population) as the value
/** 
 * Result example element
  '84006067' => {
    id: "'203260d4-2be9-45cf-af38-c7c067f7f4de'",
    UID: '84006067',
    iso2: "'US'",
    iso3: "'USA'",
    code3: '840',
    FIPS: "'6067.0'",
    Admin2: "'Sacramento'",
    Province_State: "'California'",
    Country_Region: "'US'",
    centroid: "ST_GeomFromText('POINT(-121.34253740000001 38.45106826)', 4326)",
    Combined_Key: "'Sacramento, California, US'",
    Population: '1552058' // when population exists
  }
*/
const createLocationsMap = (data) => {
  const result = new Map()
  const lines = data.split('\n')
  lines.forEach((line, index) => {
    if (index) {
      const locationData = line.split(regex).filter((_,index) => index < usNonDateHeaderString.split(',').length)
      if (locationData.length > 1) {
        const locationDataWrapped = wrapLocationDataStringParts(locationData)
        const lat = locationDataWrapped[indexOfLat]
        const lon = locationDataWrapped[indexOfLon]

        // add centroid point value, replacing LAT and LONG_
        locationDataWrapped.splice(indexOfLat, 2, "ST_GeomFromText('POINT(" + lon + " " + lat + ")', 4326)")
        
        // add a UUID V4, which is used for the location id in all of the data inserts
        locationDataWrapped.unshift(`'${uuid.v4()}'`)
        const values = {}
        locationSqlColumns.forEach((key,index) => values[key] = locationDataWrapped[index])
        result.set(locationDataWrapped[1], values)
      }
    }
  })
  return result
}

const createLocationInserts = (locationsMap = {}) => {
  const result = []
  locationsMap.forEach((value, key) => {
    const values = Object.values(value).join(',')
    const insertStatement = `INSERT INTO johns_hopkins.location(${locationSqlColumns}) VALUES (${values});`
    result.push(insertStatement)
  })
  return result
}

const createCountInserts = (locationsMap = {}, data = '', tableName = 'none') => {
  const result = []
  const lines = data.split('\n')
  const header = lines[0]
  const headers = header.split(regex)
  const last = headers.indexOf('Population') > 0 ? headers.indexOf('Population') : headers.indexOf('Combined_Key')
  
  // create iso dates from input date columns
  const dates = headers.filter((_,index) => index > last)
                       .map(d => moment.utc(d, 'MM/DD/YY').toISOString())

  lines.forEach((line, index) => {
    if (index) {
      const location = locationsMap.get(line.split(',')[0]) // uid (johns hopkins unique id) is in the 0th column of the counts csv
      if (location !== undefined) {
        const counts = line.split(regex).filter((_,index) => index > last)
        if (counts.length === dates.length) {
          dates.forEach((date, index) => 
            result.push( `INSERT INTO johns_hopkins.${tableName}(${countSqlColumns}) VALUES ('${uuid.v4()}',${location['id']},'${date}', ${counts[index]});`)
          )
        }
      }
    }
  })
  return result
}

const processUSData = async () => 
{
  const rawPopulationData = await fsPromises.readFile(usPopulationsOrigin, 'utf8')
  const rawDeathsData = await fsPromises.readFile(usDeathsOrigin, 'utf8')
  const rawConfirmedData = await fsPromises.readFile(usConfirmedOrigin, 'utf8')

  const locationsMap = createLocationsMap(rawPopulationData)
  const locationInserts = createLocationInserts(locationsMap)
  await fsPromises.writeFile(usLocationsInsertDestination, locationInserts.join('\n'))
  console.log('locations row count: ', locationInserts.length)

  const deathInserts = createCountInserts(locationsMap, rawDeathsData, 'death_count')
  await fsPromises.writeFile(usDeathsInsertDestination, deathInserts.join('\n'))
  console.log('deaths row count: ', deathInserts.length)

  const confirmedInserts = createCountInserts(locationsMap, rawConfirmedData, 'confirmed_count')
  await fsPromises.writeFile(usConfirmedInsertDestination, confirmedInserts.join('\n'))
  console.log('confirmed row count: ', confirmedInserts.length)
}

 processUSData()
