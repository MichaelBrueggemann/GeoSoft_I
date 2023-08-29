"use strict"
import {zip_array_and_leaflet_layergroup, highlight, default_style, add_station_metadata} from "./map_helper.js"
import {prepare_form_buttons} from "./station_forms.js"

let station_collection = {};

/**
 * Sends Data to the desired route via HTTP-Post-Request.
 * @param {*} route - API-Endpoint to send the body to.
 * @param {*} body - HTML Request-Body
 * @returns Promise with the server response, only if the API Call was "add_station" or "update_station"
 */
async function api_call(route, body) {
    let result = await fetch("/api/" + route, {
        method: 'POST',
        headers: {"content-type": "application/json"},
        body: JSON.stringify(body),
    })
    // only send return server response, if a new station was added or updated
    if (route === "add_station" || route === "update_station")
    {
        return result
    }
    
}

/**
 * Deletes a station from the DB
 * @param {*} id - ID of station to delete
 */
async function delete_station(id) {
    await api_call("delete_station", { id: id })

    await update_map()
    await update_table()
    
}

/**
 * Adds a new station to the DB
 * @param {*} geojson - GeoJSON Object defining the station
 * @returns Promise to with message from the server in the "message" property when unpacked with ".json()"
 */
export async function add_new_station(geojson) {
    let result = await api_call("add_station", geojson)

    await update_map()
    await update_table()

    return result
}

/**
 * Updates a station in the DB
 * @param {*} id - ID of the station that should be updated
 * @param {*} geojson - GeoJSON file with data of the station
 * @returns Promise to with message from the server in the "message" property when unpacked with ".json()"
 */
async function update_station(id, geojson) 
{
    let result = await api_call("update_station", {
            id: id,
            geojson: geojson,
        });

    await update_map()
    await update_table()

    return result
}

// ----------------- Stations Table -----------------
/**
 * Constructs an Error-Message from the error object
 * @param {*} error Error object returned by "express-validators" validationResult() function.
 * @param {} field Name of the Field in the control element, where the error occured
 * @returns {string} The Error Message as a string
 */
function construct_error_message(error, field)
{
    return `Im Feld '${field}' ist ein Fehler. </br> Fehlernachricht: </br> ${error.message} </br></br>`
}


export async function update_table() {
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // Fill table with route entries
    let table = document.getElementById("station_table")
    let tbody = document.createElement('tbody')

    let stations_data = zip_array_and_leaflet_layergroup(Object.values(station_collection), stations_layer_group)
    
    for (const [STATION, LEAFLET_LAYER] of stations_data) 
    {
        // give Layer a property for later highlighting
        //LEAFLET_LAYER["highlighted"] = false

        let row = tbody.insertRow()
        row.addEventListener("click", function(event) 
        {
            if (event.target.tagName !== "BUTTON") // only activates click event, if no button of the row is pressed
            {
                if (LEAFLET_LAYER.highlighted)
                {
                    default_style(LEAFLET_LAYER)
                }
                else
                {
                    // reset styling of each layer
                    stations_layer_group.eachLayer(function(LEAFLET_LAYER)
                    {
                        default_style(LEAFLET_LAYER)
                    })

                    highlight(LEAFLET_LAYER)

                    // set map zoom on the highlighted feature
                    if (LEAFLET_LAYER instanceof L.Polygon)
                    {
                        map.fitBounds(LEAFLET_LAYER.getBounds())
                        //map.setView(LEAFLET_LAYER.getCenter(), 30)
                    }
                    else if (LEAFLET_LAYER instanceof L.Marker)
                    {
                        map.setView(LEAFLET_LAYER.getLatLng(), 30)
                    }
                }
            } 
        })
        let station_name = document.createElement("td")
        station_name.innerText = STATION.properties.name
        station_name.id = `station_name${STATION._id}` // TODO: evtl löschen, da nicht genutzt
        row.insertCell().appendChild(station_name)

        let edit_station_button = document.createElement("button")
        edit_station_button.innerText = "Bearbeiten"
        edit_station_button.setAttribute("type", "button")
        edit_station_button.setAttribute("class", "btn btn-primary")
        edit_station_button.setAttribute("data-bs-toggle", "modal")
        edit_station_button.setAttribute("data-bs-target", "#edit_station_popup")
        
        edit_station_button.addEventListener("click", function()
        {
            // populate popUp with station data
            let station_update_textarea = document.getElementById("update_stationGeoJSON")
            // station-id set for later "onclick" event to update the edited station
            station_update_textarea.setAttribute("data-station_id", `${STATION._id}`)
            station_update_textarea.value = JSON.stringify(
                {
                    type: STATION.type,
                    geometry: STATION.geometry,
                    properties: STATION.properties
                }, null, 2)
        })
        row.insertCell().appendChild(edit_station_button)

        let delete_station_button = document.createElement("button")
        delete_station_button.innerText = "Löschen"
        delete_station_button.setAttribute("type", "button")
        delete_station_button.setAttribute("class", "btn btn-primary")
        delete_station_button.addEventListener("click", function() 
        {
            delete_station(STATION._id)
        })
        row.insertCell().appendChild(delete_station_button)
    }
    table.tBodies[0].replaceWith(tbody)
}

// ----------------- Map -----------------

