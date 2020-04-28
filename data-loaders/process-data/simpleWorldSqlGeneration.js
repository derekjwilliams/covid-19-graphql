import { promises as fsPromises } from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()

const globalLocationsInsertDestination = process.env.GLOBAL_LOCATIONS_DESTINATION || '../../db/init/60-johnshopkins-global-location-data.sql'
const globalDeathsInsertDestination = process.env.GLOBAL_DEATHS_DESTINATION || '../../db/init/61-johnshopkins-global-deaths-data.sql'
const globalConfirmedInsertDestination = process.env.GLOBAL_CONFIRMED_DESTINATION || '../../db/init/62-johnshopkins-global-confirmed-data.sql'
const globalRecoveredInsertDestination = process.env.GLOBAL_RECOVERED_DESTINATION || '../../db/init/63-johnshopkins-global-recovered-data.sql'

// const globalPopulationsOrigin = process.env.GLOBAL_POPULATIONS_FILENAME || '../additional-data/populations/population.csv' 
const countryCodesOrigin = process.env.COUNTRY_CODES_FILENAME || '../additional-data/country-codes.csv' 

const globalDeathsOrigin = process.env.GLOBAL_DEATHS_FILENAME || '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_global.csv'
const globalConfirmedOrigin = process.env.GLOBAL_CONFIRMED_FILENAME ||  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv'
const globalRecoveredOrigin = process.env.GLOBAL_RECOVERED_FILENAME ||  '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_recovered_global.csv'

const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/

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

const replaceName = (line, countryMap) => {
  if (!line) {
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

const addLocationCode = (line, locationCodes) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  return newLine
}
const addCentroidCoordinates = (line, centroids) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  return newLine
}

const addCountryPopulations = (line, populations) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  return newLine
}

const addChineseProvincePopulations = (line, populations) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  return newLine
}

const addCanadianProvincePopulations = (line, populations) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  return newLine
}

const processData = async () => 
{
  const nameMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
  const locationCodes = (await fsPromises.readFile(countryCodesOrigin, 'utf8'))
  const centroids = (await fsPromises.readFile('../additional-data/country-centroids.csv', 'utf8'))
  const populations = (await fsPromises.readFile('../additional-data/populations/population.csv', 'utf8'))
  const chineseProvincePopulations = (await fsPromises.readFile('../additional-data/populations/population.csv', 'utf8'))
  const canadianProvincePopulations = (await fsPromises.readFile('../additional-data/populations/population.csv', 'utf8'))
  
  const deathData = (await fsPromises.readFile(globalDeathsOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCode(line, locationCodes))
    .map(line => addCentroidCoordinates(line, centroids))
    .map(line => addCountryPopulations(line, populations))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulations))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulations))
  console.log(`global death data locations length ${deathData.length}`)

  const confirmedData = (await fsPromises.readFile(globalConfirmedOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCode(line, locationCodes))
    .map(line => addCentroidCoordinates(line, centroids))
    .map(line => addCountryPopulations(line, populations))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulations))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulations))
  console.log(`global confirmed case data locations length ${confirmedData.length}`)

  const recoveredData = (await fsPromises.readFile(globalRecoveredOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCode(line, locationCodes))
    .map(line => addCentroidCoordinates(line, centroids))
    .map(line => addCountryPopulations(line, populations))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulations))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulations))
  console.log(`global recovered case data locations length ${recoveredData.length}`)

}

processData()
