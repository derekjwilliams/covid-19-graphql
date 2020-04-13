import fs from 'fs';

const filename = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv' // change to your csse data location
const lines = fs.readFileSync(filename, {encoding: 'utf8'}).split('\n')

const nonDateHeaderString = 'UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key'
const verifyLocationInHeader = (header) =>  header.startsWith(nonDateHeaderString)

const verifyDataLength = (lines) => {
  if (lines.length < 2) {
    return false
  }
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
  const headerCount = lines[0].split(regex).length
  return lines.every((elem, index, arr) => {
    const values = elem.split(regex)
    const lastEmptyLine = index + 1 === arr.length && values.length === 1 // check index to handle possible empty extra line at end of data
    const lengthsMatch = headerCount === values.length
    return lastEmptyLine || lengthsMatch
  })
}

const convertHeaderDates = (header) => {
  // hack to split dates, assumes that the last non-date column last value of nonDateHeaderString
  const nonDateColumns = nonDateHeaderString.split(',')
  const rawDates = header.filter((header, index) => index > nonDateColumns.length)
  console.log(rawDates) // TODO return actual javascript dates
}
const header = lines[0]
const validHeader = header.startsWith(nonDateHeaderString)
const validDataLength = verifyDataLength(lines);

if (validHeader && validDataLength) {
  const dates = convertHeaderDates(header.split(','))
  console.log(dates)
  console.log(validDataLength)
}

