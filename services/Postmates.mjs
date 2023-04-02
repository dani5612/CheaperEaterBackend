import { env } from "node:process";
import fetch from "node-fetch";
import Service from "./Service.mjs";

class Postmates extends Service {
  constructor() {
    super();
    this.service = "postmates";
    this.commonHeaders = {
      authority: "postmates.com",
      accept: "*/*",
      "accept-language": "en-US,en;q=0.8",
      "content-type": "application/json",
      origin: "https://postmates.com",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "sec-gpc": "1",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
      "x-csrf-token": "x",
    };
  }

  /* Autocomplete location information
   * @param {String} query the search location
   * @return {Array} of autocomplete result
   */
  async getLocationAutocomplete(query) {
    return await (
      await this.callServiceAPI(() =>
        fetch("https://postmates.com/api/getLocationAutocompleteV1", {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({ query: query }),
        })
      )
    ).json();
  }

  /* Get detailed location information
   * @param {Object} locationData location data from getLocationAutocomplete
   * @param {Object} location details
   */
  async getLocationDetails(locationData) {
    return await (
      await this.callServiceAPI(() =>
        fetch("https://postmates.com/api/getLocationDetailsV1", {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify(locationData),
        })
      )
    ).json();
  }

  /* Get detailed delivery location information
   * @param {Object} payload
   * @param {String} payload.id location id (placeId)
   * @param {String} payload.provider location provider
   * @return {Object} detailed location data
   */
  async getDeliveryLocationDetails({ id, provider }) {
    return await (
      await this.callServiceAPI(() =>
        fetch("https://postmates.com/api/getDeliveryLocationV1", {
          method: "POST",
          headers: this.commonHeaders,
          body: JSON.stringify({
            placeId: id,
            provider: provider,
            source: "manual_auto_complete",
          }),
        })
      )
    ).json();
  }

  /*Replace the domain of cookies to the applicaiton domain
   * @param {Array} cookies the cookies to modify
   * @return {Array} modified cookies
   */
  replaceCookieDomain(cookies) {
    return cookies.map((cookie) =>
      cookie.replace(this.commonHeaders.authority, env.DOMAIN)
    );
  }

  /*Conver array of cookie strings in standard format to JSON object
   * @param {Array} cookies
   * @return {Object} converted key value pair JSON object
   */
  cookiesToJson(cookies) {
    return cookies.reduce((cookiesJson, cookie) => {
      const [prop, value] = cookie.split(";")[0].split("=");
      cookiesJson[prop] = value;
      return cookiesJson;
    }, {});
  }

  /* Convert Json cookie to a format Postmate's server understands
   *@param {Object, String} json the json data to convert
   *@Param {Booleam} isString a value indicating if the json data is string
   *@return {String} Json formatted as cookie
   */
  jsonToCookie(json, isString = false) {
    if (!isString) {
      json = JSON.stringify(json);
    }
    return json
      .replaceAll("\t", "")
      .replaceAll("\n", "")
      .replaceAll('"', "%22")
      .replaceAll(" ", "")
      .replaceAll("\\", "");
  }

  /*Convert Object of cookie name to value to string format
   * of pattern 'name-value;'
   * @param {Object} cookies
   * @return {String}
   */
  CookiesObjectToString(cookies) {
    return Object.keys(cookies).reduce(
      (acc, key) => (acc += `${key}=${cookies[key]}; `),
      ""
    );
  }

  /*Set location for instance
   * @param {String} locationDetails from getLocationDetails
   * @return {Array} session cookies containing location info
   */
  async setLocation(locationDetails) {
    return {
      responseCookies: this.cookiesToJson(
        (
          await this.callServiceAPI(() =>
            fetch("https://postmates.com/api/setTargetLocationV1", {
              method: "POST",
              headers: {
                authority: "postmates.com",
                accept: "*/*",
                "accept-language": "en-US,en;q=0.6",
                "content-type": "application/json",
                cookie: `uev2.loc=${this.jsonToCookie(locationDetails)}`,
                origin: "https://postmates.com",
                referer: "https://postmates.com/",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "user-agent":
                  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
                "x-csrf-token": "x",
              },
              body: "{}",
            })
          )
        ).headers.raw()["set-cookie"]
      ),
    };
  }

  /* Search query
   * @param {Object} payload
   * @param {String} payload.query the query to search
   * @param {Object} payload.cookies request cookies containing location data
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, cookies }) {
    const res = await this.callServiceAPI(() =>
      fetch("https://postmates.com/api/getFeedV1", {
        method: "POST",
        headers: {
          authority: "postmates.com",
          accept: "*/*",
          "accept-language": "en-US,en;q=0.8",
          "content-type": "application/json",
          origin: "https://postmates.com",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
          "x-csrf-token": "x",
          cookie: this.CookiesObjectToString(cookies),
        },
        body: JSON.stringify({
          userQuery: query,
          date: "",
          startTime: 0,
          endTime: 0,
          carouselId: "",
          sortAndFilters: [],
          marketingFeedType: "",
          billboardUuid: "",
          feedProvider: "",
          promotionUuid: "",
          targetingStoreTag: "",
          venueUUID: "",
          selectedSectionUUID: "",
          favorites: "",
          vertical: "ALL",
          searchSource: "SEARCH_SUGGESTION",
          keyName: "",
        }),
      })
    );

    return {
      data: await res.json(),
      responseCookies: {
        ...this.cookiesToJson(res.headers.raw()["set-cookie"]),
      },
    };
  }

  /* Get store information
   * @param {String} contains the restraunt ID (Should come from search results as storeUUID)
   * @return {Array} an array of [storeName, storeID, storeImage, storeHours,
   * menu[category[items[name, description, price, image]]]], or HTTPResponseError
   */
  async getStore(restarauntID) {
    return await (
      await this.callServiceAPI(() =>
        fetch("https://postmates.com/api/getStoreV1", {
          method: "POST",
          headers: {
            authority: "postmates.com",
            accept: "*/*",
            "content-type": "application/json",
            dnt: "1",
            "x-csrf-token": "x",
          },
          body: JSON.stringify({ storeUuid: restarauntID }),
        })
      )
    ).json();
  }

  /*Autocomplete search results
   * @param {Object} payload
   * @param {String} payload.query to search
   * @param {Object} payload.cookies request cookies to use for search
   * @return {Object} raw search results and response cookies
   */
  async autocompleteSearch({ query, cookies }) {
    const res = await this.callServiceAPI(() =>
      fetch("https://postmates.com/api/getSearchSuggestionsV1", {
        method: "POST",
        headers: {
          authority: "postmates.com",
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          origin: "https://postmates.com",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
          "x-csrf-token": "x",
          cookie: this.CookiesObjectToString(cookies),
        },
        body: JSON.stringify({
          userQuery: query,
          date: "",
          startTime: 0,
          endTime: 0,
          vertical: "ALL",
        }),
      })
    );

    return {
      data: await res.json(),
      responseCookies: this.cookiesToJson(res.headers.raw()["set-cookie"]),
    };
  }
}
export default Postmates;
