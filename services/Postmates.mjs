import { env } from "node:process";
import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";
import Service from "./Service.mjs";
import "dotenv/config";

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
    const res = await fetch(
      "https://postmates.com/api/getLocationAutocompleteV1",
      {
        method: "POST",
        headers: this.commonHeaders,
        body: JSON.stringify({ query: query }),
      }
    );

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /* Get detailed location information
   * @param {Object} locationData location data from getLocationAutocomplete
   * @param {Object} location details
   */
  async getLocationDetails(locationData) {
    const res = await fetch("https://postmates.com/api/getLocationDetailsV1", {
      method: "POST",
      headers: this.commonHeaders,
      body: JSON.stringify(locationData),
    });
    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
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

  /*Set location for instance
   * @param {String} locationDetails from getLocationDetails
   * @return {Array} session cookies containing location info
   */
  async setLocation(locationDetails) {
    const res = await fetch("https://postmates.com/api/setTargetLocationV1", {
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
    });

    if (res.ok) {
      return this.replaceCookieDomain(res.headers.raw()["set-cookie"]);
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /* Search query
   * @param {String} query the query to search
   * @param {Object} cookies containing location data
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, cookies }) {
    const requestCookies = Object.keys(cookies).reduce(
      (acc, key) => (acc += `${key}=${cookies[key]}; `),
      ""
    );

    const res = await fetch("https://postmates.com/api/getFeedV1", {
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
        Cookie: requestCookies,
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
    });
    if (res.ok) {
      return {
        data: await res.json(),
        responseCookies: this.replaceCookieDomain(
          res.headers.raw()["set-cookie"]
        ),
      };
    } else {
      throw new HTTPResponseError(res);
    }
  }
  /* Get restaraunt menu
   * @param {restarauntID} contains the restraunt ID (Should come from search results as storeUUID)
   * @return {Object} the restaraunt menu (list of items + UUID; do we need subsection UUID?) or HTTPResponseError
   */

  async getMenu(restarauntID) {
    const res = await fetch("https://postmates.com/api/getStoreV1", {
      method: "POST",
      headers: {
        authority: "postmates.com",
        accept: "*/*",
        "content-type": "application/json",
        dnt: "1",
        "x-csrf-token": "x",
      },
      body: '{"storeUuid":"0086cdd5-160c-45a5-844c-75d440494688"}',
    });
    if (res.ok) {
      return {
        data: await res.json(),
      };
    } else {
      throw new HTTPResponseError(res);
    }
  }
}
export default Postmates;
