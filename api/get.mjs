import Grubhub from "../services/Grubhub.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

// store any response cookies to be sent back after search
// currently this is used to update Postamtes search cookies
let resCookies = [];

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

/* Seach all delivery services
 * @param {Object} searchData containing the search parameters
 * ex: {query: "", location: {longitude: 0, latitude: 0}}
 * @return {array} an array of service objects
 */
const popularRestaurants = async (searchData, cookies) => {
  const { latitude, longitude } = JSON.parse(cookies["uev2.loc"]);
  searchData = { ...searchData, location: { latitude, longitude } };
  const services = ["grubhub"];
  const serviceSearchData = await Promise.all([searchGrubhub(searchData)]);

  return {
    responseCookies: resCookies,
    data: services.map((service, index) => ({
      service: service,
      ...serviceSearchData[index],
    })),
  };
};

export { popularRestaurants };
