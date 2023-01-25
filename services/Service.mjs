import { getDB } from "../database.mjs";

class Service {
  constructor() {}
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
