"use strict"

/**
 * Adds an arbitrary number of search parameters to an URL.
 * @param {URL} url_object URL() Object
 * @param {*} search_params Object with searchParams
 */
function add_search_params(url_object, search_params)
{
    for (const [SEARCH_PARAM_KEY, SEARCH_PARAM_VALUE] of Object.entries(search_params))
    {
        url_object.searchParams.set(SEARCH_PARAM_KEY, SEARCH_PARAM_VALUE)
    }
}

/**
 * This function converts any Wikipedia Link into an MediaWiki-API URL that can later be supplemented with search parameters
 * @param {*} url - Wikipedia URL String
 * @returns URL-Object in Format of a MediaWiki-API URL (https://www.example.org/w/api.php)
 */
function create_MediaWiki_API_URL(url)
{
    // Wrap into URL()-Class for better acces to all URL parts
    url = new URL(url)

    let url_origin = url.origin

    // in Wikipedia Articles, the last part of the URL-path is always the name of the queried page
    let query_page = url.pathname.split("/").at(-1)

    let MediaWiki_api_path = "/w/api.php"

    // create MediaWiki URL
    let MediaWiki_url = new URL(MediaWiki_api_path, url_origin)

    // These search params result in a Response with plaintext of the whole Wikipedia Page
    let search_params = {
        action: "query",
        format: "json",
        prop: "extracts",
        explaintext: "1",
        titles: query_page
    }

    add_search_params(MediaWiki_url, search_params)

    // decode URI to prevent Errors from the MediaWiki-API with ASCII Characters
    return decodeURI(MediaWiki_url)
}

/**
 * This function gets the first sentence of a Wikipedia Article via WikiMedia-APi. It's mandatory that the request was made with "action=query" and "explaintext=1".
 * @param {*} MediaWiki_response_json - JSON Object with the data of a WikiMedia-API query Request
 */
function get_first_sentence(MediaWiki_response_json)
{
  // get all pages that met the query criteria 
  let pages = MediaWiki_response_json.query.pages
  let pages_array = Object.values(pages)

  // get first match
  let first_matching_page = pages_array[0]

  // let first_sentence = first_matching_page.extract.split(".")[0]

  // This RegEx matches any number of characters, that could be considered as a "full sentence" in the grammar we know. This is by far not complete, but as this a big current problem in computational linguistics, this is our best approach.
  let first_sentence_regex = /(^.*?[a-z]{2,}[.!?])\s+\W*[A-Z]/

  // returns first sentence that matches the above RegEx
  let first_sentence = first_sentence_regex.exec(first_matching_page.extract)[1]

  return first_sentence
}

/**
 * Fetches first sentence of the Wikipedia Page
 * @param {URL} MediaWiki_url URL() Object created with "create_MediaWiki_API_URL()"
 * @returns 
 */
async function fetch_first_sentence(MediaWiki_url)
{
    let data = await fetch(MediaWiki_url)

    if (!data.ok)
    {
        throw new Error("Fehler beim Abrufen der API. Bitte prüfen Sie Ihre Eingabe!")
    }
    else
    {
        let json = await data.json()
        let first_sentence = get_first_sentence(json)
        return first_sentence
    }
}

module.exports = {fetch_first_sentence, create_MediaWiki_API_URL}