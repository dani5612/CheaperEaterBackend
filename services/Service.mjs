import { getDB } from "../database.mjs";

class Service {
  constructor() {}

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

      return tokenData;
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
