import { promises as fsPromises } from "fs"
import moment from "moment"
import uuid from "uuid"
import dotenv from "dotenv"
dotenv.config()

const locationsInsertDestination = "./01-locations.sql";
const valuesInsertDestination = "./02-values.sql";

const processUSData = async () => {
  const rawPopulationData = await fsPromises.readFile(usPopulationsOrigin,"utf8")
}