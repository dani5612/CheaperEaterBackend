import Postmates from "../services/Postmates.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Autocomplete location
 * @param {String} query location query to auto complete
 * @return {Array} auto complete results
 */
const autocompleteLocation = async (query) => {
  try {
    const postmates = new Postmates();
    return (await postmates.getLocationAutocomplete(query)).data;
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

/* Autocomplete search
 * @param {query} query to autocomplete
 * @retunr {Array} auto complete results
 */
const autocompleteSearch = async (query, cookies) => {
  try {
    const postmates = new Postmates();
    const { data, responseCookies } = await postmates.autocompleteSearch({
      query: query,
      cookies: cookies,
    });

    return {
      responseCookies: responseCookies,
      data: data.data.reduce((acc, { store }) => {
        if (store) {
          acc.push({
            uuid: store.uuid,
            title: store.title,
            image: store.heroImageUrl,
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

export { autocompleteLocation, autocompleteSearch };
