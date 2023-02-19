import Postmates from "../services/Postmates.mjs";
import Grubhub from "../services/Grubhub.mjs";
import Doordash from "../services/Doordash.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* retrieve detailed location information such as latitude / longitude data
 * @param {Object} locationData the location datato get more detailed info for
 * this data can be retried from /api/autocomplete/location
 * @return {Object} detailed lcation data
 */
const detailLocation = async (locationData) => {
  try {
    const postmates = new Postmates();
    return (await postmates.getDeliveryLocationDetails(locationData)).data;
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

/*Parse postmates store data
 * @param {Object} storeData the store data to parse
 * @return {Object} parsed store information
 */
const parsePostmatesStore = (storeData) => {
  const {
    uuid,
    title,
    heroImageUrls,
    location,
    hours,
    catalogSectionsMap,
    sections,
  } = storeData.data;

  return {
    id: uuid,
    name: title,
    image: heroImageUrls.at(-1).url,
    hours: hours,
    location: {
      streetAddress: location.streetAddress,
      city: location.city,
      zipCode: location.postalCode,
      country: location.country,
    },
    menu: catalogSectionsMap[sections[0].uuid].map((catalogSection) => ({
      categoryId: catalogSection.catalogSectionUUID,
      category: catalogSection.payload.standardItemsPayload.title.text,
      items: catalogSection.payload.standardItemsPayload.catalogItems.map(
        (item) => ({
          id: item.uuid,
          name: item.title,
          description: item.itemDescription,
          price: item.price,
          image: item.imageUrl,
          subsectionId: item.subsectionUuid,
        })
      ),
    })),
  };
};

/*Parse grubhub store data
 * @param {Object} storeData the store data to parse
 * @return {Object} parsed store information
 */
const parseGrubhubStore = (storeData) => {
  const { delivery_fee, available_hours } = storeData.restaurant_availability;
  const { id, name, address, logo, menu_category_list } = storeData.restaurant;
  return {
    id: id,
    name: name,
    image: logo,
    hours: available_hours,
    location: {
      streetAddress: address.street_address,
      city: address.locality,
      zipCode: address.zipCode,
      country: address.country,
    },
    fees: { deliveryFee: delivery_fee.amount },
    menu: menu_category_list.map(
      ({ menu_category_id, name, menu_item_list }) => ({
        categoryId: menu_category_id,
        category: name,
        items: menu_item_list.map(
          ({ id, name, description, price, media_image }) => ({
            id: id,
            name: name,
            description: description,
            price: price.amount,
            image: `${media_image.base_url}${media_image.public_id}`,
          })
        ),
      })
    ),
  };
};

/*Parse DoorDash store data
 * @param {Object} storeData the store data to parse
 * @return {Object} parsed store information
 */
const parseDoorDashStore = (storeData) => {
  const { info, menu } = storeData;
  return {
    restarauntName: info.name,
    image: info.image[0],
    logo: info.image[1],
    location: {
      streetAddress: info.address.streetaddress,
      city: info.address.addressLocality,
      state: info.address.addressRegion,
      country: info.address.addressCountry,
    },
    coordinates: {
      latitude: info.geo.latitude,
      longitude: info.geo.longitude,
    },
    menu: menu.hasMenuSection[0].map((category) => ({
      categoryName: category.name,
      items: category.hasMenuItem.map((item) => ({
        name: item.name,
        price: item.offers.price,
      })),
    })),
  };
};
/*Get detail store information
 * @param {String} service the name of the service the store belongs to
 * @param {String} storeId the id of the store
 * @return {Object} store information
 */
const detailStore = async ({ service, storeId }) => {
    const services = {
    postamtes: Postmates,
    grubhub: Grubhub,
    doordash: Doordash,
  };
  const serviceInstance = new services[service]();
  const store = await serviceInstance.getStore(storeId);

  switch (service) {
    case "postmates":
      return parsePostmatesStore(store);
    case "grubhub":
      return parseGrubhubStore(store);
    case "doordash":
      return parseDoorDashStore(store);
  }
};

export { detailLocation, detailStore };
