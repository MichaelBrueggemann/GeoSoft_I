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
    /* This Form only has client side error responses, as the Leaflet Functions take care of providing valid geojson Data. 
    The whole request body taht is send to the server via this form is still server site checked*/
    document.getElementById("submit_map_form").addEventListener("click", async function(event)
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
            //MAP_FORM.classList.add("was-validated")

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
            let result = await add_new_station(request_body)
            
            if (!result.ok) 
            {
                let json_result = await result.json()
                
                console.log(result)

                /* NOTE: Funktioniert noch nicht. Die Idee ist dass der Server pro Feld ein Fehlerobjekt zurückgibt (muss noch definiert werden). 
                NOTE: Der Client prüft dann welche der ihm bekannten Felder im Fehlerobjekt auftauchen und konstruiert dementsprechende die Fehlernachricht. 
                NOTE: Taucht ein Feld öfter auf, so wird der nächste Fehler an die passende Nachricht angehangen. */
                if (json_result.error.path === 'properties.name')
                {
                    // add CSS-class to enable custom styling
                    document.getElementById("input_name").classList.add("is-invalid")

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_name").innerHTML = json_result.error_message
                }

                if (json_result.error.path === 'properties.description')
                {
                    // add CSS-class to enable custom styling
                    document.getElementById("input_description").classList.add("is-invalid")

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_description").innerHTML = json_result.error_message
                }

                if (json_result.error.path === 'properties.url')
                {
                    // add CSS-class to enable custom styling
                    document.getElementById("input_url").classList.add("is-invalid")

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_url").innerHTML = json_result.error_message
                }    
            }
            else
            {
                MAP_FORM.reset()

                // TODO: Hier einmal in allen kontrollelementen des Forms die CSS-Klasse entfernen, damit das Styling durch den Server und nicht durch den Client vorgenommen werden kann.
                // if (textarea_geojson.classList.contains("is-invalid"))
                // {
                //     textarea_geojson.classList.remove("is-invalid")
                // }

                // resets all elements drawn with the draw-tool
                drawnItems.clearLayers()

                // deactivate draw control on map
                map.removeControl(drawControl)

                // hide coressponding form element
                leave_add_station_mode(MAP_FORM)
            }
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

    let textarea_geojson = document.getElementById("textarea_geoJSON")

    // submit_geojson_textarea_form button
    document.getElementById("submit_geojson_textarea_form").addEventListener("click", async function(event)
    {
            event.preventDefault()

            try 
            {
                // parse body from form
                let request_body = JSON.parse(textarea_geojson.value)
                
                // send data to API
                let result = await add_new_station(request_body)
                
                // result is not "ok" when an HTTP Error occurs (Errorcode > 299)
                if (!result.ok) 
                {
                    let json_result = await result.json()
                    
                    // add CSS-class to enable custom styling
                    textarea_geojson.classList.add("is-invalid")

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_geojson").innerHTML = json_result.error_message
                }
                else
                {
                    GEOJSON_TEXTAREA_FORM.reset()

                    if (textarea_geojson.classList.contains("is-invalid"))
                    {
                        textarea_geojson.classList.remove("is-invalid")
                    }
                    // hide coressponding form element
                    leave_add_station_mode(GEOJSON_TEXTAREA_FORM)
                }

                
            } 
            catch (error) 
            {
                // console.log("Fehler beim Lesen der GeoJSON: ", error)
            }
            
    })
    

    // cancel_geojson_textarea_form button
    document.getElementById("cancel_geojson_textarea_form").addEventListener("click", function()
    {
        // reset form
        GEOJSON_TEXTAREA_FORM.reset()

        if (textarea_geojson.classList.contains("is-invalid"))
        {
            textarea_geojson.classList.remove("is-invalid")
        }

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
    const GEOJSON_FILE_UPLOAD = document.getElementById("file_upload_geoJSON")

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
    document.getElementById("submit_geojson_upload_form").addEventListener("click", async function(event)
    {
            event.preventDefault()
           
            let upload_form_data = document.getElementById("hidden_geojson_data_from_upload")
    
            try 
            {
                let request_body = JSON.parse(upload_form_data.value)  
                
                // send data to API
                let result = await add_new_station(request_body)
        
                if (!result.ok) 
                {
                    let json_result = await result.json()
                    
                    // add CSS-class to enable custom styling
                    GEOJSON_FILE_UPLOAD.classList.add("is-invalid")

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_fileupload_geojson").innerHTML = json_result.error_message
                }
                else
                {
                    GEOJSON_UPLOAD_FORM.reset()

                    if (GEOJSON_FILE_UPLOAD.classList.contains("is-invalid"))
                    {
                        GEOJSON_FILE_UPLOAD.classList.remove("is-invalid")
                    }

                    // restore sample data after reset
                    document.getElementById("sample_geojson").value = JSON.stringify(sample_geojson, null, 2)
            
                    // hide coressponding form element
                    leave_add_station_mode(GEOJSON_UPLOAD_FORM)
                }
                
            } 
            catch (error) 
            {
                // console.log("Keine GeoJSON eingegeben: ", error)
                // if for some reason a error occurs nothing should happen after the event
            }  
    })
    

    // cancel_geojson_upload_form button
    document.getElementById("cancel_geojson_upload_form").addEventListener("click", function()
    {
        // reset file upload area
        document.getElementById("file_upload_geoJSON").value = ""


        if (GEOJSON_FILE_UPLOAD.classList.contains("is-invalid"))
        {
            GEOJSON_FILE_UPLOAD.classList.remove("is-invalid")
        }

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


// Testing
let correct_station = {
    "type": "Feature",
    "properties": {
      "name": "Korrekte Station",
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
  }

let incorrect_station = {
    "type": "Feature",
    "properties": {
        "name": "Test",
        "description": "Test",
        "url": "https://de.wikipedia.org/wiki/Prinzipalmarkt"
      },
    "geometry": {
      "coordinates": [
        [
          [
            "7579708",
            "51.99079"
          ],
          [
            "7.593269",
            "51.992481"
          ],
          [
            "7.579536",
            "51.996497"
          ],
          [
            "7.579708",
            "51.99079"
          ]
        ]
      ],
      "type": "Polygon"
    }
  }
