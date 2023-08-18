"use strict"

/* This schema defines a valid GeoJSON input. 
This schema is documented more then the other schema to help understanding the used library*/
const OUR_SPECIAL_GEOJSON_SCHEMA = 
{
    'type': {
        // the validator method "equals(str, comparison)" from validator.js
        equals: {

        // message forwarded to the user. A so called "field-level message"
        errorMessage: "GeoJSON muss Typ 'Feature' haben!",
            // arguments passed to "equals()" as the "comparison" argument
            options: "Feature"
        } 
    },
    'properties': {
        notEmpty: {
            errorMessage: "Die GeoJSON muss ein Feld 'properties' besitzen. Hier müssen die Schlüssel 'name' und 'description' existieren!",

            // "bail" aborts the further validation proccess, if this validator isn't satisfied but thus also not sending any other error message
            bail: true
        }
    },
    'properties.name': {
        trim: true,
        notEmpty: {
            errorMessage: "Der Name darf nicht leer sein!",
        },
        isAlphanumeric: {
            errorMessage: "Der Name darf nur Buchstaben oder Zahlen enthalten!",
            // this array contains the arguments that are forwarded to "isAlphanumeric(str, [locale, options])" from "validator.js"
            options: ["de-DE", {ignore: " -_"}]
        },
    },
    'properties.description': {
        trim: true,
        notEmpty: {
            errorMessage: "Die Beschreibung darf nicht leer sein!",
        },
        isAlphanumeric: {
            errorMessage: "Die Beschreibung darf nur Buchstaben oder Zahlen enthalten!",
            // this array contains the arguments that are forwarded to "isAlphanumeric(str, [locale, options])" from "validator.js"
            options: ["de-DE", {ignore: " -_"}]
        },
    },
    'properties.url': {
        optional: true,
    },
    'geometry':{
        notEmpty: {
            errorMessage: "Die GeoJSON muss ein Feld 'geometry' besitzen. Hier müssen die Schlüssel 'coordinates' und 'type' existieren!",

            // "bail" aborts the further validation proccess, if this validator isn't satisfied but thus also not sending any other error message
            bail: true
        }
    },
    'geometry.coordinates.*': {
        trim: true,
        notEmpty: {
            errorMessage: "Die Koordinaten dürfen nicht leer sein!",
        },
        // TODO: Testen warum Floats nicht richtig erkannt werden
        custom: {
            errorMessage: "Die Koordinaten müssen Längen- und Breitengrad enthalten!",
            options: {
                // custom validator function
                function(value)
                {
                    console.log("value", value)
                    return /^\d+\.\d+/.test(value)
                }
            }
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