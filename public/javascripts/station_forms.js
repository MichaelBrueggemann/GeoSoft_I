"use strict"
import { add_new_station } from "./stations.js"

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
        if (MAP_FORM.classList.contains("was-validated"))
        {
            MAP_FORM.classList.remove("was-validated")
        }

        if (!MAP_FORM.classList.contains("needs-validation"))
        {
            MAP_FORM.classList.add("needs-validation")
        }

        // add stations via map
        enter_add_station_mode("map")

        // activate draw control on map
        map.addControl(drawControl)
    })

    // submit_map_form button
    document.getElementById("submit_map_form").addEventListener("click", function(event)
    {
        console.log(MAP_FORM.checkValidity())
        event.preventDefault()

        // check form validity with JS constraint validation API
        if (!MAP_FORM.checkValidity())
        {
            event.preventDefault()
            // TODO: Warum wird das benutzt?
            event.stopPropagation()
            MAP_FORM.classList.add("was-validated")
        }
        else
        {
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
    // open_geojson_textarea_form button
    document.getElementById("open_geojson_textarea_form").addEventListener("click", function()
    {
        // add stations via textarea
        enter_add_station_mode("textarea")
    })

    // submit_geojson_textarea_form button
    document.getElementById("submit_geojson_textarea_form").addEventListener("click", function(event)
    {
        event.preventDefault()
        let form = document.getElementById('geojson_textarea_form')
        
        let textarea_geojson = document.getElementById("textarea_geoJSON")

        // parse body from formData
        let request_body = JSON.parse(textarea_geojson.value)
        
        // send data to API
        add_new_station(request_body)

        form.reset()

        // hide coressponding form element
        leave_add_station_mode(form)
    })

    // cancel_geojson_textarea_form button
    document.getElementById("cancel_geojson_textarea_form").addEventListener("click", function()
    {
        let geojson_textarea_form = document.getElementById("geojson_textarea_form")

        // reset form
        geojson_textarea_form.reset()

        // hide coressponding form element
        leave_add_station_mode(geojson_textarea_form)
    })

    // show_sample_geojson button
    document.getElementById("show_sample_geojson").addEventListener("click", function()
    {
        let textarea = document.getElementById("textarea_geoJSON")
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
    document.getElementById('file_upload_geoJSON').addEventListener('change', function(event) 
    {
        let file = event.target.files[0]

        // if no file is inputed
        if (!file) return
    
        let reader = new FileReader()
        reader.onload = function(event) 
        {
            let contents = event.target.result
            document.getElementById('hidden_geojson_data_from_upload').value = contents
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

    // open_geojson_upload_form button
    document.getElementById("open_geojson_upload_form").addEventListener("click", function()
    {
        // add stations via textarea
        enter_add_station_mode("file-upload")
    })

    // submit_geojson_upload_form button
    document.getElementById("submit_geojson_upload_form").addEventListener("click", function(event)
    {
        event.preventDefault()
        let form = document.getElementById("geojson_upload_form")
        let upload_form_data = document.getElementById("hidden_geojson_data_from_upload")

        console.log(upload_form_data)

        let request_body = JSON.parse(upload_form_data.value)
        // send data to API
        add_new_station(request_body)

        form.reset()

        // restore sample data after reset
        document.getElementById("sample_geojson").value = JSON.stringify(
        {
            "type": "",
            "properties": {
                "name": "",
                "description": "",
                "url": ""
            },
            "geometry": {
                "coordinates": [],
                "type": ""
            }
        }, null, 2)

        // hide coressponding form element
        leave_add_station_mode(form)
    })

    // cancel_geojson_upload_form button
    document.getElementById("cancel_geojson_upload_form").addEventListener("click", function()
    {
        let geojson_upload_form = document.getElementById("geojson_upload_form")

        // hide coressponding form element
        leave_add_station_mode(geojson_upload_form)
    })

    // show sample geojson in form
    document.getElementById("sample_geojson").value = JSON.stringify(
    {
        "type": "",
        "properties": {
            "name": "",
            "description": "",
            "url": ""
        },
        "geometry": {
            "coordinates": [],
            "type": ""
        }
    }, null, 2) 
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