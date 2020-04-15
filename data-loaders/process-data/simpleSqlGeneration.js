import fs from 'fs'
import moment from 'moment'
import uuid from 'uuid';

// This is only for US data, TODO fix for US and Global data, as below
// const GlobalNonDateHeaderString ='UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key,Population'

const defaultPopulationsFilename = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_deaths_US.csv' // just to get locations with populations

process.env.POPULATIONS_FILENAME || defaultPopulationsFilename

const locations = new Map()
const lines = fs.readFileSync(filenameWithPopulations, {encoding: 'utf8'}).split('\n')

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
const databaseColumns = keys.slice()
databaseColumns.splice(indexOfLat, 2, 'centroid')
const columns = `id,${databaseColumns}`
console.log(columns)
const usNonDateHeaderString = keys.join(',');
// TODO column name for the point containing Lat and Long_ is centroid

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
  //ISOString for the stated of day for the date in the csse date, e.g. 2/23/20 is 2020-02-23T00:00:00.000Z
  const dates = lines[0]
                  .split(',')
                  .filter((header, index) => index > usNonDateHeaderString.split(',').length)
                  .map(rawDate => moment.utc(rawDate, "MM/DD/YY").toISOString())
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/

  const filename = '../../db/init/location_inserts.txt'
  fs.open(filename, 'w', function (err, file) {
    if (err) {
      console.log('error' + err)
      throw err;
    }
    console.log(`created ${filename}`);
  });
  fs.appendFile(filename, '\\connect covid;', function (err) {
    if (err) {
      throw err;
    }
  });

  lines.forEach((line, index) => {
    if (index) {
      const locationData = line.split(regex).filter((value,index) => index < usNonDateHeaderString.split(',').length)
      const countData = line.split(regex).filter((value,index) => index >= usNonDateHeaderString.split(',').length)
      if (locationData.length > 1) {
        const locationDataWrapped = wrapLocationDataStringParts(locationData)
        const id = uuid.v4()
        const lat = locationDataWrapped[indexOfLat]
        const lon = locationDataWrapped[indexOfLon]
        locationDataWrapped.splice(indexOfLat, 2, "ST_GeomFromText('POINT(" + lon + " " + lat + ")', 4326)")
        locations.set(locationDataWrapped[0], locationDataWrapped)
        
        // write  location insert sql, the locations Map above is used in the next step (after lines.forEach) to write to deaths and confirmed insert file
        const locationInsert = `INSERT INTO johns_hopkins.location(${columns}) VALUES ('${id}',${locationDataWrapped.join(",")});\n`

        fs.appendFile(filename, locationInsert, function (err) {
          if (err) {
            throw err;
          }
        });
      }
    }
  })

  // at this point locations Map contains all of the locations, lines contains all of the death data.
  // TODO Open and process time_series_covid_confirmed_US, at this point in time (April 18) there is no US recovered file 
  // using the UID from the locations Map
  // TODO read .env file to get list of files to process

}