function initializeMap()
{
    // create map-object with initial view set to Münster, Germany
    let map = new L.map('map1').setView([51.96918, 7.59579], 13)

    // initialize base map
    let osmLayer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        {attribution:'&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'})

    osmLayer.addTo(map)

    // FeatureGroup is to store editable layers
    let drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)

    // initialise draw control
    let drawControl = new L.Control.Draw({
        draw: {
            // only allow polygon and points to be drawn
            polygon: true,
            polyline: false,
            circle: false,
            marker: true,
            circlemarker: false,
            rectangle: false
        },
        edit: {
            featureGroup: drawnItems
        }
    })

    // LayerGroup to later store stations
    let stations_layer_group = L.layerGroup()
    map.addLayer(stations_layer_group)

    // save drawn items 
    map.on(L.Draw.Event.CREATED, function(event) 
    {
        // clears all Elements that were drawn before
        drawnItems.clearLayers() 

        // the drawn layer
        let layer = event.layer

        // adds drawn layer to the editable layers
        drawnItems.addLayer(layer)

        // adds the geojson of the layer to the textarea, so that users can edit the metadata
        let textarea = document.getElementById("hidden_geojson_data_from_map_feature")
        textarea.value = JSON.stringify(layer.toGeoJSON(), null, 2)
    })

    map.on(L.Draw.Event.EDITED, function(event) 
    {
        let textarea = document.getElementById("hidden_geojson_data_from_map_feature")

        // the edited layer
        let layer = Object.values(event.layers._layers)[0]

        // updates data in the textarea
        textarea.value = JSON.stringify(layer.toGeoJSON(), null, 2)
    })

    map.on(L.Draw.Event.DELETED, function() 
    {
        // reset content of textarea
        let textarea = document.getElementById("hidden_geojson_data_from_map_feature")
        textarea.value = ""
    })


    return {
        map: map,
        stations_layer_group: stations_layer_group,
        drawnItems: drawnItems,
        drawControl: drawControl
    }
}

/**
 * Updates the stations displayed on the map (markers and Pop-Ups)
 */
async function update_map()
{
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // reset layer, if it exists
    if (stations_layer_group)
    {
        stations_layer_group.clearLayers()
    }

    for (const STATION of Object.values(station_collection))
    {
        if (STATION.geometry.type === "Point")
        {
            let marker = L.marker([STATION.geometry.coordinates[1], STATION.geometry.coordinates[0]]).addTo(stations_layer_group)
            add_station_metadata(STATION, marker)
        }
        else if (STATION.geometry.type === "Polygon")
        {
            // "coordinates" are accessed at index "0" because geoJSOn wrappes the coordinates in an extra array
            let polygon = L.polygon(STATION.geometry.coordinates[0].map(function(coord) // used to change coords from lng/lat to lat/lng
            {
                return [coord[1], coord[0]]
            })).addTo(stations_layer_group)
            add_station_metadata(STATION, polygon)
        }
    }
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the update_station_button button element.
 * */ 
function prepare_update_station_button()
{
    /* Use "event delegation" to bind an event to a detached button. The button "#update_station" is first attached to the DOM, if the modal "'edit_station_popup"
    is opened (the button is part of the modal), therefore pre-existing events for this button might get lost.*/
    document.body.addEventListener('click', async function(event) {
        // set/overwrite event on button "#update_station"
        if (event.target.id === 'update_station') {
            const UPDATE_STATION_TEXTAREA = document.getElementById(`update_stationGeoJSON`)
            const UPDATED_STATION = JSON.parse(UPDATE_STATION_TEXTAREA.value)
            const STATION_ID = UPDATE_STATION_TEXTAREA.dataset.station_id
            
            let result = await update_station(STATION_ID, UPDATED_STATION)

            if (!result.ok)
            {
                let json_result = await result.json()
                    
                let update_error_message = ""

                    for (const ERROR of json_result.errors)
                    {
                        if (!ERROR.context.label.includes('properties.name'))
                        {
                            // pass
                        }
                        else
                        {
                            // invalidate the control element just once
                            if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                            {
                                // add CSS-class to enable custom styling
                                document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                            }
                            
                            update_error_message += construct_error_message(ERROR, "Name")

                            continue
                        }

                        if (!ERROR.context.label.includes('properties.description'))
                        {
                            // pass
                        }
                        else
                        {
                            // invalidate the control element just once
                            if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                            {
                                // add CSS-class to enable custom styling
                                document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                            }

                            update_error_message += construct_error_message(ERROR, "description")

                            continue
                        }

                        if (!ERROR.context.label.includes('properties.url'))
                        {
                            // pass
                        }
                        else
                        {
                            // invalidate the control element just once
                            if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                            {
                                // add CSS-class to enable custom styling
                                document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                            }

                            update_error_message += construct_error_message(ERROR, "url")
                        }

                        if (!ERROR.context.label.includes('coordinates'))
                        {
                            // pass
                        }
                        else
                        {
                            // invalidate the control element just once
                            if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                            {
                                // add CSS-class to enable custom styling
                                document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                            }

                            update_error_message += construct_error_message(ERROR, "coordinates")
                        }

                        if (!ERROR.context.label.includes('geometry.type'))
                        {
                            // pass
                        }
                        else
                        {
                            // invalidate the control element just once
                            if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                            {
                                // add CSS-class to enable custom styling
                                document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                            }

                            update_error_message += construct_error_message(ERROR, "geometry.type")
                        }
                    }

                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_update_geojson").innerHTML = update_error_message
            }
            else
            {
                if (document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                {
                    document.getElementById("update_stationGeoJSON").classList.remove("is-invalid")
                }

                // manually hide modal
                $('#edit_station_popup').modal('hide')
            }
        }
    })
}

// ----------------- Script Start -----------------
// initialisation of mandatory global variables
let map_init = initializeMap()
let map = map_init.map
let stations_layer_group = map_init.stations_layer_group
let drawnItems = map_init.drawnItems
let drawControl = map_init.drawControl

prepare_update_station_button()
prepare_form_buttons(map, drawnItems, drawControl)

update_map()
update_table()


