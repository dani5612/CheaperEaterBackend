import { search as postmatesSearch } from "../services/postmates.mjs";
import { search as grubhubSearch } from "../services/grubhub.mjs";
import { search as doordashSearch } from "../services/doordash.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Seairch postmates
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchPostmates = async (query) => {
  try {
    return {
      stores: (await postmatesSearch(query)).data.feedItems.map(
        ({ store: { storeUuid, title, mapMarker, meta, rating, image } }) => {
          const firstImage = image.items[0];
          let deliveryInfo = {};

          for (const { badgeType, text } of meta) {
            if (badgeType === "FARE") {
              deliveryInfo.deliveryFee = +text.split(" ")[0].replace("$", "");
            } else if (badgeType === "ETD") {
              deliveryInfo.estimatedDeliveryTime = +text.split("–")[0];
            }
          }

          return {
            id: storeUuid,
            title: title.text,
            location: {
              latitude: mapMarker.latitude,
              longitude: mapMarker.longitude,
            },
            ...deliveryInfo,
            rating: rating ? +rating.text : null,
            image: firstImage.url,
          };
        }
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

/* Search grubhub
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchGrubhub = async (query) => {
  try {
    return {
      stores: (await grubhubSearch(query)).search_result.results.map(
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
            latitude: address.latitude,
            longitude: address.longitude,
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

/* Search doordash
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {object} either a stores object or error
 */
const searchDoordash = async (query) => {
  try {
    //console.log(await doordashSearch(query));
    return {
      stores: (
        await doordashSearch(query)
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

/* Seach all delivery services
 * @param {string} query the query to search from (ex:pizza, mcdonalds)
 * @return {array} an array of service objects
 */
const search = async ({ query }) => {
  return [
    {
      service: "postmates",
      ...(await searchPostmates(query)),
    },
    {
      service: "grubhub",
      ...(await searchGrubhub(query)),
    },
    { service: "doordash", ...(await searchDoordash(query)) },
  ];
};

export { search };
