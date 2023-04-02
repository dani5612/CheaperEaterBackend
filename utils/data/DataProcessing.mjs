import stringSimilarity from "string-similarity";

/**
 * searchDataRemoveDuplicate function processes the searchData and removes the duplicate items and reformat
 * the json structure while merging the store info and ids from all the services
 *
 * @param {searchData} searchData is an array of json in the given format [{service:..., stores:[]}, {service:..., stores:[]}, ...]
 * @returns the array of json in the given format
 * [{
 *      title:...,
 *      location:{
 *          lat: ...
 *			lon: ...
 *		},
 *		deliveryFee: ...,
 *		estimatedDeliveryTime: ...,
 *		rating: ...
 *		image: ...
 *		ids:{
 *			postmates: ...
 *			grubhub: ...
 *			doordash: ...
 *		}
 *  }, ...]
 */
const searchDataRemoveDuplicate = (searchData, currentLocation) => {
  var duplicateObjs = [];
  var nonDuplicateObjs = [];
  var tempJson = [];

  const itr = searchData.values();
  for (const v of itr) {
    v.stores.forEach((element) => {
      tempJson.push({
        service: v.service,
        title: element.title,
        location: {
          latitude: +element.location.latitude,
          longitude: +element.location.longitude,
        },
        id: element.id,
        ids: {
          postmates: null,
          grubhub: null,
          doordash: null,
        },
        deliveryFee: element.deliveryFee,
        estimatedDeliveryTime: element.estimatedDeliveryTime,
        rating: element.rating,
        image: element.image,
        matched: false,
      });
    });
  }

  for (let i = 0; i < tempJson.length; i++) {
    for (let j = i + 1; j < tempJson.length - i; j++) {
      if (
        stringSimilarity.compareTwoStrings(
          tempJson[i].title,
          tempJson[j].title
        ) > 0.5 &&
        Math.abs(
          tempJson[i].location.latitude - tempJson[j].location.latitude
        ) < 0.001 &&
        Math.abs(
          tempJson[i].location.longitude - tempJson[j].location.longitude
        ) < 0.001
      ) {
        tempJson[i].matched = true;
        tempJson[j].matched = true;
        if (tempJson[i].service == "postmates") {
          if (duplicateObjs[duplicateObjs.length - 1] != tempJson[i]) {
            tempJson[i].ids[tempJson[i].service] = tempJson[i].id;
            duplicateObjs.push(tempJson[i]);
          }
        } else if (tempJson[j].service == "postmates") {
          if (duplicateObjs[duplicateObjs.length - 1] != tempJson[j]) {
            tempJson[j].ids[tempJson[j].service] = tempJson[j].id;
            duplicateObjs.push(tempJson[j]);
          }
        }
        tempJson[i].ids[tempJson[j].service] = tempJson[j].id;
        tempJson = tempJson
          .slice(0, j)
          .concat(tempJson.slice(j + 1, tempJson.length));
        j--;
      }
    }
    if (tempJson[i].matched == false) {
      tempJson[i].ids[tempJson[i].service] = tempJson[i].id;
      nonDuplicateObjs.push(tempJson[i]);
    }
    tempJson = tempJson
      .slice(0, i)
      .concat(tempJson.slice(i + 1, tempJson.length));
    i--;
  }

  var totalObjs = duplicateObjs.concat(nonDuplicateObjs);
  totalObjs.forEach((element) => {
    delete element.matched;
    delete element.service;
  });

  /**
   * Converts degrees into radians
   * @param {Number} degrees you want to covert into radians
   * @returns the radians values of the degrees you entered in the parameter
   */
  const degreesToRadians = (degrees) => {
    return (degrees * Math.PI) / 180;
  };

  /**
   * Function to calculate distance in miles between current lat-lon and given lat-lon in the argument
   * @param {Number} lat destination latitude in degrees
   * @param {Number} lon destination longitude in degrees
   * @returns The distance in miles between the current location and entered destination location
   */
  const distanceInMiles = (lat, lon) => {
    let earthRadiusInMiles = 3958.74827;
    let startLat = degreesToRadians(currentLocation.latitude);
    let startLon = degreesToRadians(currentLocation.longitude);
    let destLat = degreesToRadians(lat);
    let destLon = degreesToRadians(lon);
    return (
      Math.acos(
        Math.sin(startLat) * Math.sin(destLat) +
          Math.cos(startLat) * Math.cos(destLat) * Math.cos(startLon - destLon)
      ) * earthRadiusInMiles
    );
  };

  totalObjs.sort((a, b) => {
    return (
      distanceInMiles(a.location.latitude, a.location.longitude) -
      distanceInMiles(b.location.latitude, b.location.longitude)
    );
  });

  return totalObjs;
};

export { searchDataRemoveDuplicate };
