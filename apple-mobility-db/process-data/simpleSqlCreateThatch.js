/* This simple script creates two files with sql insert statemements to populate the apple mobility tables from scratch */

/* To initialize and run this script (after node 13 and npm are installed).  I can point you to the howto on installing node and npm for your OS

npm install

node simpleSqlCreateThatch.js

*/

/*
Import block, similar to Python's import

The actual inclusion of the libraries are defined in ./package.json

Running `npm install` then creates a node_modules folder and a packages-lock.json with all of the dependencies "locked"
*/
import { promises as fsPromises } from "fs" // File system stuff
import moment from "moment" // time stuff
import uuid from "uuid" //Universally Unique Identifier
import dotenv from "dotenv" // Read environment variables from the `.env` file
dotenv.config() // initialize dotenv so that the variables can be used

/* In JS one uses either const or let to declare a variable, optionally the value of the variable can be set.  JS does not have strict typing, don't sweat it*/

const origin = '../applemobilitytrends.csv' // this is the raw data to read, this comes from https://www.apple.com/covid19/mobility
const locationsInsertDestination = "../init/01-locations.sql"; // location of the sql that in this script for loading location data, don't worry about fucking this up
const valuesInsertDestination = "../init/02-values.sql"; // location of the sql that is created in this script for loading the actual mobility values, don't worry about fucking this up
const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/; // its complicated, but since the CSV is pretty simple this regular expression sufficed to split each line from the raw data into an array, see its use later in the script
const valueInserts = [] // placeholder for our inserts

/*  YOU SHOULD START AT THE END TO FOLLOW THIS CODE, see the last line: processdata() */

const addValueInserts = (locationId, data, dates) => {
  const values = data.slice()
  values.splice(0,4)
  const reals = values.map(v => +v)
  if (reals.length > 0 && !isNaN(reals[0])) {
    reals.map((r,i) => 
    `INSERT INTO apple_mobility.value(id,location_id,time,value) VALUES ('${uuid.v4()}','${locationId}','${moment.utc(dates[i], "YYYY-MM-DD").toISOString()}',${r});`)
    .forEach(insert => {
      valueInserts.push(insert)
    })
  }
}

const getPoint = (location,lookup) => {
  let entry = lookup.find(_ => _.admin === location)
  if (!!entry) {
    entry = lookup.find(_ => _.name === location)
  }
  return (entry !== undefined) ? `ST_GeomFromText('${entry.the_geom}', 4326)` : ''
}

const getISO2CodeForCountry = (countryName,lookup) => {
  let entry = lookup.find(_ => _.admin === countryName)
  if (!!entry) {
    entry = lookup.find(_ => _.name === countryName)
  }
  return (entry !== undefined) ? entry.iso_a2 : ''
}
const getISO3CodeForCountry = (countryName,lookup) => {
  let entry = lookup.find(_ => _.admin === countryName)
  if (!!entry) {
    entry = lookup.find(_ => _.name === countryName)
  }
  return (entry !== undefined) ? entry.iso_a3 : ''
}
const getPopulationForCountry = (countryName,lookup) => {
  let entry = lookup.find(_ => _.admin === countryName)
  if (!!entry) {
    entry = lookup.find(_ => _.name === countryName)
  }
  return (entry !== undefined) ? entry.pop_est : -1
}
const getNum3CodeForCountry = (countryName, lookup) => {
  let entry = lookup.find(_ => _.admin === countryName)
  if (!!entry) {
    entry = lookup.find(_ => _.name === countryName)
  }
  if (entry !== undefined) {
    if (entry.iso_n3 !== undefined) {
      return +entry.iso_n3
    }
  }
  return -1
}
const findFirstDate = (values) => {
  return values.findIndex(value => {
    const dateCandidate = moment(value, 'YYYY-MM-DD', true)
    return dateCandidate.isValid()
  })
}

/* This is the function that does all of the work, and IIFE could be used, but this is easiery to follow */

