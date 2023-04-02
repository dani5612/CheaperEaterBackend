import { env } from "node:process";
import { v4 as uuidv4 } from "uuid";
import jwt_decode from "jwt-decode";
import fetch from "node-fetch";
import Service from "./Service.mjs";

class Doordash extends Service {
  constructor() {
    super();
    this.service = "doordash";
  }

  /* Assure a token is always valid, ie: nerver expired
   * @param {Object} tokenData token data (expiration times and token data)
   * @return {Object} valid tokenData, one of new token or
   * original passed in token depending on validity of passed in tokenData.
   */
  async getValidToken(tokenData) {
    const { accessTokenIsValid } = this.areTokensValid(tokenData);

    if (!accessTokenIsValid) {
      return await this.createNewToken();
    }
    return tokenData;
  }
  /*Parse token data from API response
   * @param {Object} data the API reponse from getting token info
   * @param {String} tokenField the field the token data is located in
   * @return {Object} parased token data
   */
  parseTokenData(data, tokenField = "token") {
    const { token, refresh_token } = data[tokenField];
    return {
      accessToken: token,
      refreshToken: refresh_token,
      accessTokenExpireTime: jwt_decode(token).exp * 1000,
    };
  }

  /*Retrieve a new accesss token and refresh token using the email and password of an account
   * @param {Object} payload
   * @param {String} payload.email account email
   * @param {String} payload.pasword account password
   * @return {Object} auth token data
   */
  async auth({ email, password }) {
    return await (
      await this.callServiceAPI(() =>
        fetch("https://identity.doordash.com/api/v1/auth/token", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: env.DOORDASH_DEFAULT_AUTH_TOKEN,
            "accept-language": "en-us",
            "user-agent":
              "DoorDash/30357.210623 CFNetwork/1121.2.2 Darwin/19.3.0",
          },
          body: JSON.stringify({
            credentials: {
              email: email,
              password: password,
            },
          }),
        })
      )
    ).json();
  }

  /*Auto complete locations
   * @param {String} query the location query
   * @return {Array} location results
   */
  async autocompleteLocation(query) {
    return await (
      await this.callServiceAPI(() => {
        let endpoint = new URL(
          "https://maps.googleapis.com/maps/api/place/autocomplete/json"
        );

        const params = new URLSearchParams({
          input: query,
          key: env.DOORDASH_GOOGLE_MAPS_API_KEY,
          language: "en",
        });

        endpoint.search = params;
        return fetch(endpoint.toString(), { method: "GET" });
      })
    ).json();
  }

  /* Add a default consumer address for an account.
   * Note that this is reqired to give guest accounts necessary permissions.
   * Currently the location defaults to long beach
   * @param {String} accessToken the token associated with an account
   * @return {Object} set data
   */
  async addDefaultConsumerAddress(accessToken) {
    return await (
      await this.callServiceAPI(() =>
        fetch(
          "https://consumer-mobile-bff.doordash.com/graphql/AddDefaultConsumerAddress",
          {
            method: "POST",
            headers: {
              accept: "application/json",
              authorization: `JWT ${accessToken}`,
              "accept-language": "en-US",
              "client-version": "android v15.92.12 b15092129",
              "user-agent": "DoorDashConsumer/Android 15.92.12",
              "x-experience-id": "doordash",
              "dd-user-locale": "en-US",
              "x-bff-error-format": "v2",
              "content-type": "application/json; charset=utf-8",
            },
            body: JSON.stringify({
              operationName: "AddDefaultConsumerAddress",
              variables: {
                addAddressInput: {
                  address: "Long Beach, CA, USA",
                  addressType: "UNSPECIFIED",
                  dropOffPreferences: [
                    {
                      instructions: "",
                      optionId: "DdCid:_&1_1",
                      setSelected: false,
                    },
                    {
                      instructions: "",
                      optionId: "DdCid:_&1_2",
                      setSelected: true,
                    },
                  ],
                  googlePlaceId: "ChIJWdeZQOjKwoARqo8qxPo6AKE",
                  manualLatLng: null,
                  setDefault: true,
                  subpremise: "",
                },
                offset: 0,
                limit: 100,
              },
              query:
                "mutation AddDefaultConsumerAddress($addAddressInput: AddConsumerAddressInput!, $offset: Int!, $limit: Int!) { addConsumerAddress(addAddressInput: $addAddressInput) { __typename ... on Consumer { id defaultAddress { __typename ... consumerAddress ... on ContractError { ...contractError reason } } availableAddresses(offset: $offset, limit: $limit) { __typename ... consumerAddress } } } } fragment consumerAddress on ConsumerAddress { __typename id street city zipCode state submarketId subpremise type geoLocation { __typename lat lng } adjustedGeoLocation { __typename lat lng } shortname country { __typename name shortName } district { __typename id } printableAddress { __typename line1 line2 } dropoffOptions { __typename ... on ConsumerDropOffOption { id disabledMessage displayString instructions isSelected isEnabled placeholderInstructionText } } } fragment contractError on ContractError { __typename correlationId debugMessage errorCode localizedMessage localizedTitle reason }",
            }),
          }
        )
      )
    ).json();
  }

  /* Create a new token using a new account.
   * This method should only be called
   * if valid token data does not already exists in the database.
   * if you want to get a token to use, getToken() should be used
   * instead.
   * @return {Object} newly create token data
   */
  async createNewToken() {
    const data = await (
      await this.callServiceAPI(() =>
        fetch(
          "https://consumer-mobile-bff.doordash.com/v1/consumer_profile/create_full_guest",
          {
            method: "POST",
            headers: {
              "client-version": "android v15.92.12 b15092129",
              "user-agent":
                "DoorDashConsumer/15.92.12 (Android 10; Motorola MotoG3)",
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
              password: uuidv4(),
            }),
          }
        )
      )
    ).json();

    const tokenData = this.parseTokenData(data, "auth_token");
    await this.addDefaultConsumerAddress(tokenData.accessToken);
    await this.updateToken(tokenData);
    return tokenData;
  }

  /* Search query
   * @param {Object} payload
   * @param {String} query the query to search
   * @param {String} payload.location.latitude location latitude
   * @param {String} location.longitude location longitude
   * @return {Object} the search result or HTTPResponseError
   */
  async search({ query, location }) {
    return await (
      await this.callServiceAPI(async () => {
        let endpoint = new URL(
          "https://consumer-mobile-bff.doordash.com/v3/feed/search"
        );
        const params = new URLSearchParams({
          query: query,
          lat: location.latitude,
          lng: location.longitude,
        });

        endpoint.search = params;

        return fetch(endpoint.toString(), {
          method: "GET",
          headers: {
            "x-facets-version": "3.0.1",
            "client-version": "android v15.92.12 b15092129",
            "user-agent": "DoorDashConsumer/Android 15.92.12",
            "x-experience-id": "doordash",
            "x-support-delivery-fee-sort": "true",
            "x-support-partner-dashpass": "true",
            "x-ios-bundle-identifier": "doordash.DoorDashConsumer",
            "x-support-nested-menu": "true",
            "x-support-schedule-save": "true",
            authorization: `JWT ${(await this.getToken()).accessToken}`,
            "accept-language": "en-US;q=1.0, es-MX;q=0.9",
            accept: "*/*",
          },
        });
      })
    ).json();
  }

  /* Get store infomation
   * @param {String} storeId of the store
   * @return {Object} store data
   */
  async getStore(storeId) {
    return await (
      await this.callServiceAPI(async () =>
        fetch(`https://consumer-mobile-bff.doordash.com/v2/stores/${storeId}`, {
          method: "GET",
          headers: {
            "x-facets-feature-save-for-later-items": "false",
            "x-store-dietary-tagging-enabled": "false",
            authorization: `JWT ${(await this.getToken()).accessToken}`,
            "accept-language": "en-US",
            "client-version": "android v15.92.12 b15092129",
            "user-agent": "DoorDashConsumer/Android 15.92.12",
            "x-experience-id": "doordash",
            "x-support-partner-dashpass": "true",
            "dd-user-locale": "en-US",
            "x-bff-error-format": "v2",
          },
        })
      )
    ).json();
  }

  /*
   * Depricated over mobile API
   * Get store Menu
   * @param {String} storeID of relevant store
   * @return {Object} data
   * @return {Object} data.info store information
   * @return {Object} data.menu store menu
   */
  //async getStore(storeID) {
  //  const browser = await puppeteer.launch();
  //  const page = await browser.newPage();
  //  await page.setUserAgent(
  //    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36"
  //  );
  //  await page.goto("https://www.doordash.com/store/" + storeID + "/");

  //  const pageContent = await page.content();
  //  const storeHtml = load(pageContent);
  //  const scripts = storeHtml('script[type="application/ld+json"]');

  //  const scriptTexts = [];
  //  scripts.each(function () {
  //    const scriptText = storeHtml(this).html().replace("</script>", "");
  //    try {
  //      JSON.parse(scriptText);
  //    } catch (e) {
  //      console.error("Error: Data is NOT a JSON");
  //    }
  //    scriptTexts.push(scriptText);
  //  });
  //  setTimeout(async () => {
  //    await browser.close();
  //  });
  //  return {
  //    info: JSON.parse(scriptTexts[0]),
  //    menu: JSON.parse(scriptTexts[2]),
  //  };
  //}
}
export default Doordash;
