import { HTTPResponseError } from "../errors/http.mjs";
import { getDB } from "../database.mjs";

// add onExternalAPICall() -> lmabda for all api calls and errors

class Service {
  constructor() {}

  /* External fetch API call
   * @callback call
   * @return {Object} fetch response
   */

  /* Action on unsucessfull (error) API call
   * @callback onSuccess
   */

  /*External API call wrapper
   * @param {call} function to call api
   * @param {onError} callback on error
   * @return fetch response
   */
  async callServiceAPI(call, onError) {
    const res = await call();
    if (res.ok) {
      return res;
    } else {
      if (onError) {
        await onError(res);
      }
      throw new HTTPResponseError(res);
    }
  }

  /*Checks if tokens are valid using database experitation times
   *@return {Object} boolean values indicating the validity of both the refresh
   * and access tokens
   */
  areTokensValid({ refreshTokenExpireTime, accessTokenExpireTime }) {
    const today = new Date().getTime();
    return {
      refreshTokenIsValid: today < refreshTokenExpireTime,
      accessTokenIsValid: today < accessTokenExpireTime,
    };
  }

  /*Get currently store token from the database, if token does not
   *exist, a new token is created
   *@return {Object} the token data that was retrieved from the database or created
   */
  async getToken() {
    try {
      const tokensCollection = (await getDB()).collection("tokens");
      const tokenData = await tokensCollection.findOne({
        service: this.service,
      });

      if (!tokenData) {
        return this.createNewToken();
      }

      // assure the token returned is always valid, ie: not expired
      return this.getValidToken(tokenData);
    } catch (e) {
      console.error(e);
    }
  }

  /* Update token data in database
   *@param {Object} token data to update
   *@return {Object} token data stored
   */
  async updateToken(tokenData) {
    try {
      const tokensCollection = (await getDB()).collection("tokens");
      await tokensCollection.updateOne(
        { service: this.service },
        { $set: tokenData },
        {
          upsert: true,
        }
      );
      return tokenData;
    } catch (e) {
      console.error(e);
    }
  }
}

export default Service;
