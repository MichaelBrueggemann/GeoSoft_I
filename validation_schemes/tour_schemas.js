"use strict"

const JOI = require("joi")
const {GEOJSON_SCHEMA} = require ("./joi_schemas")


const TOUR_SCHEMA = JOI.object()


module.exports = {TOUR_SCHEMA}