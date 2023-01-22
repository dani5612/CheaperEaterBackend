import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";

/* Search query
 * @param {String} query the query to search
 * @return {Object} the search result or HTTPResponseError
 */
const search = async (query) => {
  const res = await fetch(
    `https://api-gtm.grubhub.com/restaurants/search?orderMethod=delivery&locationMode=DELIVERY&facetSet=umamiV6&pageSize=20&hideHateos=true&searchMetrics=true&queryText=${query}&location=POINT(-118.12718201%2034.09533691)&preciseLocation=true&geohash=9q5czyy7tpky&includeOffers=true&sortSetId=umamiv3&sponsoredSize=3&countOmittingTimes=true`,
    {
      method: "GET",
      headers: {
        authority: "api-gtm.grubhub.com",
        accept: "application/json",
        "accept-language": "en-US,en;q=0.8",
        authorization: "Bearer 9820b4f0-84eb-491c-b166-dbe8f2cdb2a2",
        "cache-control": "max-age=0",
        "if-modified-since": "0",
        origin: "https://www.grubhub.com",
        "perimeter-x":
          "eyJ1IjoiMWM0YTQxZTAtOWExNi0xMWVkLTkzYTAtMjE5YzgzZGY2Nzk3IiwidiI6IjFjNTdkMGM2LTlhMTYtMTFlZC04YWQ0LTRhNDY1YTY5NDQ3NiIsInQiOjE2NzQzNjYwMjg1MzIsImgiOiIwNWZhMDFiNzNiNDIzOGNlM2JlZTYyOWM5NjdlMWE1YzYxYmUxOTMwZmU3MTYwNGEyNzA4MGM2ZjYzN2Y5YzVhIn0=",
        referer: "https://www.grubhub.com/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
      },
    }
  );

  if (res.ok) {
    return await res.json();
  } else {
    throw new HTTPResponseError(res);
  }
};

export { search };
