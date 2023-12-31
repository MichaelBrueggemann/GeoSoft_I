"use strict"
import {zip_array_and_leaflet_layergroup, highlight, default_style, add_station_metadata} from "./map_helper.js"
import {prepare_form_buttons} from "./station_forms.js"
import { prepare_server_error_message } from "./station_error_messages.js"

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
    return result 
}

/**
 * Deletes a tour from the DB
 * @param {*} id - ID of tour to delete
 */
async function delete_tour(id) {
    await api_call("delete_tour", { id: id });
}

/**
 * Deletes a station from the DB
 * @param {*} id - ID of station to delete
 */
async function delete_station(id) {
    let response = await api_call("delete_station", { id: id })
    
    // Control if the API is online and worked as plannend
    if (!response.ok) {
        const data = await response.json();
        
        // If the data has this property there are tours which contains the station which should be deleted
        if (data.hasOwnProperty("tours_with_this_station")) {
            
            // the API tells client which tours contain the station
            let tours_with_this_station = data.tours_with_this_station;
            $('#station_deletion_popup').modal('show');
            let warning_text = "Sie sind im Begriff eine Station zu löschen, die Bestandteil von mindestens einer Tour ist."
            warning_text += "<br>Wenn Sie fortfahren werden zur Wahrung der referentiellen Integrität die <strong>folgenden Touren unwideruflich gelöscht</strong>:"
            tours_with_this_station.forEach(function ({name}) {
                warning_text += "<br>" + name;
            });
            let warning_message = document.getElementById("warning_message");
            warning_message.innerHTML = warning_text;
            
            // ----------------- Delete_Station_And_Tours - Button -----------------
            const CANCEL_BUTTON = document.getElementById("delete_station_and_tours");
            CANCEL_BUTTON.addEventListener("click", async function() {
                for (const TOUR of tours_with_this_station) {
                    delete_tour(TOUR._id);
                }
                delete_station(id);
                $('#station_deletion_popup').modal('hide');
                await update_map()
                await update_table()
            });
        }
    }
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
 * update stations displayed in the table + add functionality to table rows and buttons.
 */
export async function update_table() {
    station_collection = await fetch("/api/stations")
    station_collection = await station_collection.json()

    // Fill table with route entries
    let table = document.getElementById("station_table")
    let tbody = document.createElement('tbody')

    let stations_data = zip_array_and_leaflet_layergroup(Object.values(station_collection), stations_layer_group)
    
    for (const [STATION, LEAFLET_LAYER] of stations_data) 
    {
        let row = tbody.insertRow()

        // ---- selection and highlighting of stations ----
        row.addEventListener("click", function(event) 
        {
            if (event.target.tagName !== "BUTTON") // only activates click event, if no button of the row is pressed
            {
                if (row.classList.contains("table-primary"))
                {
                    row.classList.remove("table-primary")
                }
                else
                {
                    // reset highlight in each row
                    for (const ROW of tbody.children)
                    {
                        ROW.classList.remove("table-primary")
                    }

                    row.classList.add("table-primary")
                }
                
                

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
                    }
                    else if (LEAFLET_LAYER instanceof L.Marker)
                    {
                        map.setView(LEAFLET_LAYER.getLatLng(), 30)
                    }
                }
            } 
        })
        // ---- name ----
        let station_name = document.createElement("td")
        station_name.innerText = STATION.properties.name
        
        let cell1 = row.insertCell()
        cell1.setAttribute("style", "width:auto text-align:center")
        cell1.appendChild(station_name)

        // ---- Edit-Button ----
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
        let cell2 = row.insertCell()
        cell2.setAttribute("style", "width:auto text-align:center")
        cell2.appendChild(edit_station_button)

        // ---- Delete-Button ----
        let delete_station_button = document.createElement("button")
        delete_station_button.innerText = "Löschen"
        delete_station_button.setAttribute("type", "button")
        delete_station_button.setAttribute("class", "btn btn-primary")
        delete_station_button.addEventListener("click", function() 
        {
            delete_station(STATION._id)
        })
        let cell3 = row.insertCell()
        cell3.setAttribute("style", "width:auto text-align:center")
        cell3.appendChild(delete_station_button)
    }
    table.tBodies[0].replaceWith(tbody)
}

// ----------------- Map -----------------

/**
 * This functions initializes the Leaflet map and adds core functionality to it.
 * @returns Object with Leaflet and Leaflet-Draw objects to be used in later functions
 */
function initializeMap()
{
    // create map-object with initial view set to Münster, Germany
    let map = new L.map('station_map').setView([51.96918, 7.59579], 13)

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

            try
            {
                const UPDATED_STATION = JSON.parse(UPDATE_STATION_TEXTAREA.value)
                const STATION_ID = UPDATE_STATION_TEXTAREA.dataset.station_id
                
                let result = await update_station(STATION_ID, UPDATED_STATION)
    
                if (!result.ok)
                {
                    let json_result = await result.json()
                        
                    let error_message = prepare_server_error_message(json_result.errors, "update_stationGeoJSON")
                    
                    // add error message from the server to the designated field
                    document.getElementById("invalid_feedback_update_geojson").innerHTML = error_message
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
            catch (error)
            {
                // invalidate the control element just once
                if (!document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
                {
                    // add CSS-class to enable custom styling
                    document.getElementById("update_stationGeoJSON").classList.add("is-invalid")
                }
                // returns the error occured in "JSON.parse()" to the user
                document.getElementById("invalid_feedback_update_geojson").innerHTML = error
            }
        }
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the close_edit_station_popup button element.
 * */
function prepare_close_edit_station_popup_button()
{
    const CLOSE_EDIT_STATION_POPUP_BUTTON = document.getElementById("close_edit_station_popup")
    CLOSE_EDIT_STATION_POPUP_BUTTON.addEventListener("click", function()
    {
        
        if (document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
        {
            // remove invalidation styling
            document.getElementById("update_stationGeoJSON").classList.remove("is-invalid")
        }
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the x_close_edit_station_popup button element.
 * */
function prepare_x_close_edit_station_popup_button()
{
    const X_CLOSE_EDIT_STATION_POPUP_BUTTON = document.getElementById("x_close_edit_station_popup")
    X_CLOSE_EDIT_STATION_POPUP_BUTTON.addEventListener("click", function()
    {
        
        if (document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
        {
            // remove invalidation styling
            document.getElementById("update_stationGeoJSON").classList.remove("is-invalid")
        }
    })
}

/**
 * This functions sole purpose is to increase readability of this code. 
 * It wraps the initialisation of the edit_station_popup modal element.
 * */
function prepare_edit_station_modal()
{
    const EDIT_STATION_MODAL = document.getElementById("edit_station_popup")
    EDIT_STATION_MODAL.addEventListener("hidden.bs.modal", function()
    {
        if (document.getElementById("update_stationGeoJSON").classList.contains("is-invalid"))
        {
            // remove invalidation styling
            document.getElementById("update_stationGeoJSON").classList.remove("is-invalid")
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

prepare_close_edit_station_popup_button()
prepare_x_close_edit_station_popup_button()
prepare_edit_station_modal()
prepare_update_station_button()
prepare_form_buttons(map, drawnItems, drawControl)

update_map()
update_table()

