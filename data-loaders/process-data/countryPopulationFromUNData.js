import { promises as fsPromises } from 'fs'

const dataOrigin = '../additional-data/WPP2019_TotalPopulationBySex.csv'
const codeCountryPopulation = (data) => {
  const result = []
  const lines = data.split('\r\n')
  const lastLines = lines.filter((line,index) => {
    if (index === 0) {
      return false
    }
    const values = line.split(',')
    const year = values[4]
    const type = values[3]
    const iso3166Code = values[0]
    if (year === '2020' && type === 'Medium' && iso3166Code <= 894) {
      return true
    }
    return false
  })
  result.push('code,location,population')
  lastLines.forEach((line) => {
    const values = line.split(',')
    result.push(`${values[0]},${values[1]},${Math.round(values[8])}`)
  })
  return result
}
const processData = async () => 
{
  const rawPopulationData = await fsPromises.readFile(dataOrigin, 'utf8')
  const populationData = codeCountryPopulation(rawPopulationData)

  await fsPromises.writeFile('population.csv', populationData.join('\n'))
}

processData()

/* example data
LocID,Location,VarID,Variant,Time,MidPeriod,PopMale,PopFemale,PopTotal,PopDensity
4,Afghanistan,2,Medium,1950,1950.5,4099.243,3652.874,7752.117,11.874
4,Afghanistan,2,Medium,1951,1951.5,4134.756,3705.395,7840.151,12.009
4,Afghanistan,2,Medium,1952,1952.5,4174.45,3761.546,7935.996,12.156
4,Afghanistan,2,Medium,1953,1953.5,4218.336,3821.348,8039.684,12.315
4,Afghanistan,2,Medium,1954,1954.5,4266.484,3884.832,8151.316,12.486
4,Afghanistan,2,Medium,1955,1955.5,4318.945,3952.047,8270.992,12.669
4,Afghanistan,2,Medium,1956,1956.5,4375.8,4023.073,8398.873,12.865
4,Afghanistan,2,Medium,1957,1957.5,4437.157,4098,8535.157,13.073
4,Afghanistan,2,Medium,1958,1958.5,4503.156,4176.941,8680.097,13.295
4,Afghanistan,2,Medium,1959,1959.5,4573.914,4260.033,8833.947,13.531
4,Afghanistan,2,Medium,1960,1960.5,4649.573,4347.394,8996.967,13.781
4,Afghanistan,2,Medium,1961,1961.5,4730.25,4439.156,9169.406,14.045
*/