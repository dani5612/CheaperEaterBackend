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

/* Add category to menu
 * @param {Object} category
 * @param {String} category.name the name of the category
 * @param {String} category.id the id of the cateogry
 * @param {Object} menu to add category to
 * @param {Object} items to add to category
 * @param {String} service name of default / first service
 */
const addCategoryToMenu = ({ category, menu, items, service }) => {
  menu[category.name] = {
    categoryId: category.id,
    categoryIds: { [service]: category.id },
    category: category.name,
    items: items,
  };
};

/* Add item to menu
 * @param {Object} categoryItems cateogry items to add item to
 * @param {Objet} item to add
 * @param {String} service name of default / first service
 */
const addItemToMenu = ({ categoryItems, item, service }) => {
  categoryItems[item.name] = {
    id: item.id,
    name: item.name,
    description: item.description,
    prices: { [service]: item.price },
    image: item.image,
    subsectionId: item.subsectionId,
    ids: { [service]: item.id },
  };
};

/*Get detail store information for the specified services
 * @param {Array} storeIds objects with services and corresponding
 * store ids ex: {"postmates": "id"}
 * @return {Object} store information
 */
const detailStore = async ({ serviceIds, page }) => {
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

    for (const { category, categoryId, items } of defaultService.menu) {
      addCategoryToMenu({
        category: { id: categoryId, name: category },
        menu: menu,
        items: {},
        service: defaultService.service,
      });
      for (const item of items) {
        addItemToMenu({
          categoryItems: menu[category].items,
          service: defaultService.service,
          item: item,
        });
      }
    }

    serviceStores.shift();

    // merging menu items of the same category
    for (const serviceStore of serviceStores) {
      for (const { categoryId, category, items } of serviceStore.menu) {
        if (menu[category]) {
          menu[category].categoryIds[serviceStore.service] = categoryId;
          for (const item of items) {
            if (menu[category].items[item.name]) {
              menu[category].items[item.name].prices[serviceStore.service] =
                item.price;
              menu[category].items[item.name].ids[serviceStore.service] =
                item.id;
            }
            // if item does not already exist, add it
            else {
              addItemToMenu({
                categoryItems: menu[category].items,
                service: serviceStore.service,
                item: item,
              });
            }
          }
          // if category does not already exist, add it
        } else {
          addCategoryToMenu({
            category: { id: categoryId, name: category },
            menu: menu,
            items: {},
            service: serviceStore.service,
          });
        }
      }
    }

    // removing application specific categories
    // postmates
    delete menu["Picked for you"];
    // flattening hashmaps as arrays

    let menuPages = {};
    let pageIndex = 0;

    for (const category of Object.values(menu)) {
      menuPages[++pageIndex] = {
        ...category,
        items: Object.values(category.items),
      };
    }

    return {
      id: defaultService.id,
      name: defaultService.name,
      image: defaultService.image,
      hours: defaultService.hours,
      location: defaultService.location,
      menu: menuPages[page],
      maxPages: pageIndex,
    };
  });
};

export { detailLocation, detailStore };
