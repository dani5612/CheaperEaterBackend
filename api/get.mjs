import { searchGrubhub } from "./search.mjs";

/* Popular Restaurants fetching from GrubHub based on location
 * @param {Object} searchData containing the search parameters
 * @return {array} of popular restaurants from grubhub
 */
const popularRestaurants = async (searchData) => {
  const { latitude, longitude } = JSON.parse(
    decodeURIComponent(searchData.cookies["uev2.loc"])
  );

  searchData = { query: "", location: { latitude, longitude } };

  return await searchGrubhub(searchData);
};

export { popularRestaurants };
