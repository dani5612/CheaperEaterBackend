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

export { autocompleteLocation };