const processData = async () => { // async means that this function waits until completion when called
  const lookup = JSON.parse(await fsPromises.readFile('./lookup.json', 'utf8')) // read the lookup file, this monster file has information about places around the world... and beyond
  const locationData = await fsPromises.readFile(origin,"utf8") //read our data file in one big chunk, this is a bit expensive in regards to memory, but not a concern for now
  const lines = locationData.split('\n') // split the data into a bunch of lines
  const dates = lines[0].split(regex) // split the first line, and get the candidate dates
  console.log(findFirstDate(dates)) // find the actual first data

  dates.splice(0,6) // remove the first 6 columns, this is lazy programming, 6 should really be calculated, in fact findFirstDate does that but is not used, sloth on my part
  // console.log(JSON.stringify(dates, null, 2))
  return
  const locationInserts = lines.map((line, index) => { // in functional programming map is a function on a functor (an array is a functor), that returns a functor with exactly the same number of elements
    const data = line.split(regex) // we are going to split each line
    if (data.length > 5) { // sloth again on my part, should use the value from findFirstDate
      let location = data[1] !== undefined ? data[1].replace(/^"|"$/g, '') : ''//cleans up the 2nd element string, don't worry about it too much
      location = location.replace("'", "''");// more cleaning
      let alternativeName = data[3] !== undefined ? data[3].replace(/^"|"$/g, '') : ''//cleans up the 3rd element string, don't worry about it too much
      alternativeName = alternativeName.replace("'", "''"); // more cleaning
      const geoType = data[0] // no cleaning needed, e.g. city, country, ...
      const transportationType = data[2] // no cleaning needed, e.g. walking, transit...
      const id = uuid.v4() // create a v4 Universally Unique Identifier for the location
      const iso2 = (geoType === 'country/region') ? getISO2CodeForCountry(location, lookup) : null // use that lookup.js file to find the ISO2 code, null if not found.  This syntax is called ternery and is shorthand for if else.
      const iso3 = (geoType === 'country/region') ? getISO3CodeForCountry(location, lookup) : null // use that lookup.js file to find the ISO3 code
      const code3 = (geoType === 'country/region') ? getNum3CodeForCountry(location, lookup) : null // use that lookup.js file to find the Numeric3 code
      const population = (geoType === 'country/region') ? getPopulationForCountry(location, lookup) : null // use that lookup.js file to find the Numeric3 code

      const iso2insert = !!iso2 ? `'${iso2}'` : null // put quotes on it if not null
      const iso3insert = !!iso3 ? `'${iso3}'` : null // put quotes on it if not null
      const code3insert = code3 !== -1 ? code3 : null // if -1 is returned, replace with null
      const populationinsert = population !== -1 ? population : null // if -1 is returned, replace with null
      const centroid = getPoint(location, lookup) // use that lookup.js file to find the latitude and longitude
      addValueInserts(id, data, dates) // the lines above create the location inserts, the addValueInserts function add the inserts for the mobility values.  We need location prior to adding each set of mobility values
      if (centroid !== '') {
        return `INSERT INTO apple_mobility.mobility_location(id,geo_type,region,transportation_type,alternative_name,iso2,iso3,code3,centroid) VALUES ('${id}','${geoType}','${location}','${transportationType}','${alternativeName}',${iso2insert},${iso3insert},${code3insert},${centroid});`
      } else {
        return `INSERT INTO apple_mobility.mobility_location(id,geo_type,region,transportation_type,alternative_name,iso2,iso3,code3) VALUES ('${id}','${geoType}','${location}','${transportationType}','${alternativeName}',${iso2insert},${iso3insert},${code3insert});`
      }
    }
    return ''
  }).filter(insertStatement => insertStatement !== '') // filter acts on a functor (array in this case), and takes a function that returns true or false, uses arrow syntax for creating and calling an anonymous function in one line
  await fsPromises.writeFile(locationsInsertDestination,locationInserts.join('\n')) // write out the inserts for location
  await fsPromises.writeFile(valuesInsertDestination, valueInserts.join('\n')) // writes out the inserts for mobility values
  console.log(`location count: ${locationInserts.length}`) // let the user know how many locations were written
  console.log(`values count: ${valueInserts.length}`)// let the user know how many mobility values were written
}

/* Call the function to kick off the processing 
   This is at the end because that's how JavaScript works, e.g. the code above needs to be defined prior to being called.
*/


processData()
