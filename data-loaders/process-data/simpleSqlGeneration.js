import fs from 'fs'
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'

dotenv.config()

// This is only for US data, TODO fix for US and Global data, as below
// const GlobalNonDateHeaderString ='UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key,Population'

const defaultPopulationsOrigin = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv' // just to get locations with populations
const defaultDeathsOrigin = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv' // just to get locations with populations

const defaultLocationsInsertDestination = '../../db/init/50-johnshopkins-location-data.sql'
const defaultDeathsInsertDestination = '../../db/init/51-johnshopkins-death-data.sql'

const populationsOrigin = process.env.POPULATIONS_FILENAME || defaultPopulationsOrigin
const deathsOrigin = process.env.DEATHS_FILENAME || defaultDeathsOrigin

const locationsInsertDestination = process.env.LOCATIONS_DESTINATION || defaultLocationsInsertDestination
const deathsInsertDestination = process.env.DEATHS_DESTINATION || defaultDeathsInsertDestination

const locations = new Map()
const lines = fs.readFileSync(populationsOrigin, {encoding: 'utf8'}).split('\n')

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

const keys = Array.from(locationHeaderToSqlColumns.keys())
const indexOfLat = keys.indexOf('Lat')
const indexOfLon = keys.indexOf('Long_')
const someDatabaseColumns = keys.slice()
someDatabaseColumns.splice(indexOfLat, 2, 'centroid')
const databaseColumns = `id,${someDatabaseColumns}`
const usNonDateHeaderString = keys.join(',');

const verifyDataLength = (lines) => {
  if (lines.length < 2) {
    return false
  }
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
  const headerCount = lines[0].split(regex).length
  return lines.every((line, index, arr) => {
    const values = line.split(regex)
    return (index + 1 === arr.length && values.length === 1) || (headerCount === values.length)
  })
}

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

const validHeader = lines[0].startsWith(usNonDateHeaderString)
const validDataLength = verifyDataLength(lines);

if (validHeader && validDataLength) {
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/

  // const filename = '../../db/init/50-johnshopkins-location-data.sql'
  fs.open(locationsInsertDestination, 'w', function (err, file) {
    if (err) {
      console.log('error' + err)
      throw err;
    }
    fs.appendFile(locationsInsertDestination, '\\connect covid;\n\n', function (err) {
      if (err) {
        throw err;
      }
    });
    lines.forEach((line, index) => {
      if (index) {
        const locationData = line.split(regex).filter((value,index) => index < usNonDateHeaderString.split(',').length)
        
        if (locationData.length > 1) {
          const locationDataWrapped = wrapLocationDataStringParts(locationData)
          const id = uuid.v4()
          const lat = locationDataWrapped[indexOfLat]
          const lon = locationDataWrapped[indexOfLon]
  
          locationDataWrapped.splice(indexOfLat, 2, "ST_GeomFromText('POINT(" + lon + " " + lat + ")', 4326)")
         
          // add our generated UUID to the location data too
          locations.set(locationDataWrapped[0], locationDataWrapped.unshift(`${id}`))
          
          // write  location insert sql, the locations Map above is used in the next step (after lines.forEach) to write to deaths and confirmed insert file
          const locationInsert = `INSERT INTO johns_hopkins.location(${databaseColumns}) VALUES (${locationDataWrapped.join(",")});\n`
  
          fs.appendFile(locationsInsertDestination, locationInsert, function (err) {
            if (err) {
              throw err;
            }
          });
        }
  
      }
    })
    console.log(`created ${locationsInsertDestination}`);
    fs.close(file, (err) => {
      if (err) throw err;
    })
  })



  // TODO break this into its own function
  const deathLines = fs.readFileSync(deathsOrigin, {encoding: 'utf8'}).split('\n')
  
  //ISOString for the stated of day for the date in the csse date, e.g. 2/23/20 is 2020-02-23T00:00:00.000Z
                  
  const dates = deathLines[0]
                  .split(',')
                  .filter((header, index) => index >= usNonDateHeaderString.split(',').length)
                  .map(rawDate => moment.utc(rawDate, "MM/DD/YY").toISOString())

  fs.open(deathsInsertDestination, 'w', function (err, file) {

    deathLines.forEach((line,index) => {
      
      const UID = line.split(',')[0]
      let counts = line.split(',').slice()    
      counts.splice(0, keys.length + 2)
      
      if (counts.length === dates.length) {
        counts.forEach((count, ci) => {
          const countId = uuid.v4()
          const deathInsert = `INSERT INTO johns_hopkins.death_count(id,location_id,time,count) VALUES ('${countId}',${UID},'${dates[ci]}',${count});\n`

          fs.appendFile(deathsInsertDestination, deathInsert, function (err) {
            if (err) {
              throw err;
            }
          })

        })
      }
    })

    fs.close(file, (err) => {
      if (err) throw err;
    })

  })

  
}
