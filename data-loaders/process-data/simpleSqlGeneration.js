import fs from 'fs';

const filename = '../../../COVID-19/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv'
const lines = fs.readFileSync(filename, {encoding: 'utf8'}).split('\n')

const verifyLocationInHeader = (header) =>  header.startsWith('UID,iso2,iso3,code3,FIPS,Admin2,Province_State,Country_Region,Lat,Long_,Combined_Key')

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

const validHeader = verifyLocationInHeader(lines[0])
console.log(validHeader)
const validDataLength = verifyDataLength(lines);

if (validHeader && validDataLength) {
  console.log(validLength)
}

