import fs from 'fs';
import moment from 'moment';

// This is only for US data, TODO fix for US and Global data, as below
// const GlobalNonDateHeaderString ='UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key,Population'

const filename = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv' // change to your csse data location
const lines = fs.readFileSync(filename, {encoding: 'utf8'}).split('\n')

const locationHeaderToSqlColumns = new Map([
['UID', {name: 'uid', type: 'int8'}],
['iso2', {name: 'iso2', length: 2, type: 'varchar'}],
['iso3', {name: 'iso3', length: 3, type: 'varchar'}],
['code3', {name: 'code3', type: 'int4'}],
['FIPS', {name: 'fips', length: 8, type: 'varchar'}],
['Admin2', {name:  'admin2', length: 128, type: 'int4'}],
['Province_State',  {name: 'province_state', length: 128, type: 'varchar'}],
['Country_Region', {name: 'country_region', length: 128, type: 'varchar'}],
['Combined_Key', {name: 'combined_key', length: 256, type: 'varchar'}]]
)

const usNonDateHeaderString = 'UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key'
const verifyLocationInHeader = (header) =>  header.startsWith(usNonDateHeaderString)

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

const validHeader = lines[0].startsWith(usNonDateHeaderString)
const validDataLength = verifyDataLength(lines);

if (validHeader && validDataLength) {
  //ISOString for the stated of day for the date in the csse date, e.g. 2/23/20 is 2020-02-23T00:00:00.000Z
  const dates = lines[0]
                  .split(',')
                  .filter((header, index) => index > usNonDateHeaderString.split(',').length)
                  .map(rawDate => moment.utc(rawDate, "MM/DD/YY").toISOString())
  console.log(dates)
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
  lines.forEach((line, index) => {
    if (index) {
      const locationData = line.split(regex).filter((value,index) => index < usNonDateHeaderString.split(',').length)
      const countData = line.split(regex).filter((value,index) => index >= usNonDateHeaderString.split(',').length)
      if (locationData.length > 1) {
        console.log(locationData.length)
        usNonDateHeaderString.split(',')
        const locationInsert = 'INSERT INTO johns_hopkins() VALUES ()'
        // console.log(locationData.join(','))
      }
    }
  })
  // TODO create sql insert/update for each location and date and write to file
}

