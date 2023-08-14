"use strict"
import { add_new_station } from "./stations.js"

/**
 * Tests if the input is a valid geojson
 * @param {} object Object to check.
 */
function is_geojson(object) 
{
    // Check if the object has the necessary GeoJSON properties
    if (!(object.hasOwnProperty('type') && object.hasOwnProperty('properties')  && object.hasOwnProperty('geometry')))
    {
      return false
    }  

    // Check if the "type" is "Feature" as it should be for GeoJSON
    if (object.type !== 'Feature') 
    {
        return false
    }

    // check if the mandatory properties exists and are not-empty strings
    if (!(object.properties.hasOwnProperty('name') && object.properties.name !== "" && object.properties.hasOwnProperty('description') && object.properties.description !== ""))
    {
        return false
    }

    // check, if the given url is not-empty.
    if (object.properties.hasOwnProperty("url") && object.properties.url === "")
    {
        return false
    }

    // Check if "geometry" itself contains "type" and "coordinates"
    if (!(object.geometry.hasOwnProperty('type') && object.geometry.hasOwnProperty('coordinates')))
    {
        return false
    }

    // check if the "type" is correct
    if (!(object.geometry.type === "Polygon" || object.geometry.type === "Point"))
    {
        return false
    }
    // else
    return true
}
    

function enter_add_station_mode(edit_style)
{
    switch(edit_style)
    {
        case "map":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"

            // show map form
            document.getElementById("map_form").style.display = "block"
            break

        case "textarea":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"

            // show geojson_texarea form
            document.getElementById("geojson_textarea_form").style.display = "block"
            break

        case "file-upload":
            // hide buttons
            document.getElementById("add_station_button_area").style.display = "none"

            // show geojson_texarea form
            document.getElementById("geojson_upload_form").style.display = "block"
            break
    }
}

/**
 * Hides the currently shown form and returns to the button view "#add_station_button_area"
 * @param {} form - Form that should be hidden
 */
