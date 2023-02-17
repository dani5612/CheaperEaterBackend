import { searchGrubhub } from "./search.mjs";

/* @param {Object} searchData containing the search parameters
 * ex: {query: "", location: {longitude: 0, latitude: 0}}
 * @return {array} of popular restaurants from grubhub
 * @param {Object} searchData containing the search parameters
 */
const popularRestaurants = async (searchData, cookies) => {
  const { latitude, longitude } = JSON.parse(cookies["uev2.loc"]);
  searchData = { ...searchData, location: { latitude, longitude } };

  return await searchGrubhub(searchData);
};

export { popularRestaurants };
