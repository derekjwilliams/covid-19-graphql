import { promises as fsPromises } from 'fs'
import {createWriteStream} from 'fs';
import moment from 'moment'
import uuid from 'uuid'
import dotenv from 'dotenv'
dotenv.config()
const origin = '../Global_Mobility_Report.csv'
const locationsInsertDestination = '../init/01-locations.sql';
const valuesInsertDestination = '../init/02-values.sql';
const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

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

const combinedMetadata = new Map([...locationMetadata, ['date', { type: 'date' }], ...valuesMetadata])

const getValue = (value, header, metadata) => {
  let result
  if (metadata.has(header)) {
    const type = metadata.get(header).type
    if (type === 'varchar') {
      if (value === undefined) {
        result = '\'\''
      }
      else if (value.length <= metadata.get(header).length) {
        result = `\'${value.replace("'", "''").replace(/^"|"$/g, '')}\'`
      }
      else {
        console.log(`${header} value too long: ${value} length greater than ${metadata.get(header).length}`)
        result = ''
      }
    }
    else if (type === 'number') {
      result = +value
    }
    else if (type === 'date') {
      if (value.trim().length != 0) {
        result = moment.utc(value, 'YYYY-MM-DD').toISOString()
      }
    } else {
      result = value
    }
  }
  return result
}
const writeSqlLocationInserts = async () => {
  const data = await fsPromises.readFile(origin, 'utf8')
  const uniqueLocationsMap = new Map() // 'ab_df_foo_bar' => 'a798d483-3a6c-4aa7-9020-bed660c09223'
  const lines = data.split(data.indexOf('\r\n') !== -1 ? '\r\n' : '\n')
  const headers = lines[0].split(',')
  const dataColumns = Array.from(valuesMetadata.values()).map(d => d.kind).join(',')

  var locationInsertStream = createWriteStream(locationsInsertDestination, {flags: 'w'});
  var valueInsertStream = createWriteStream(valuesInsertDestination, {flags: 'w'});
  lines.shift()
  lines.forEach(line => {
    if (!!line) {
      const values = line.split(regex);
      if (values.length <= headers.length) {
        let valueMap = new Map()
        const candidateUniqueLocation = values.slice(0, locationMetadata.size).join('_')
        if (!uniqueLocationsMap.has(candidateUniqueLocation)) {
          const locationId = uuid.v4()
          uniqueLocationsMap.set(candidateUniqueLocation, locationId)
          Array.from(locationMetadata.keys()).forEach((header, index) => valueMap.set(header, getValue(values[index], header, locationMetadata)))
          locationInsertStream.write(`INSERT INTO google_mobility.mobility_change_location (id, ${Array.from(valueMap.keys())}) VALUES ('${locationId}', ${Array.from(valueMap.values())});\n`)
        }
        const data = values.slice(locationMetadata.size + 1)
        if (data.length === valuesMetadata.size) {
          valueInsertStream.write(`INSERT INTO google_mobility.mobility_change(id, location_id, time, ${dataColumns}) VALUES ('${uuid.v4()}','${uniqueLocationsMap.get(candidateUniqueLocation)}', '${values[locationMetadata.size]}', ${ data.map(_ => _/100).join(',')});\n`);
        }
      }
    }
  })
}


const processData = async () => {
  writeSqlLocationInserts()
}

processData()
