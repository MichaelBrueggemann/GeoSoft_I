import {update_table, update_map} from "./stations.js"

Dropzone.options.uploadStationField = 
{
    url: "/api/upload_geojson_station", // API Endpoint where the data is send to
    autoProcessQueue: false, // Disable automatic file upload
    addRemoveLinks: true,
    maxFiles: 1,
    acceptedFiles: ".json",
  
    init: function() 
    {
      let uploadStationField = this // selects the dropzone
        
      uploadStationField.on("addedfiles", function(files) 
      {
        // Perform custom validation on each added file
        for (let i = 0; i < files.length; i++) 
        {
          let file = files[i]
          let allowedFormat = ["application/json"]
    
          if (allowedFormat.indexOf(file.type) === -1) 
          {
            // File format not supported, display error message
            uploadStationField.removeFile(file) // Remove the file from the queue
            alert("Das Dateiformat wird nicht unterstützt, bitte lade eine .json Datei hoch.")
          }
        }
       })
  
      // upload the file to the server and update map and table accordingly
      document.getElementById("upload_station_files").addEventListener("click", async function(event) {
        event.preventDefault()
        uploadStationField.processQueue()
        await update_map()
        await update_table()

        // let removeButton = document.querySelector('[data-dz-remove]')
        // console.log(removeButton)
  
        // // removes the "remove file" button of the uploaded file
        // if (removeButton) 
        // {
        //   removeButton.remove()
        // }
      })

      // removes files from dropzone if the modal is closed by clicking on the "Schließen" button"
      document.getElementById("close_popup").addEventListener("click", function() 
      {
        uploadStationField.removeAllFiles()
      })

      // removes files from dropzone if the modal is closed by clicking on the backdrop
      /* NOTE: This has to be run via jQuery, as Bootstrap executes the "hidden.bs.modal" event using jQueries ".trigger()" function, so events added by ".addEventListner() won't be triggered.*/
      $('#upload_station_popup').on('hidden.bs.modal', function () {
        uploadStationField.removeAllFiles()
      })

      // removes all files that exceed the file limit
      uploadStationField.on("maxfilesexceeded", function(file) 
      { 
        // TODO: besser das Uploadfeld nicht mehr anklickbar machen, wenn zu viele Dateien im Feld liegen
        uploadStationField.removeFile(file)
        alert("Dateilimit erreicht. Du kannst keine weiteren Dateien hochladen!")
      })
  
      // NOTE: Just for Debugging purposes
      // Handle the success event when a file is uploaded successfully
      // uploadStationField.on("success", function(file, response) 
      // {
      //   console.log("File uploaded successfully: " + file.name)
      //   console.log("Server response: " + response.message + ", success: " + response.success)
      // })
  
      // // Handle the error event when a file fails to upload
      // uploadStationField.on("error", function(file, errorMessage) 
      // {
      //   console.log("File failed to upload: " + file.name)
      //   console.log("Error message: " + errorMessage)
      // })
    }
  }
  