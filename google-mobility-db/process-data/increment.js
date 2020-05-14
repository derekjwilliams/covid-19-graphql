//INSERT INTO google_mobility.mobility_change(id, location_id, time, retail_and_recreation,grocery_and_pharmacy,parks,transit_stations,workplaces,residential) VALUES ('0452575b-0876-4255-b21f-b55c035270e1','f131db99-6eb9-4c5e-8626-556544eb92e7', '2020-03-19', -0.21,0,-0.23,-0.33,-0.11,0.1);

import { promises as fsPromises } from 'fs'
import moment from 'moment'
import dotenv from 'dotenv'
dotenv.config()
import k from 'knex'; 
import LineByLine from 'n-readlines'

const origin = '../Global_Mobility_Report.csv'
const locationsInsertDestination = '../init/01-locations.sql';

const valueSplitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
const dbCredentials = process.env.DB_CREDENTIALS || 'postgres:postgres'
const host = process.env.DB_HOST || 'localhost:5432'
const dbConnection = `postgres://${dbCredentials}@${host}/covid`

const locationMetadata = new Map([
  ['country_region_code', { type: 'varchar', length: 2 }],
  ['country_region', { type: 'varchar', length: 128 }],
  ['sub_region_1', { type: 'varchar', length: 128 }],
  ['sub_region_2', { type: 'varchar', length: 128 }]
])

const valuesMetadata = new Map([
  ['retail_and_recreation_percent_change_from_baseline', { kind: 'retail_and_recreation', type: 'number' }],
  ['grocery_and_pharmacy_percent_change_from_baseline', { kind: 'grocery_and_pharmacy', type: 'number' }],
  ['parks_percent_change_from_baseline', { kind: 'parks', type: 'number' }],
  ['transit_stations_percent_change_from_baseline', { kind: 'transit_stations', type: 'number' }],
  ['workplaces_percent_change_from_baseline', { kind: 'workplaces', type: 'number' }],
  ['residential_percent_change_from_baseline', { kind: 'residential', type: 'number' }]
])


const knex = k({
  client: 'pg',
  connection: dbConnection,
  searchPath: ['google_mobility', 'public'],
  debug: false
})

const selectLocData = async () => {
    return await knex('mobility_change_location')
            .then(data => data)
}

const newRowValues = async (locationIdMap, after) => {
  const dbColumnsArray = Array.from(valuesMetadata.values()).map(d => d.kind)
  const result = []
  const lines = (await fsPromises.readFile(origin,'utf8')
      .then(_ =>  _.split('\r\n')))
  for (const line of lines) {
    const values = line.split(valueSplitRegex) 
    const t = moment.utc(values[4], "YYYY-MM-DD")
    if (t.isAfter(after)) {
      const time = t.toISOString()
      const rawDataValues = values.slice(locationMetadata.size + 1)
      const validDbColumns = []
      const dataValues = []
      let i = 0
      for (const v of dbColumnsArray) {
       if(!rawDataValues[i] !== undefined) {
          if (rawDataValues[i] !== '') {
            validDbColumns.push(v)
            dataValues.push(rawDataValues[i])
          }
        }
        i++;
      }
      const combinedKey = values.slice(0,4).join('-')
      if (locationIdMap.has(combinedKey)) {
        const location_id = locationIdMap.get(combinedKey)
        const rawSqlInsert = `INSERT INTO google_mobility.mobility_change(location_id, time, ${validDbColumns}) VALUES ('${location_id}', '${time}', ${dataValues});`;
        console.log(rawSqlInsert)
        await insertRow(rawSqlInsert)
      }
    }
  }
  return result
}

const getMaxTime = async () => 
  await knex.raw(`select max(time) from google_mobility.mobility_change`)
     .then(data => data)

const insertRow = async (query) =>
  await knex.raw(query)
  .then(data => data)
   
const processData = async () => {
  try {
    const maxDBTime = (await getMaxTime()).rows[0].max
    let i = 0
    const locations = await selectLocData()
    const combinedKeyToLocMap = new Map()
    for (const loc of locations) {
      combinedKeyToLocMap.set(`${loc.country_region_code}-${loc.country_region}-${loc.sub_region_1}-${loc.sub_region_2}`, loc.id)
    }
    const r = await newRowValues(combinedKeyToLocMap, maxDBTime)
  } catch (e) {
    console.log(e)
  }
}

;(async () => {
    await processData()
    knex.destroy()
})()

