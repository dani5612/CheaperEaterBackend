import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";
import Service from "./Service.mjs";

class Postmates extends Service {
  constructor() {
    super();
    this.service = "postmates";
  }
  /* Search query
   * @param {String} query the query to search
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query }) {
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
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }
}
export default Postmates;
