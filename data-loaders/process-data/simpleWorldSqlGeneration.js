import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

const globalLocationsInsertDestination = process.env.GLOBAL_LOCATIONS_DESTINATION || '../../db/init/60-johnshopkins-global-location-data.sql'
const globalDeathsInsertDestination = process.env.GLOBAL_DEATHS_DESTINATION || '../../db/init/61-johnshopkins-global-deaths-data.sql'
const globalConfirmedInsertDestination = process.env.GLOBAL_CONFIRMED_DESTINATION || '../../db/init/62-johnshopkins-global-confirmed-data.sql'
const globalRecoveredInsertDestination = process.env.GLOBAL_RECOVERED_DESTINATION || '../../db/init/63-johnshopkins-global-recovered-data.sql'

// usPopulationsOrigin is used to get locations with populations
const globalPopulationsOrigin = process.env.GLOBAL_POPULATIONS_FILENAME || '../additional-data/population.csv' 
const coutryCodesOrigin = process.env.COUNTRY_CODES_FILENAME || '../additional-data/country-codes.csv' 

const globalDeathsOrigin = process.env.GLOBAL_DEATHS_FILENAME || '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv'
const globalConfirmedOrigin = process.env.GLOBAL_CONFIRMED_FILENAME ||  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
const globalRecoveredOrigin = process.env.GLOBAL_RECOVERED_FILENAME ||  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv'

const inputHeadersToSqlColumns = new Map([
  ['Province_State',  {name: 'province_state', length: 128, type: 'varchar'}],
  ['Country_Region', {name: 'country_region', length: 128, type: 'varchar'}],
  ['Lat', {name: '', type: 'double'}],
  ['Long', {name: '', type: 'double'}]]
  )
const locationSqlColumns = [
  "id",
  "UID",
  "iso2",
  "iso3",
  "code3",
  "FIPS",
  "Admin2",
  "Province_State",
  "Country_Region",
  "centroid",
  "Combined_Key",
  "Population",
]
const countSqlColumns = [
  'id','location_id','time','count'
]
const populationColumns = [
  'code3','location','population'
]
//code 3 is the equivilant Johns Hopkins UID for global data, but is missing from the Johns Hopkins
// Data so country name must be matched 
const countryCodeColumns = [
  'CountryName','iso2','iso3','code3'
]

const keys = Array.from(inputHeadersToSqlColumns.keys())
const indexOfLat = keys.indexOf('Lat')
const indexOfLon = keys.indexOf('Long')

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
const addCountryCodesToPopulation = (populations, countryCodes) => {
  // console.log(countryCodes);
  // return
  const populationLines = populations.split('\n')
  const countryCodesLines = countryCodes.split('\n')
  // const populationsArray = populationLines.map((line) => {
  //   const data = line.split(regex)
  //   populationData.code3 = line[0]
  //   populationData.name = line[1]
  //   populationData.population = line[2]
  //   return populationData
  // })
  // console.log(JSON.stringify(populationsArray, null, 2))
  // return
  const populationMap = new Map()
  populationLines.forEach((line, index) => {
    const data = line.split(regex)
    const v = {}
    v.name = data[1]
    v.population = data[2]
    populationMap.set(data[0], v)
  })
  console.log(populationMap);

  const countryCodeData = new Map()
  countryCodesLines.forEach((line, index) => {
    const data = line.split(regex)
    const v = {}
    console.log(data)
    v.name = data[0]
    v.iso2 = data[1]
    v.iso3 = data[2]
    countryCodeData.set(data[3], v)
  })
  console.log(countryCodeData);

  return;
  // const result = new Map()
  // const populationLines = populations.split('\n')
  populationLines.forEach((line, index) => {
    if (index) {
      const populationData = line.split(regex)
      console.log(populationData)
      //.filter((_,index) => index < usNonDateHeaderString.split(',').length)
      if (populationData.length > 1) {
        // console.log(locationData)
        // const locationDataWrapped = wrapLocationDataStringParts(locationData)
        // console.log(locationDataWrapped)
        // const lat = locationDataWrapped[indexOfLat]
        // const lon = locationDataWrapped[indexOfLon]
        // console.log(`lat: ${lat}`)
        // console.log(`lon: ${lon}`)

  //       // add centroid point value, replacing LAT and LONG_
  //       locationDataWrapped.splice(indexOfLat, 2, "ST_GeomFromText('POINT(" + lon + " " + lat + ")', 4326)")
        
  //       // add a UUID V4, which is used for the location id in all of the data inserts
  //       locationDataWrapped.unshift(`'${uuid.v4()}'`)
  //       const values = {}
  //       locationSqlColumns.forEach((key,index) => values[key] = locationDataWrapped[index])
  //       result.set(locationDataWrapped[1], values)
      }
    }
  })
  return result
}

// const createPopulations = (populations) => {

// }

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
  const populations = await fsPromises.readFile(globalPopulationsOrigin, 'utf8')
  const countryCodes = await fsPromises.readFile(coutryCodesOrigin, 'utf8')
  const rawDeathsData = await fsPromises.readFile(globalDeathsOrigin, 'utf8')
  const rawConfirmedData = await fsPromises.readFile(globalConfirmedOrigin, 'utf8')
  const rawRecoveredData = await fsPromises.readFile(globalRecoveredOrigin, 'utf8')

  const locationsMap = addCountryCodesToPopulation(populations, countryCodes)
  // try {
  //   const locationInserts = createLocationInserts(locationsMap)
  //   await fsPromises.writeFile(globalLocationsInsertDestination, locationInserts.join('\n'))
  //   console.log('locations row count: ', locationInserts.length)
  // } catch (err) {
  //   console.log(err)
  // }

  // const recoveredInserts = createCountInserts(locationsMap, rawRecoveredData, 'recovered_count')
  // await fsPromises.writeFile(globalRecoveredInsertDestination, deathInserts.join('\n'))
  // console.log('recovered row count: ', recoveredInserts.length)

  // const deathInserts = createCountInserts(locationsMap, rawDeathsData, 'death_count')
  // await fsPromises.writeFile(globalDeathsInsertDestination, deathInserts.join('\n'))
  // console.log('deaths row count: ', deathInserts.length)

  // const confirmedInserts = createCountInserts(locationsMap, rawConfirmedData, 'case_count')
  // await fsPromises.writeFile(globalConfirmedInsertDestination, confirmedInserts.join('\n'))
  // console.log('confirmed row count: ', confirmedInserts.length)
}

processUSData()
