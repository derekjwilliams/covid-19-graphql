import fs from 'fs';
import moment from 'moment';

// This is only for US data, TODO fix for US and Global data

const filename = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv' // change to your csse data location
const lines = fs.readFileSync(filename, {encoding: 'utf8'}).split('\n')
// const GlobalNonDateHeaderString UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key,Population

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

// get ISOString for the stated of day for the date in the csse date, e.g. 2/23/20 is 2020-02-23T00:00:00.000Z
// assumes that the last non-date column last value of usNonDateHeaderString
const convertHeaderDates = (header) => 
  header.filter((header, index) => index > usNonDateHeaderString.split(',').length).map(rawDate => moment.utc(rawDate, "MM/DD/YY").toISOString())

const header = lines[0]
const validHeader = header.startsWith(usNonDateHeaderString)
const validDataLength = verifyDataLength(lines);

if (validHeader && validDataLength) {
  const dates = convertHeaderDates(header.split(','))
  // TODO create sql insert/update for each location and date
}

