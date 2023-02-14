import { searchGrubhub } from "./search.mjs";

/* @param {Object} searchData containing the search parameters
 * ex: {query: "", location: {longitude: 0, latitude: 0}}
 * @return {array} of popular restaurants from grubhub
 */
const popularRestaurants = async (searchData, cookies) => {
  const { latitude, longitude } = JSON.parse(cookies["uev2.loc"]);
  searchData = { ...searchData, location: { latitude, longitude } };
  const serviceSearchData = await searchGrubhub(searchData);

  return { data: serviceSearchData };
};

export { popularRestaurants };
