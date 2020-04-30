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
    const inserts = reals.map((r,i) => 
    `INSERT INTO apple_mobility.value(id,location_id,time,value) VALUES ('${uuid.v4()}','${locationId}','${dates[i]}',${r});`)
    inserts.forEach(insert => {
      valueInserts.push(insert)
    })
  }
}

const processData = async () => {
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
      addValueInserts(id, data, dates)
      return `INSERT INTO apple_mobility.location(id,geo_type,region,transportation_type,alternative_name) VALUES ('${id}','${geoType}','${location}','${transportationType}','${alternativeName}');`
    }
    return ''
  }).filter(insertStatement => insertStatement !== '')
  await fsPromises.writeFile(locationsInsertDestination,locationInserts.join('\n'))
  await fsPromises.writeFile(valuesInsertDestination, valueInserts.join('\n'))
}

processData()