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
const createLocationCodeMap = (locationCodes) => {
  const result = new Map()
  const codeLines = locationCodes.split('\n')
  codeLines.forEach(line => {
    const codeValues = line.split(regex)
    result.set(codeValues[0], new Array(codeValues[1], codeValues[2], codeValues[3]))
  })
  return result
}

const addLocationCodes = (line, locationCodesMap) => {
  if (!line) {
    return line
  }
  const values = line.split(regex)
  const country = values[1]
  const countryCodesKey = (country[0] !== '"' ? `'${country}'` : country.replace(/"/g, '\'')).replace(/^'|'$/g, '')
  if (!values[0].length && locationCodesMap.has(countryCodesKey)) {
    const codes = locationCodesMap.get(countryCodesKey)
    if (codes.length === 3) {
      values.splice(2, 0, codes[2])
      values.splice(2, 0, codes[1])
      values.splice(2, 0, codes[0])
    } else {
      values.splice(2, 0, '','','')
      console.log(`error: ${line}`)
    }
  } else {
    values.splice(2, 0, '','','')
  }
  return values.join(',')
}

// uses 3 character iso country code as keys
const createIso3CentroidsMap = (centroids => {
  const result = new Map()
  const dataLines = centroids.split('\n')
  dataLines.forEach(line => {
    const codeValues = line.split(regex)
    const point = codeValues[1]
    const key = codeValues[12]
    if (!!point && key.length === 3) {
      const latlons = point.substring(point.indexOf('(') + 1,point.length-1).split(' ')
      result.set(codeValues[12], [+latlons[0], +latlons[1]])
    }
  })
  return result
})
const improveCentroidCoordinates = (line, centroidsMap) => {
  if (!line) {
    return line
  }
  let newLine = line.slice(0)
  const values = newLine.split(regex)
  if (values[3].length) {
    const iso3 = values[3]
    const countryCodesKey = (iso3[0] !== '"' ? `'${iso3}'` : iso3.replace(/"/g, '\'')).replace(/^'|'$/g, '')
    const coordinates = centroidsMap.get(countryCodesKey)
    if (!!coordinates) {
      values[5] = coordinates[1]
      values[6] = coordinates[0]
    }
  }
  return values.join(',')
}
// uses 3 digit numeric code country codes as keys
const createPopulationsMap = (populations => {
  const result = new Map()
  const dataLines = populations.split('\n')
  dataLines.forEach((line, index) => {
    if (index) {
      const values = line.split(regex)
      const key = values[0]
      const population = values[2]
      result.set(key, population)
    }
  })
  return result
})
// uses province names as keys, population in 4th column
const createChineseProvincePopulationsMap = (populations => {
  const result = new Map()
  const dataLines = populations.split('\n')
  dataLines.forEach((line, index) => {
    if (index) {
      const values = line.split(regex)
      result.set(values[0], values[3])
    }
  })
  return result
})

// uses province names as keys, population in 4th column
const createCanadianProvincePopulationsMap = (populations => {
  const result = new Map()
  const dataLines = populations.split('\n')
  dataLines.forEach((line, index) => {
    if (index) {
      const values = line.split(regex)
      result.set(values[0], values[3])
    }
  })
  return result
})

const addChineseProvincePopulations = (line, populationsMap) => {
  if (!line) {
    return line
  }
  if (line.indexOf('Province/State') !== -1) {
    return line
  }
  const values = line.split(regex)
  const province = values[0]
  const country = values[1]
  if (country === 'China' && province.length) {
    const provinceKey = (province[0] !== '"' ? `'${province}'` : province.replace(/"/g, '\'')).replace(/^'|'$/g, '')
    if (values[0].length && populationsMap.has(provinceKey)) {
      const population = populationsMap.get(provinceKey)
      values[7] = population
    }
  }
  return values.join(',')
}

const addCanadianProvincePopulations = (line, populationsMap) => {
  if (!line) {
    return line
  }
  if (line.indexOf('Province/State') !== -1) {
    return line
  }
  const values = line.split(regex)
  const province = values[0]
  const country = values[1]
  if (country === 'China' && province.length) {
    const provinceKey = (province[0] !== '"' ? `'${province}'` : province.replace(/"/g, '\'')).replace(/^'|'$/g, '')
    if (values[0].length && populationsMap.has(provinceKey)) {
      const population = populationsMap.get(provinceKey)
      values[7] = population
    }
  }
  return values.join(',')
}

const addCountryPopulations = (line, populationsMap) => {
  if (!line) {
    return line
  }
  if (line.indexOf('Province/State') !== -1) {
    return line
  }
  const values = line.split(regex)
  const code3 = values[4]
  const code3Key = (code3[0] !== '"' ? `'${code3}'` : code3.replace(/"/g, '\'')).replace(/^'|'$/g, '')
  if (!values[0].length && populationsMap.has(code3Key)) {
    if (Number.isInteger(+code3Key)) {
      const population = populationsMap.get(code3Key)
      values.splice(7, 0, population)
    } else {
      values.splice(7, 0, '')
      console.log(`error: ${line}`)
    }
  } else {
    values.splice(7, 0, '')
  }
  return values.join(',')
}


const processData = async () => 
{
  const nameMap = new Map(JSON.parse(await fsPromises.readFile('../additional-data/csseCountryToStandardCountry.json', 'utf8')))
  const locationCodes = (await fsPromises.readFile(countryCodesOrigin, 'utf8'))
  const centroids = (await fsPromises.readFile('../additional-data/country-centroids.csv', 'utf8'))
  const populations = (await fsPromises.readFile('../additional-data/populations/population.csv', 'utf8'))
  const chineseProvincePopulations = (await fsPromises.readFile('../additional-data/populations/china-region-population.csv', 'utf8'))
  const canadianProvincePopulations = (await fsPromises.readFile('../additional-data/populations/canada-province-population.csv', 'utf8'))
  const locationCodesMap = createLocationCodeMap(locationCodes)
  const centroidsMap = createIso3CentroidsMap(centroids)
  const populationsMap = createPopulationsMap(populations)
  const chineseProvincePopulationsMap = createChineseProvincePopulationsMap(chineseProvincePopulations)
  const canadianProvincePopulationsMap = createCanadianProvincePopulationsMap(canadianProvincePopulations)
  
  const deathData = (await fsPromises.readFile(globalDeathsOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCodes(line, locationCodesMap))
    .map(line => improveCentroidCoordinates(line, centroidsMap))
    .map(line => addCountryPopulations(line, populationsMap))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulationsMap))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulationsMap))
  console.log(`global death data locations length ${deathData.length}`)

  const confirmedData = (await fsPromises.readFile(globalConfirmedOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCodes(line, locationCodesMap))
    .map(line => improveCentroidCoordinates(line, centroidsMap))
    .map(line => addCountryPopulations(line, populationsMap))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulationsMap))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulationsMap))
  console.log(`global confirmed case data locations length ${confirmedData.length}`)

  const recoveredData = (await fsPromises.readFile(globalRecoveredOrigin, 'utf8')).split('\n')
    .map(line => replaceName(line, nameMap))
    .map(line => addLocationCodes(line, locationCodesMap))
    .map(line => improveCentroidCoordinates(line, centroidsMap))
    .map(line => addCountryPopulations(line, populationsMap))
    .map(line => addChineseProvincePopulations(line, chineseProvincePopulationsMap))
    .map(line => addCanadianProvincePopulations(line, canadianProvincePopulationsMap))
  console.log(`global recovered case data locations length ${recoveredData.length}`)
}

processData()
