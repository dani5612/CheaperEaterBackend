import Postmates from "../services/Postmates.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Get restaraunt menu
 * @param {String} contains the restraunt ID (Should come from search results as storeUUID)
 * @return {Array} an array of [storeName, storeID, storeImage, storeHours,
 * menu[category[items[name, description, price, image]]]], or HTTPResponseError
 */

const getMenu = async () => {
  try {
    const postmates = new Postmates();
    const store = await postmates.getMenu(
      "279b635a-4575-45d8-ad52-e6f5b2a45199"
    );
    const imageLength = store.data.heroImageUrls.length;
    const sectionMapID = store.data.sections[0].uuid;
    console.log(sectionMapID);

    return {
      name: store.data.title,
      id: store.data.uuid,
      image: store.data.heroImageUrls[imageLength - 1].url,
      hours: store.data.hours,
      menu: store.data.catalogSectionsMap[sectionMapID].map(
        (catalogSection) => ({
          category: catalogSection.payload.standardItemsPayload.title.text,
          items: catalogSection.payload.standardItemsPayload.catalogItems.map(
            (item) => ({
              name: item.title,
              description: item.itemDescription,
              price: item.price / 100,
              image: item.imageUrl,
              subsectionID: item.subsectionUuid,
              itemID: item.uuid,
            })
          ),
        })
      ),
    };
  } catch (e) {
    if (e instanceof HTTPResponseError) {
      return { error: await e.getError() };
    } else {
      console.error(e);
    }
  }
};

export { getMenu };
