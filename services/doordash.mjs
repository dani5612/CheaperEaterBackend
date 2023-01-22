import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";

/* location\
  (1) autocomplete api -> get location + google place id
  (2) use geoplace id to set location
*/

/* Search query
 * @param {String} query the query to search
 * @return {Object} the search result or HTTPResponseError
 */
const search = async (query) => {
  const res = await fetch(
    "https://www.doordash.com/graphql?operation=searchWithFilterFacetFeed",
    {
      method: "POST",
      headers: {
        authority: "www.doordash.com",
        "Content-Type": "application/json",
        accept: "*/*",
        "accept-language": "en-US,en;q=0.6",
        "apollographql-client-name":
          "@doordash/app-consumer-production-ssr-client",
        "apollographql-client-version": "2.2",
        origin: "https://www.doordash.com",
        referer:
          "https://www.doordash.com/search/store/chicken/?event_type=search",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
        "x-channel-id": "marketplace",
        "x-csrftoken": "",
        "x-experience-id": "doordash",
      },
      body: `{"variables":{"cursor":"","filterQuery":"","query":"${query}","displayHeader":true,"isDebug":false},"operationName":"searchWithFilterFacetFeed","query":"query searchWithFilterFacetFeed($cursor: String, $filterQuery: String, $query: String!, $isDebug: Boolean) {   searchWithFilterFacetFeed(cursor: $cursor, filterQuery: $filterQuery, query: $query, isDebug: $isDebug) {     ...FacetFeedV2ResultFragment     __typename   } }  fragment FacetFeedV2ResultFragment on FacetFeedV2Result {   body {     id     header {       ...FacetV2Fragment       __typename     }     body {       ...FacetV2Fragment       __typename     }     layout {       omitFooter       __typename     }     __typename   }   page {     ...FacetV2PageFragment     __typename   }   header {     ...FacetV2Fragment     __typename   }   custom   logging   __typename }  fragment FacetV2Fragment on FacetV2 {   ...FacetV2BaseFragment   childrenMap {     ...FacetV2BaseFragment     __typename   }   __typename }  fragment FacetV2BaseFragment on FacetV2 {   id   childrenCount   component {     ...FacetV2ComponentFragment     __typename   }   name   text {     ...FacetV2TextFragment     __typename   }   images {     main {       ...FacetV2ImageFragment       __typename     }     icon {       ...FacetV2ImageFragment       __typename     }     background {       ...FacetV2ImageFragment       __typename     }     accessory {       ...FacetV2ImageFragment       __typename     }     custom {       key       value {         ...FacetV2ImageFragment         __typename       }       __typename     }     __typename   }   events {     click {       name       data       __typename     }     __typename   }   style {     spacing     background_color     border {       color       width       __typename     }     __typename   }   layout {     omitFooter     gridSpecs {       Mobile {         ...FacetV2LayoutGridFragment         __typename       }       Phablet {         ...FacetV2LayoutGridFragment         __typename       }       Tablet {         ...FacetV2LayoutGridFragment         __typename       }       Desktop {         ...FacetV2LayoutGridFragment         __typename       }       WideScreen {         ...FacetV2LayoutGridFragment         __typename       }       UltraWideScreen {         ...FacetV2LayoutGridFragment         __typename       }       __typename     }     dlsPadding {       top       right       bottom       left       __typename     }     __typename   }   custom   logging   __typename }  fragment FacetV2ComponentFragment on FacetV2Component {   id   category   __typename }  fragment FacetV2TextFragment on FacetV2Text {   title   titleTextAttributes {     textStyle     textColor     __typename   }   subtitle   subtitleTextAttributes {     textStyle     textColor     __typename   }   accessory   accessoryTextAttributes {     textStyle     textColor     __typename   }   description   descriptionTextAttributes {     textStyle     textColor     __typename   }   custom {     key     value     __typename   }   __typename }  fragment FacetV2ImageFragment on FacetV2Image {   uri   placeholder   local   style   logging   events {     click {       name       data       __typename     }     __typename   }   __typename }  fragment FacetV2LayoutGridFragment on FacetV2LayoutGrid {   interRowSpacing   interColumnSpacing   minDimensionCount   __typename }  fragment FacetV2PageFragment on FacetV2Page {   next {     name     data     __typename   }   onLoad {     name     data     __typename   }   __typename } "}`,
    }
  );

  if (res.ok) {
    return await res.json();
  } else {
    throw new HTTPResponseError(res);
  }
};

export { search };
