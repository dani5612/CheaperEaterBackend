/* eslint-disable no-unused-vars */
import Postmates from "../services/Postmates.mjs";
import Grubhub from "../services/Grubhub.mjs";
import Doordash from "../services/Doordash.mjs";
import { HTTPResponseError } from "../errors/http.mjs";
import { searchDataRemoveDuplicate } from "../utils/data/DataProcessing.mjs";

// store any response cookies to be sent back after search
// currently this is used to update Postamtes search cookies
let RESPONSE_COOKIES = {};

/* Search postmates
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchPostmates = async (searchData, requestCookies) => {
  try {
    const postmates = new Postmates();
    const { data, responseCookies } = await postmates.search({
      ...searchData,
      cookies: requestCookies,
    });

    RESPONSE_COOKIES = { ...RESPONSE_COOKIES, ...responseCookies };

    return {
      stores: data.data.feedItems.reduce((acc, item) => {
        if (item?.store?.storeUuid) {
          const {
            store: { storeUuid, title, mapMarker, meta, rating, image },
          } = item;

          const firstImage = image.items[0];
          let deliveryInfo = {};

          for (const { badgeType, text } of meta) {
            if (badgeType === "FARE") {
              deliveryInfo.deliveryFee = +text.split(" ")[0].replace("$", "");
            } else if (badgeType === "ETD") {
              deliveryInfo.estimatedDeliveryTime = +text.split("–")[0];
            }
          }

          acc.push({
            id: storeUuid,
            title: title.text,
            location: {
              latitude: mapMarker.latitude,
              longitude: mapMarker.longitude,
            },
            ...deliveryInfo,
            rating: rating ? +rating.text : null,
            image: firstImage.url,
          });
        }
        return acc;
      }, []),
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

/* Search grubhub
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchGrubhub = async (searchData) => {
  try {
    const grubHub = new Grubhub();
    return {
      stores: (await grubHub.search(searchData)).search_result.results.map(
        ({
          restaurant_id,
          ratings,
          name,
          logo,
          delivery_fee,
          address,
          delivery_time_estimate,
        }) => ({
          id: restaurant_id,
          title: name,
          location: {
            latitude: +address.latitude,
            longitude: +address.longitude,
          },
          deliveryFee: delivery_fee.price,
          estimatedDeliveryTime: delivery_time_estimate,
          rating: ratings.actual_rating_value,
          image: logo,
        })
      ),
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

/* Search doordash mobile API
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchDoordash = async (searchData) => {
  try {
    const doordash = new Doordash();
    return {
      stores: (await doordash.search(searchData)).body[0].body.map(
        ({
          logging: { store_id, store_latitude, store_longitude },
          text,
          images: {
            main: { uri },
          },
          custom,
        }) => ({
          id: store_id,
          title: text.title,
          location: {
            latitude: store_latitude,
            longitude: store_longitude,
          },
          deliveryFee: +text.custom.modality_display_string
            .split(" ")[0]
            .replace("$", ""),
          estimatedDeliverytime: +text.custom.eta_display_string.split(" ")[0],
          rating: custom?.rating?.average_rating
            ? custom.rating.average_rating
            : null,
          image: uri,
        })
      ),
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

/* Search doordash web API, depricated over mobile API
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
/*
const searchDoordash = async (searchData) => {
  try {
    const doordash = new Doordash();
    return {
      stores: (
        await doordash.search(searchData)
      ).data.searchWithFilterFacetFeed.body[0].body.map(({ logging }) => {
        const data = JSON.parse(logging);
        const {
          store_latitude,
          store_longitude,
          store_name,
          display_image_url,
          star_rating,
          store_id,
          asap_time,
          delivery_fee_amount,
        } = data;
        return {
          id: store_id,
          title: store_name,
          location: { latitude: store_latitude, longitude: store_longitude },
          deliveryFee: delivery_fee_amount,
          estimatedDeliverytime: asap_time,
          rating: +star_rating,
          image: display_image_url,
        };
      }),
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};
*/

/* Seach all delivery services
 * @param {Object} searchData containing the search parameters
 * ex: {query: "", location: {longitude: 0, latitude: 0}}
 * @return {array} an array of service objects
 */
const search = async (searchData) => {
  const { cookies } = searchData;
  const { latitude, longitude } = JSON.parse(
    decodeURIComponent(cookies["uev2.loc"])
  );
  searchData = { ...searchData, location: { latitude, longitude } };
  const services = ["postmates", "grubhub", "doordash"];
  const serviceSearchData = await Promise.all([
    searchPostmates(searchData, cookies),
    searchGrubhub(searchData),
    //searchDoordash(searchData),
  ]);

  return {
    cookies: RESPONSE_COOKIES,
    data: searchDataRemoveDuplicate(
      services.map((service, index) => ({
        service: service,
        ...serviceSearchData[index],
      })),
      { latitude, longitude }
    ),
  };
};

export { search, searchGrubhub };
