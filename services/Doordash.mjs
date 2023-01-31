import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";
import jwt_decode from "jwt-decode";
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
    return {
      accessToken: token,
      refreshToken: refresh_token,
      accessTokenExpireTime: jwt_decode(token).exp * 1000,
    };
  }

  /*Retrieve a new accesss token and refresh token using the email and password of an account
   * @param {String} email
   * @param {String} pasword
   * @return {Object} auth token data
   */
  async auth({ email, password }) {
    console.log("auth");
    const res = await fetch("https://identity.doordash.com/api/v1/auth/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: env.DOORDASH_DEFAULT_AUTH_TOKEN,
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

  /* Create a new token using credentials for an existing account.
   * By default, guest account info in env file is used.
   * This method should only be called if valid token data does
   * not already exists in the database. If you want to get a token
   * to use, getToken() should be used instead.
   * @param {Object} credentials containing email and password of account
   * @return {Object} newly create token data
   */
  async createNewToken(
    credentials = {
      email: env.DOORDASH_GUEST_EMAIL,
      password: env.DOORDASH_GUEST_PASSWORD,
    }
  ) {
    const res = await fetch("https://identity.doordash.com/api/v1/auth/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: env.DOORDASH_DEFAULT_AUTH_TOKEN,
        "accept-language": "en-us",
        "user-agent": "DoorDash/27397.210527 CFNetwork/1121.2.2 Darwin/19.3.0",
      },
      body: JSON.stringify({ credentials: credentials }),
    });

    if (res.ok) {
      const tokenData = this.parseTokenData(await res.json());
      console.log("token data:");
      console.log(tokenData);
      await this.updateToken(tokenData);
      return tokenData;
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /* Create a new token using a new account. Note that this method needs more work.
   * and is not yet complete. It looks like accounts created with the method do not have the
   * necessary permissions. This method should only be called
   * if valid token data does not already exists in the database.
   * if you want to get a token to use, getToken() should be used
   * instead.
   * @return {Object} newly create token data
   */
  async createNewTokenWithNewAccount() {
    const password = uuidv4();
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
    if (res.ok) {
      const { email } = await res.json();
      console.log(email);
      const tokenData = this.parseTokenData(
        await this.auth({ email: email, password: password })
      );
      await this.updateToken(tokenData);
      return tokenData;
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /* Search query
   * @param {String} query the query to search
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, location }) {
    let tokenData = await this.getToken();
    const { accessTokenIsValid } = this.areTokensValid(tokenData);

    if (!accessTokenIsValid) {
      tokenData = this.createNewToken();
    }

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
