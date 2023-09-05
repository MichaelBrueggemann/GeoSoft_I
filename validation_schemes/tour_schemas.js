"use strict"

const JOI = require("joi")
const {POINT_SCHEMA, GEOJSON_SCHEMA} = require ("./joi_schemas")

const STATIONS_SCHEMA = JOI.array().items(
    GEOJSON_SCHEMA.keys({
        _id: JOI.string().pattern(/^[a-zA-Z0-9\s]*$/).required(),
    })
    ).min(2).required()

const SEGMENTS_SCHEMA = JOI.array().items(
    JOI.array().items(
        POINT_SCHEMA
    ).required()
).required()

const INSTRUCTIONS_SCHEMA = JOI.array().items(
    JOI.object(
        {
            distance: JOI.number().required(),
            text: JOI.string().required(),
        }
    ).required().unknown(true)
).required()

const TOUR_SCHEMA = JOI.object(
    {
        // the RegEx allows letters, numbers and whitespace
        name: JOI.string().pattern(/^[a-zäöüßA-ZÄÖÜ0-9\s]*$/).required(),
        stations: STATIONS_SCHEMA,
        segments: SEGMENTS_SCHEMA,
        instructions: INSTRUCTIONS_SCHEMA,
        distance: JOI.number().required(),
    }
).required().options({abortEarly: false}) // makes sure, each error is returned


module.exports = {TOUR_SCHEMA}