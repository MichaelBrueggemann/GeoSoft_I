"use strict"

/**
 * Zips together an array and a leaflet layergroup
 * @param {*} array - Arbitrary javascript array
 * @param {*} leaflet_layergroup - Leaflet LayerGroup
 * @returns Array containing the zipped data.
 */
export function zip_array_and_leaflet_layergroup(array, leaflet_layergroup)
{
    let counter = 0
    leaflet_layergroup.eachLayer(function(layer)
    {
        array[counter].push(layer)
        counter += 1
    })

    return array
}

/**
 * This function sets the styling of the feature to the default styling
 * @param {*} feature - Leaflet Layer Object
 */
export function default_style(feature)
{
    if (feature instanceof L.Polygon)
    {
        feature.setStyle({color: "#3388ff"}) // leaflets default color
    }
    else if (feature instanceof L.Marker)
    {
        let old_icon = feature.options.icon
        let highlight_icon = L.icon({
            // TODO: Discuss if this should be made independent of current leaflet version?
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            // reuse default styling
            shadowSize: old_icon.options.shadowSize,
            iconSize: old_icon.options.iconSize,
            iconAnchor: old_icon.options.iconAnchor,
            popupAnchor: old_icon.options.popupAnchor
        })
        feature.setIcon(highlight_icon)
    }
}

/**
 * This function highlights the choosen feature.
 * @param {} feature - Leaflet Layer Object
 */
export function highlight(feature) 
{
    if (feature instanceof L.Polygon)
    {
        feature.setStyle({color: "#9C2BCB"})
    }
    else if (feature instanceof L.Marker)
    {
        let old_icon = feature.options.icon
        let highlight_icon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            // reuse default styling
            shadowSize: old_icon.options.shadowSize,
            iconSize: old_icon.options.iconSize,
            iconAnchor: old_icon.options.iconAnchor,
            popupAnchor: old_icon.options.popupAnchor
        })
        feature.setIcon(highlight_icon)
    }
    
}


/**
 * This functions binds a Pop-Up to the leaflet object. The content for the Pop-Up is drawn from the station, which is stored in the DB.
 * @param {*} station - Station from the "station_collection"
 * @param {*} leaflet_object - Leaflet Object where the metadata should be added to
 */
export function add_station_metadata(station, leaflet_object)
{
    let popupcontent = `<strong> Name: </strong> ${station.geojson.properties.name}  <br> <strong> Beschreibung: </strong> ${station.geojson.properties.description}  <br>`
    if (station.geojson.properties.url) // append only if exisitng, as its an optional parameter
    {
        popupcontent += `<strong> URL: </strong> <a href="${station.geojson.properties.url}" target="_blank"> ${station.geojson.properties.url} </a> `
    }
    leaflet_object.bindPopup(popupcontent)
}