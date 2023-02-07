import Postmates from "../services/Postmates.mjs";
import { HTTPResponseError } from "../errors/http.mjs";

/* Get Menu for Restaraunt given restarauntID
 * Hardcoded on line 14 for testing purposes; should point to McDonaldo
 * @param {Object} loationDetails location details obtained from /api/detail/location
 * @return {Array} cookies containing Postmates location data
 * //Stores have different hero URLs
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
