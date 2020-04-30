import { promises as fsPromises } from "fs"
import moment from "moment"
import uuid from "uuid"
import dotenv from "dotenv"
dotenv.config()

const origin = '../applemobilitytrends.csv'
const locationsInsertDestination = "../init/01-locations.sql";
const valuesInsertDestination = "../init/02-values.sql";
const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
const valueInserts = []

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
const processData = async () => {
  const lookup = JSON.parse(await fsPromises.readFile('./lookup.json', 'utf8'))
  const locationData = await fsPromises.readFile(origin,"utf8")
  const lines = locationData.split('\n')
  const dates = lines[0].split(regex)
  dates.splice(0,4)
  const locationInserts = lines.map((line, index) => {
    const data = line.split(regex)
    if (data.length > 3) {
      let location = data[1] !== undefined ? data[1].replace(/^"|"$/g, '') : ''
      location = location.replace("'", "''");
      let alternativeName = data[3] !== undefined ? data[3].replace(/^"|"$/g, '') : ''
      alternativeName = alternativeName.replace("'", "''");
      const geoType = data[0]
      const transportationType = data[2]
      const id = uuid.v4()
      const iso2 = (geoType === 'country/region') ? getISO2CodeForCountry(location, lookup) : null
      const iso3 = (geoType === 'country/region') ? getISO3CodeForCountry(location, lookup) : null
      const code3 = (geoType === 'country/region') ? getNum3CodeForCountry(location, lookup) : null
      const population = (geoType === 'country/region') ? getPopulationForCountry(location, lookup) : null

      const iso2insert = !!iso2 ? `'${iso2}'` : null
      const iso3insert = !!iso3 ? `'${iso3}'` : null
      const code3insert = code3 !== -1 ? code3 : null
      const populationinsert = population !== -1 ? population : null
      const centroid = getPoint(location, lookup)
      addValueInserts(id, data, dates)
      if (centroid !== '') {
        return `INSERT INTO apple_mobility.mobility_location(id,geo_type,region,transportation_type,alternative_name,iso2,iso3,code3,centroid) VALUES ('${id}','${geoType}','${location}','${transportationType}','${alternativeName}',${iso2insert},${iso3insert},${code3insert},${centroid});`
      } else {
        return `INSERT INTO apple_mobility.mobility_location(id,geo_type,region,transportation_type,alternative_name,iso2,iso3,code3) VALUES ('${id}','${geoType}','${location}','${transportationType}','${alternativeName}',${iso2insert},${iso3insert},${code3insert});`
      }
    }
    return ''
  }).filter(insertStatement => insertStatement !== '')
  await fsPromises.writeFile(locationsInsertDestination,locationInserts.join('\n'))
  await fsPromises.writeFile(valuesInsertDestination, valueInserts.join('\n'))
  console.log(`location count: ${locationInserts.length}`)
  console.log(`values count: ${valueInserts.length}`)
}
processData()
