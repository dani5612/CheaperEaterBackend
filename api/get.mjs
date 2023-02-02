import Postmates from "../services/Postmates.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Set location for Postmates API calls
 * @param {Object} loationDetails location details obtained from /api/detail/location
 * @return {Array} cookies containing Postmates location data
 */
const getMenu = async () => {
  try {
    const postmates = new Postmates();
    return await postmates.getMenu("junkdata");
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

export { getMenu };
