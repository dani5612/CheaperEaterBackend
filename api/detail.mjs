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
            image: media_image
              ? `${media_image.base_url}${media_image.public_id}`
              : "",
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
      streetAddress: info.address.streetAddress,
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

/*Get detail store information for the specified services
 * @param {Array} storeIds objects with services and corresponding
 * store ids ex: {"postmates": "id"}
 * @return {Object} store information
 */
const detailStore = async (serviceIds) => {
  const services = {
    postmates: { instance: Postmates, parser: parsePostmatesStore },
    grubhub: { instance: Grubhub, parser: parseGrubhubStore },
    doordash: { instance: Doordash, parser: parseDoorDashStore },
  };

  return Promise.all(
    serviceIds.reduce((accServices, { service, id }) => {
      if (id) {
        accServices.push(
          new services[service].instance().getStore(id).then((store) => ({
            service: service,
            ...services[service].parser(store),
          }))
        );
      }
      return accServices;
    }, [])
  ).then((serviceStores) => {
    let menu = {};

    const defaultService = serviceStores[0];

    // settingup menu hashmap structure
    for (const { category, categoryId, items } of defaultService.menu) {
      let itemHashMap = {};
      for (const item of items) {
        itemHashMap[item.name] = {
          id: item.id,
          name: item.name,
          description: item.description,
          prices: { [defaultService.service]: item.price },
          image: item.image,
          subsectionId: item.subsectionId,
          ids: { [defaultService.service]: item.id },
        };
      }
      menu[category] = {
        categoryId: categoryId,
        categoryIds: { [defaultService.service]: categoryId },
        category: category,
        items: itemHashMap,
      };
    }

    serviceStores.shift();

    // merging menu items of the same category
    for (const serviceStore of serviceStores) {
      for (const { categoryId, category, items } of serviceStore.menu) {
        menu[category].categoryIds[serviceStore.service] = categoryId;
        for (const item of items) {
          menu[category].items[item.name].prices[serviceStore.service] =
            item.price;
          menu[category].items[item.name].ids[serviceStore.service] = item.id;
        }
      }
    }

    // removing application specific categories
    // postmates
    delete menu["Picked for you"];

    return {
      id: defaultService.id,
      name: defaultService.name,
      image: defaultService.image,
      hours: defaultService.hours,
      location: defaultService.location,
      // flattening hashmaps as arrays
      menu: Object.values(menu).map((category) => ({
        ...category,
        items: Object.values(category.items),
      })),
    };
  });
};

export { detailLocation, detailStore };
