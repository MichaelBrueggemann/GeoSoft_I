"use strict"
const JOI = require("joi")

// this schema defines a valid Point. I wasnt able to achieve typechecking to ensure that the value is a Float, or better a LatLng. I tried numerous libraries like "ajv", "joi", "express-validator", but unfurtunately couldn't achieve this.
const POINT_SCHEMA = JOI.array().max(2).items(
    JOI.number().required()
    )

// this schema defines a valid Polygon. I wasnt able to achieve typechecking to ensure that the value is a Float, or better a LatLng. I tried numerous libraries like "ajv", "joi", "express-validator", but unfurtunately couldn't achieve this.
const POLYGON_SCHEMA = JOI.array().max(1).items(
    JOI.array().items(
        JOI.array().items(JOI.number().required())
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
        url: JOI.string().uri().allow("")
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
        }),
        properties: PROPERTIES_SCHEMA,
        geometry: GEOMETRY_SCHEMA
    }
  ).options({abortEarly: false}) // makes sure, each error is return


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
    return {hasError, errorDetails}
  }
  else
  {
    let hasError = false
    return {hasError, value}
  }
}

module.exports = {GEOJSON_SCHEMA, validate_input}