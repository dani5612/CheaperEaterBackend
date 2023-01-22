# REST API

Things to know:
- For responses `...` indicates there are more results not shown to simplify output.
- For responses the data is filler data, 0 means the data is of type `Number` while `""` means
  the data is of type `String`.
- Since Uber aquired Postmates, the API data seems to be the same for both. A search using both
  websites while monitoring the network tab in Chrome dev tools show the API enpoints have the
  same names. Additionally, the data returned is the same both on the website and with the 
  returned JSON data.

## Search

### Usage example
```javascript
const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  body: '{"query":"pizza"}'
};

fetch('localhost:8000/api/search', options)
  .then(response => response.json())
  .then(response => console.log(response))
  .catch(err => console.error(err));
```

### Response example
```json
[
  {
    "service": "postmates",
    "stores": [
      {
        "id": "",
        "title": "",
        "location": { "latitude": 0, "longitude": 0 },
        "deliveryFee": 0,
        "estimatedDeliveryTime": 0,
        "rating": 0,
        "image": ""
      }
    ]
  },
  {"service": "grubhub", stores: [{},{},{}, ...]},
  ...
]
```

### Notes
- Errors that take place will replace the `stores` array with an `errors` object, an example can
  be found below:
  ```json
  [
   {
     "service": "postmates",
     "stores": [{},{},{}, ...]
   }
   {
     "service": "grubhub",
     "error": {status: 403, statusText: "Unauthorized"}
   },
   ...
  ]   
  ```
-  Refer to example response for types
- `estimatedDeliveryTime` is in minutes
- `deliveryFee` is in USD
- `rating` is out of 5 and depending on the platform it can be a float value
- Some stores don't have ratings, if that's the case, a `null` rating will be returned
- Postmates (WEB API)
  - There does not seem to be a way to pass in location data directly, from manual testing
    of the web API, there seems to be three steps, but I have not been able to get the
    location to be set.
    - (1) search for location (by address/zip)
    - (2) get location data with previous data from step 1 
    - (3) call setLocation api
  
    I'm assuming that the setLocation API might be using a session token to
    keep track of the location in their backend. I also tried making the calls
    using the same cookie without success. Need to investigate further.
