"use strict"
const JOI = require("joi")

// this schema defines a valid Point. I wasnt able to achieve typechecking to ensure that the value is a Float, or better a LatLng. I tried numerous libraries like "ajv", "joi", "express-validator", but unfurtunately couldn't achieve this. We can't use a RegExp as Leaflet doesn't add coordinates as Strings, so this would cause unwanted errors.
const POINT_SCHEMA = JOI.array().max(2).items(
    JOI.number().required()
    )

// this schema defines a valid Point. I wasnt able to achieve typechecking to ensure that the value is a Float, or better a LatLng. I tried numerous libraries like "ajv", "joi", "express-validator", but unfurtunately couldn't achieve this. We can't use a RegExp as Leaflet doesn't add coordinates as Strings, so this would cause unwanted errors.
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
        url: JOI.string().custom(function(value)
        {
            // wrap URL String in URL() Class to prevent errors regarding ASCII Characters in the URL String
            return new URL(value)
        }).uri({ 
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
    return {hasError, errorDetails}
  }
  else
  {
    let hasError = false
    return {hasError, value}
  }
}

module.exports = {GEOJSON_SCHEMA, validate_input}