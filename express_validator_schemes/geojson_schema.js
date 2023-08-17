"use strict"

/* This schema defines a valid GeoJSOn input. 
This schema is documented more then the other schema to help understanding the used library*/
const OUR_SPECIAL_GEOJSON_SCHEMA = 
{
    'type': {
        // the validator method "equals(str, comparison)" from validator.js
        equals: {

        // message forwarded to the user
        errorMessage: "GeoJSON muss Typ 'Feature' haben!",
            // arguments passed to "equals()" as the "comparison" argument
            options: "Feature"
        } 
    },
    'properties.name': {
        trim: true,
        notEmpty: {
            errorMessage: "Der Name darf nicht leer sein!",
            // "bail" aborts the further validation proccess, if this validator isn't satisfied
            bail: true
        },
        isAlphanumeric: {
            errorMessage: "Der Name darf nur Buchstaben oder Zahlen enthalten!",
            ignore: " -_"
            
        },
    },
    'geometry.type': {
        /* this is a custom validator method, that isn't built-in in validator.js.
        "custom" is the name of the validator method, but i could also be any other name. The only requirement is
        that no tag is duplicate (as JS objects can only have unique tags!)*/
        custom: {
            errorMessage: "Geometry muss Typ 'Polygon' oder 'Point' haben!",
            options: 
                // custom validator function
                function(value)
                {
                    return value === "Polygon" || value === "Point"
                }
        }
    }
}

module.exports = {OUR_SPECIAL_GEOJSON_SCHEMA}