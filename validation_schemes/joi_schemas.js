"use strict"
const JOI = require("joi")

// this schema defines a valid Point. 
const POINT_SCHEMA = JOI.array().items(
    JOI.number().min(-90).max(90).required(),
    JOI.number().min(-180).max(180).required()
).length(2).required()

// this schema defines a valid Polygon. 
const POLYGON_SCHEMA = JOI.array().max(1).items(
    JOI.array().items(
        POINT_SCHEMA
    )).required()

const GEOMETRY_SCHEMA = JOI.object(
    {
    coordinates: 
    JOI.alternatives().conditional('type', {is: 'Point', then: POINT_SCHEMA, otherwise: POLYGON_SCHEMA}),
    type: 
    JOI.string().custom(function(value)
    {
        if (value !== 'Point' && value !== 'Polygon')
        {
            throw new Error("'type' must be 'Point' or 'Polygon'")
        }
    }).required(),
    }
  )

const PROPERTIES_SCHEMA = JOI.object(
    {
        // the RegEx allows letters, numbers and whitespace
        name: JOI.string().pattern(/^[a-zA-Z0-9\s]*$/).required(), 
        description: JOI.string().pattern(/^[a-zA-Z0-9\s]*$/).required(),
        url: JOI.string().uri({ 
            allowRelative: false,
            relativeOnly: false,
            domain: {tlds: {allow: true}}
        }).allow("").message("The URL has to be of format: 'https://DomainName.Domain'")
    }
)


const GEOJSON_SCHEMA = JOI.object(
    {
        type: JOI.string().custom(function(value)
        {
            if (value !== 'Feature')
        {
            throw new Error("'type' must be 'Feature'")
        }
        }).required(),
        properties: PROPERTIES_SCHEMA.required(),
        geometry: GEOMETRY_SCHEMA.required()
    }
  ).required().options({abortEarly: false}) // makes sure, each error is returned


/**
 * 
 * @param {any} input - any input that should be validated.
 * @param {} schema - JOI-Schema to validate input against.
 * @returns The validated value. Else it returns an array of all errors
 */
function validate_input(input, schema)
{
  const {value, error} = schema.validate(input)

  if (error)
  {
    let errorDetails = error.details
    let hasError = true
    console.log(errorDetails)
    return {hasError, errorDetails}
  }
  else
  {
    let hasError = false
    return {hasError, value}
  }
}

module.exports = {POINT_SCHEMA, GEOJSON_SCHEMA, validate_input}