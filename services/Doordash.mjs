import fetch from "node-fetch";
import { HTTPResponseError } from "../errors/http.mjs";
import Service from "./Service.mjs";

class Doordash extends Service {
  constructor() {
    super();
    this.service = "doordash";
  }

  /*Parse token data from API response
   * @param {Object} data the API reponse from getting token info
   * @return {Object} parased token data
   */
  parseTokenData(data) {
    const { token, refresh_token } = data.token;
    return { accessToken: token, refreshToken: refresh_token };
  }

  async auth({ email, password }) {
    const res = await fetch("https://identity.doordash.com/api/v1/auth/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        tracestate: "@nr=0-2-0-0-db1a24ed9488394c--0--1674456258902",
        accept: "application/json",
        authorization:
          "FuOLnL6SwVUAAAAAAAAAAF7whaV0MUbFAAAAAAAAAACUHvuFj9PQQAAAAAAAAAAA",
        "accept-language": "en-us",
        "user-agent": "DoorDash/30357.210623 CFNetwork/1121.2.2 Darwin/19.3.0",
      },
      body: JSON.stringify({
        credentials: {
          email: email,
          password: password,
        },
      }),
    });

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /* Create a new token, this method should only be called
   * if valid token data does not already exists in the database.
   * if you want to get a token to use, getToken() should be used
   * instead.
   * @return {Object} newly create token data
   */
  async createNewToken() {
    console.log("creating new token");
    const password = "988E4CDA-7367-4F00-BA57-493244C49226";
    const res = await fetch(
      "https://consumer-mobile-bff.doordash.com/v1/consumer_profile/create_full_guest",
      {
        method: "POST",
        headers: {
          "client-version": "ios v4.41.2 b30357.210623",
          "user-agent":
            "DoordashConsumer/4.41.2 (iPhone; iOS 13.3.1; Scale/3.0)",
          "x-experience-id": "doordash",
          "x-support-delivery-fee-sort": "true",
          "x-support-partner-dashpass": "true",
          "x-ios-bundle-identifier": "doordash.DoorDashConsumer",
          "x-support-nested-menu": "true",
          "x-support-schedule-save": "true",
          "accept-language": "en-US;q=1.0, es-MX;q=0.9",
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          password: password,
        }),
      }
    );
    //const tokenData = this.parseTokenData(await res.json());
    const { email } = await res.json();
    const tokenData = this.parseTokenData(
      await this.auth({ email: email, password: password })
    );
    await this.updateToken(tokenData);
    return tokenData;
  }

  /* Search query
   * @param {String} query the query to search
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, location }) {
    const tokenData = await this.getToken();
    console.log(tokenData.accessToken);

    let endpoint = new URL(
      "https://consumer-mobile-bff.doordash.com/v3/search"
    );
    const params = new URLSearchParams({
      query: query,
      lat: location.latitude,
      lng: location.longitude,
    });

    endpoint.search = params;

    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "client-version": "ios v4.41.2 b30357.210623",
        "user-agent": "DoordashConsumer/4.41.2 (iPhone; iOS 13.3.1; Scale/3.0)",
        "x-experience-id": "doordash",
        "x-support-delivery-fee-sort": "true",
        "x-support-partner-dashpass": "true",
        "x-ios-bundle-identifier": "doordash.DoorDashConsumer",
        "x-support-nested-menu": "true",
        "x-support-schedule-save": "true",
        authorization: `JWT ${tokenData.accessToken}`,
        "accept-language": "en-US;q=1.0, es-MX;q=0.9",
        accept: "*/*",
      },
    });

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }
}
export default Doordash;
