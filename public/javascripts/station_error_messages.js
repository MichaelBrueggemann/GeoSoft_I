"use strict"


/**
 * Constructs an Error-Message from the error object
 * @param {*} error Error object returned by "joi" validate() function.
 * @param {} field Name of the Field in the control element, where the error occured
 * @returns {string} The Error Message as a string
 */
export function construct_error_message(error, field)
{
    return `Im Feld '${field}' ist ein Fehler. </br> Fehlernachricht: </br> ${error.message} </br></br>`
}

/**
 * This function checks each error of "erros", if it's label is one of those defined in this function. If so, a custom error message is 
 * added to the error_message string.
 * @param {*} errors - joi errors array returned by "schema.validate()"
 * @param {*} control_element - the control element which should be styled with an error message
 * @returns error message string containing all errors that occured by the API-Call
 */
export function prepare_server_error_message(errors, control_element)
{
    let error_message = ""

    for (const ERROR of errors)
    {
        // invalidates any field that is not defined in the schemas in "joi_schemas.js"
        if (!ERROR.type.includes('object.unknown'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }
            
            error_message += construct_error_message(ERROR, `${ERROR.context.label}`)

            continue
        }

        if (!ERROR.context.label.includes('type'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }
            
            error_message += construct_error_message(ERROR, "type")

            continue
        }

        if (!ERROR.context.label.includes('properties.name'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }
            
            error_message += construct_error_message(ERROR, "Name")

            continue
        }

        if (!ERROR.context.label.includes('properties.description'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "description")

            continue
        }

        if (!ERROR.context.label.includes('properties.url'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "url")
        }

        if (!ERROR.context.label.includes('geometry'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "geometry")
        }
        
        if (!ERROR.context.label.includes('properties'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "properties")
        }

        if (!ERROR.context.label.includes('coordinates'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "coordinates")
        }

        if (!ERROR.context.label.includes('geometry.type'))
        {
            // pass
        }
        else
        {
            // invalidate the control element just once
            if (!document.getElementById(control_element).classList.contains("is-invalid"))
            {
                // add CSS-class to enable custom styling
                document.getElementById(control_element).classList.add("is-invalid")
            }

            error_message += construct_error_message(ERROR, "geometry.type")
        }
    }
    return error_message
}