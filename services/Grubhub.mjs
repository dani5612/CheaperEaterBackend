import { env } from "node:process";
import fetch from "node-fetch";

import { HTTPResponseError } from "../errors/http.mjs";
import Service from "./Service.mjs";

class Grubhub extends Service {
  constructor() {
    super();
    this.service = "grubhub";
    this.clientId = env.GRUBHUB_CLIENT_ID;
  }

  /*Parse token data from API response
   * @param {Object} data the API reponse from getting token info
   * @return {Object} parased token data
   */
  parseTokenData(data) {
    const {
      access_token,
      refresh_token,
      token_expire_time,
      refresh_token_expire_time,
    } = data.session_handle;

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      accessTokenExpireTime: token_expire_time,
      refreshTokenExpireTime: refresh_token_expire_time,
    };
  }

  /* Assure a token is always valid, ie: nerver expired
   * @param {Object} tokenData token data (expiration times and token data)
   * @return {Object} valid tokenData, one of refreshed token, new token, or
   * original passed in token depending on validity of passed in tokenData.
   */
  async getValidToken(tokenData) {
    const { refreshTokenIsValid, accessTokenIsValid } =
      this.areTokensValid(tokenData);

    // update tokens if invalid
    if (!accessTokenIsValid) {
      if (refreshTokenIsValid) {
        return await this.refreshAuth(tokenData.refreshToken);
      } else {
        return await this.createNewToken();
      }
    }

    return tokenData;
  }

  /* Create a new token, this method should only be called
   * if valid token data does not already exists in the database.
   * if you want to get a token to use, getToken() should be used
   * instead.
   * @return {Object} newly create token data
   */
  async createNewToken() {
    const res = await fetch("https://api-gtm.grubhub.com/auth", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        tracestate: "@nr=0-2-0-0-cfd18ff8408d2318--0--1674429822078",
        "x-px-authorization": "4",
        accept: "*/*",
        "accept-language": "en-us",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
      },
      body: JSON.stringify({
        brand: "GRUBHUB",
        client_id: this.clientId,
        scope: "anonymous",
      }),
    });
    return await this.updateToken(this.parseTokenData(await res.json()));
  }

  /* Refresh authentication tokens and store new token data in database
   * @param {String} refreshToken the refresh token used to get new tokens
   * @return {Object} the object containing the new token data
   */
  async refreshAuth(refreshToken) {
    const res = await fetch("https://api-gtm.grubhub.com/auth/refresh", {
      method: "POST",
      headers: {
        accept: "*/*",
        "accept-language": "en-us",
        "content-type": "application/json",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
        "x-newrelic-id": "VQQDVlBVGwoBVVRSBQkO",
        "x-px-authorization": "4",
        "x-px-bypass-reason":
          "An%20SSL%20error%20has%20occurred%20and%20a%20secure%20connection%20to%20the%20server%20cannot%20be%20made.",
        "x-px-original-token": env.GRUBHUB_XPX_TOKEN,
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: "anonymous",
        brand: "GRUBHUB",
        refresh_token: refreshToken,
      }),
    });

    const tokenData = this.parseTokenData(await res.json());
    await this.updateToken(tokenData);
    return tokenData;
  }

  /* Search query
   * @param {String} query the query to search
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, location }) {
    let endpoint = new URL("https://api-gtm.grubhub.com/restaurants/search");
    const params = new URLSearchParams({
      orderMethod: "delivery",
      locationMode: "DELIVERY",
      facetSet: "umamiV6",
      pageSize: 20,
      hideHateos: true,
      searchMetrics: true,
      queryText: query,
      location: `POINT(${location.longitude} ${location.latitude})`,
      preciseLocation: true,
      includeOffers: true,
      sortSetId: "umamiv3",
      sponsoredSize: 3,
      countOmittingTimes: true,
    });

    endpoint.search = params;

    const res = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "x-px-authorization": env.GRUBHUB_XPX_TOKEN,
        accept: "*/*",
        authorization: `Bearer ${(await this.getToken()).accessToken}`,
        "accept-language": "en-us",
        "user-agent": "GrubHub/2022.32 (iPhone; iOS 13.3.1; Scale/3.00)",
        vary: "Accept-Encoding",
      },
    });

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }

  /*Get store information. Wraps web API
   * @param storeId the store id
   * @return {Object} object containing store information
   */
  async getStore(storeId) {
    let endpoint = new URL(
      `https://api-gtm.grubhub.com/restaurants/${storeId}`
    );

    const params = new URLSearchParams({
      hideChoiceCategories: true,
      version: 4,
      variationId: "rtpFreeItems",
      orderType: "standard",
      hideUnavailableMenuItems: true,
      hideMenuItems: false,
      locationMode: "delivery",
    });

    endpoint.search = params;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        authority: "api-gtm.grubhub.com",
        accept: "application/json",
        "accept-language": "en-US,en;q=0.5",
        authorization: `Bearer ${(await this.getToken()).accessToken}`,
        origin: "https://www.grubhub.com",
        referer: "https://www.grubhub.com/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "sec-gpc": "1",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36",
      },
    });

    if (res.ok) {
      return await res.json();
    } else {
      throw new HTTPResponseError(res);
    }
  }
}

export default Grubhub;