function leave_add_station_mode(form)
{
    // hide form element
    form.style.display = "none"

    // show buttons
    document.getElementById("add_station_button_area").style.display = "block"
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the map_form form element
 * @param {Object} map - Leaflet Map for form interactions
 * @param {object} drawnItems - Leaflet Draw Layer for a Leaflet Draw Control
 * @param {object} drawControl - Draw Control instance from Leaflet Draw
 * */
function prepare_map_form(map, drawnItems, drawControl)
{
    const MAP_FORM = document.getElementById('map_form')

    // open_map_form button
    document.getElementById("open_map_form").addEventListener("click", function()
    {
        // reset validation state
        if (MAP_FORM.classList.contains("was-validated"))
        {
            MAP_FORM.classList.remove("was-validated")
        }


        // add stations via map
        enter_add_station_mode("map")

        // activate draw control on map
        map.addControl(drawControl)
    })

    // submit_map_form button
    document.getElementById("submit_map_form").addEventListener("click", function(event)
    {
        event.preventDefault()

        // check form validity with JS constraint validation API
        if (!MAP_FORM.checkValidity())
        {
            event.preventDefault()

            // add bootstrap css-class for styling of the error messages
            MAP_FORM.classList.add("was-validated")
        }
        else
        {
            // add bootstrap css-class for styling of the error messages
            MAP_FORM.classList.add("was-validated")

            let formData = new FormData(MAP_FORM)
        
            // parse body from formData
            let request_body = 
            {
                type: JSON.parse(formData.get("hidden_geojson_data_from_map_feature")).type,
                properties: {
                    name: formData.get("input_name"),
                    description: formData.get("input_description"),
                    url: formData.get("input_url")
                },
                geometry: JSON.parse(formData.get("hidden_geojson_data_from_map_feature")).geometry
            }

            // send data to API
            add_new_station(request_body)

            MAP_FORM.reset()

            // resets all elements drawn with the draw-tool
            drawnItems.clearLayers() 

            // hide coressponding form element
            leave_add_station_mode(MAP_FORM)
        }
    })

    // cancel_map_form button
    document.getElementById("cancel_map_form").addEventListener("click", function()
    {
        // deactivate draw control on map
        map.removeControl(drawControl)

        MAP_FORM.reset()

        // reset all unfinished map drawings
        drawnItems.clearLayers()

        // hide coressponding form element
        leave_add_station_mode(MAP_FORM)
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the geojson_textarea_form form element
 * */ 
function prepare_geojson_textarea_form()
{
    const GEOJSON_TEXTAREA_FORM = document.getElementById("geojson_textarea_form")

    // open_geojson_textarea_form button
    document.getElementById("open_geojson_textarea_form").addEventListener("click", function()
    {
        // reset validation state
        if (GEOJSON_TEXTAREA_FORM.classList.contains("was-validated"))
        {
            GEOJSON_TEXTAREA_FORM.classList.remove("was-validated")
        }

        // add stations via textarea
        enter_add_station_mode("textarea")
    })

    // validate textarea_geoJSON control element
    document.getElementById("textarea_geoJSON").addEventListener("input", function()
    {
        let value_of_geojson_textarea = this.value

        let geojson = {}

        try 
        {
            geojson = JSON.parse(value_of_geojson_textarea)
        } 
        catch (error) 
        {
            // console.log("Keine GeoJSON eingegeben: ", error)
        }
        // if the input isn't a correct GeoJSON
        if (!is_geojson(geojson))
        {
            // invalidate textarea for later validation via HTML constraint validation API
            this.setCustomValidity("noGeoJSON")
        }
        else
        {
            // reset, to prevent wrong validation results
            this.setCustomValidity("")
        }
    })

    // submit_geojson_textarea_form button
    document.getElementById("submit_geojson_textarea_form").addEventListener("click", function(event)
    {
        if (!GEOJSON_TEXTAREA_FORM.checkValidity())
        {
            event.preventDefault()

            // add bootstrap css-class for styling of the error messages
            GEOJSON_TEXTAREA_FORM.classList.add("was-validated")
        }
        else
        {
            event.preventDefault()

            // add bootstrap css-class for styling of the error messages
            GEOJSON_TEXTAREA_FORM.classList.add("was-validated")

            let textarea_geojson = document.getElementById("textarea_geoJSON")

            try 
            {
                // parse body from form
                let request_body = JSON.parse(textarea_geojson.value)
                
                // send data to API
                add_new_station(request_body)

                GEOJSON_TEXTAREA_FORM.reset()

                // hide coressponding form element
                leave_add_station_mode(GEOJSON_TEXTAREA_FORM)
            } 
            catch (error) 
            {
                // console.log("Fehler beim Lesen der GeoJSON: ", error)
            }
            
        }
    })

    // cancel_geojson_textarea_form button
    document.getElementById("cancel_geojson_textarea_form").addEventListener("click", function()
    {
        // reset form
        GEOJSON_TEXTAREA_FORM.reset()

        // hide coressponding form element
        leave_add_station_mode(GEOJSON_TEXTAREA_FORM)
    })

    // show_sample_geojson button
    let show_sample_geojson_button = document.getElementById("show_sample_geojson")
    show_sample_geojson_button.setAttribute("data-bs-toggle", "modal")
    show_sample_geojson_button.setAttribute("data-bs-target", "#sample_geojson_popup")
    show_sample_geojson_button.addEventListener("click", function()
    {
        let textarea = document.getElementById("sample_geojson_textarea")
        textarea.value = JSON.stringify(
        {
            "type": "Feature",
            "properties": {
                "name": "Prinzipalmarkt",
                "description": "Das ist der Prinzipalmarkt",
                "url": "https://de.wikipedia.org/wiki/Prinzipalmarkt"
            },
            "geometry": {
              "coordinates": [
                7.628199238097352,
                51.962239849033296
              ],
              "type": "Point"
            }
        }, null, 2)
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the geojson_file_upload input element
 * */ 
function prepare_geojson_file_upload()
{
    // adds the file content uploaded to the input field to the textarea
    let file_upload_geoJSON = document.getElementById('file_upload_geoJSON')
    file_upload_geoJSON.addEventListener('change', function(event) 
    {
        let file = event.target.files[0]

        // if no file is inputed
        if (!file) 
        {
            return
        }

        let reader = new FileReader()
        reader.onload = function(event) 
        {
            let contents = event.target.result
            document.getElementById('hidden_geojson_data_from_upload').value = contents

            // validate file_upload_geoJSON control element
            let hidden_geojson_data_from_upload = document.getElementById('hidden_geojson_data_from_upload')

            let geojson = {}

            try 
            {
                geojson = JSON.parse(hidden_geojson_data_from_upload.value)
            } 
            catch (error) 
            {
                // console.log("Keine GeoJSON eingegeben: ", error)
            }
            finally
            {
                // if the input isn't a correct GeoJSON
                if (!is_geojson(geojson))
                {
                    // invalidate textarea for later validation via HTML constraint validation API
                    file_upload_geoJSON.setCustomValidity("noGeoJSON")
                }
                else
                {
                    // reset, to prevent wrong validation results
                    file_upload_geoJSON.setCustomValidity("")
                }
            }
            
        }
        reader.readAsText(file)
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the geojson_upload_form form element
 * */ 
function prepare_geojson_upload_form()
{
    prepare_geojson_file_upload()

    const GEOJSON_UPLOAD_FORM = document.getElementById("geojson_upload_form")

    // open_geojson_upload_form button
    document.getElementById("open_geojson_upload_form").addEventListener("click", function()
    {
        // reset validation state
        if (GEOJSON_UPLOAD_FORM.classList.contains("was-validated"))
        {
            GEOJSON_UPLOAD_FORM.classList.remove("was-validated")
        }

        // add stations via textarea
        enter_add_station_mode("file-upload")
    })

    let sample_geojson = 
    {
        "type": "Feature",
        "properties": {
            "name": "nicht-leer",
            "description": "nicht-leer",
            "url": "Optional"
        },
        "geometry": {
            "coordinates": ["Breitengrad", "Längengrad"],
            "type": "Polygon oder Point"
        }
    }

    // submit_geojson_upload_form button
    document.getElementById("submit_geojson_upload_form").addEventListener("click", function(event)
    {
        
        if (!GEOJSON_UPLOAD_FORM.checkValidity())
        {
            event.preventDefault()

            // add bootstrap css-class for styling of the error messages
            GEOJSON_UPLOAD_FORM.classList.add("was-validated")
        }
        else
        {
            event.preventDefault()

            // add bootstrap css-class for styling of the error messages
            GEOJSON_UPLOAD_FORM.classList.add("was-validated")
           
            let upload_form_data = document.getElementById("hidden_geojson_data_from_upload")
    
            try 
            {
                let request_body = JSON.parse(upload_form_data.value)  
                
                // send data to API
                add_new_station(request_body)
        
                GEOJSON_UPLOAD_FORM.reset()

                // restore sample data after reset
                document.getElementById("sample_geojson").value = JSON.stringify(sample_geojson, null, 2)
        
                // hide coressponding form element
                leave_add_station_mode(GEOJSON_UPLOAD_FORM)
            } 
            catch (error) 
            {
                // console.log("Keine GeoJSON eingegeben: ", error)
                // if for some reason a error occurs nothing should happen after the event
            }  
        }
    })

    // cancel_geojson_upload_form button
    document.getElementById("cancel_geojson_upload_form").addEventListener("click", function()
    {
        // reset file upload area
        document.getElementById("file_upload_geoJSON").value = ""

        // hide coressponding form element
        leave_add_station_mode(GEOJSON_UPLOAD_FORM)
    })

    // show sample geojson in form
    document.getElementById("sample_geojson").value = JSON.stringify(sample_geojson, null, 2) 
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the buttons to choose in which style the user wants to add a new station and to leave the form.
 * @param {object} map - Map for the map_form
 * @param {object} drawnItems - Leaflet Draw Layer for a Leaflet Draw Control
 * @param {object} drawControl - Draw Control instance from Leaflet Draw
 * */ 
export function prepare_form_buttons(map, drawnItems, drawControl)
{
    prepare_map_form(map, drawnItems, drawControl)
    
    prepare_geojson_textarea_form()
    
    prepare_geojson_upload_form()
}