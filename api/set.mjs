import Postmates from "../services/Postmates.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Set location for Postmates API calls
 * @param {Object} loationDetails location details obtained from /api/detail/location
 * @return {Array} cookies containing Postmates location data
 */
const setLocation = async (locationDetails) => {
  try {
    const postmates = new Postmates();
    return {
      cookies: (await postmates.setLocation(locationDetails)).responseCookies,
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

export { setLocation };
