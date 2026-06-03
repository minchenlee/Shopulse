// lib/filterQuery.js
// L0.1 — framework-agnostic filter-URL engine, lifted from Gui.jsx:558-767.
//
// FAITHFUL PORT. Per plan §Layer-0 + Verified-fact 4, this preserves two
// pre-existing quirks byte-for-byte:
//   1. The JS comma-operator "returns" (`return queryDict, isProcessed`) and the
//      matching comma-operator assignments (`queryDict, isProcessed = fn(...)`).
//      These evaluate to ONLY the right operand (`isProcessed`); `queryDict`
//      flows by REFERENCE because the helpers mutate it in place.
//   2. The space-encoding asymmetry: removeExistingKeyValue() encodes a space as
//      '%20' before comparing, but mergeExistingKey() pushes the raw value. So a
//      value containing a space toggles ON (raw) but the OFF case can never match
//      ('%20' vs ' ') -> OFF is a silent no-op. CARRIED, pinned by a golden test.
//
// The ONLY change vs the React original: handleOptionChange's `navigate` call is
// removed (the caller navigates) and `window.location.search` is replaced by the
// `currentSearch` argument. Renamed to buildFilterUrl per plan. window.location
// .pathname is still read (the page only runs at /gui); getPathname() makes it
// safe under the node test environment.

// faithful port: pre-existing quirk — typo'd name kept verbatim
const normalzedTitle = (title) => {
  title = title.split(' ').join('');
  title = title.charAt(0).toLowerCase() + title.slice(1);
  return title;
}

// Pathname source. React read window.location.pathname directly; the Gui page is
// the only route that runs this. Safe-guard for the node test env (no window).
const getPathname = () =>
  (typeof window !== 'undefined' && window.location && window.location.pathname) || '';

// Exported entry point. Lifted from handleOptionChange (Gui.jsx:567-641):
// `navigate` dropped (caller navigates), `window.location.search` -> currentSearch.
const buildFilterUrl = (parameterKey, optionValue, currentSearch) => {
  // Construct the new URL based on the option selected
  const oldUrl = currentSearch;
  let queryString = oldUrl.split('?')[1];
  let newUrl;
  let queryList = [];
  let queryDict = {};
  let isProcessed = false;
  if (queryString) {
    queryList = queryString.split('&');
    queryDict = listDictConverter(queryList);
  }

  // If the query string already exists, append the new parameter
  if (queryList.length > 0) {
    // If the oprion key value pair already exists, remove it
    // faithful port: pre-existing quirk — comma-operator assignment (queryDict
    // mutated by reference; only isProcessed flows through)
    queryDict, isProcessed = removeExistingKeyValue(parameterKey, optionValue, queryDict);

    // If the option key is already existing, merge the new value
    if (!isProcessed) {
      queryDict, isProcessed = mergeExistingKey(parameterKey, optionValue, queryDict);
    }

    // Range Value need to be processed differently
    if (parameterKey === 'price' || parameterKey === 'screenSize') {
      queryDict, isProcessed = processRangeValue(parameterKey, optionValue, queryDict);
    }

    // Convert the dict back to list
    queryList = listDictConverter(queryDict);

    // If the option is fresh new, add it to the query list
    if (!isProcessed) {
      queryList.push(`${parameterKey}=${optionValue}`);
    }

    // Join the query list to form the new query string
    queryString = queryList.join('&');

    // If there is no query string, remove the '?' from the URL
    if (queryString === '') {
      newUrl = getPathname();
    }

    // If there is a query string, use it to form the new URL
    if (queryString !== '') {
      newUrl = `${getPathname()}?${queryString}`;
    }

    // filter out the pagination from the new URL
    newUrl = newUrl.replace(/pagination=\d+&?/g, '');

  }

  // If there is no query string and the option is not a duplicate, add the option to the URL
  if (queryList.length === 0 && !isProcessed) {
    if (parameterKey === 'price' || parameterKey === 'screenSize') {
      queryDict, isProcessed = processRangeValue(parameterKey, optionValue, queryDict);
      queryList = listDictConverter(queryDict);
      queryString = queryList.join('&');
      // remove pagination from the query string
      queryString = queryString.replace(/pagination=\d+&?/g, '');
      newUrl = `${getPathname()}?${queryString}`;
    } else {
      queryString = `${parameterKey}=${optionValue}`;
      // remove pagination from the query string
      queryString = queryString.replace(/pagination=\d+&?/g, '');
      newUrl = `${getPathname()}?${queryString}`;
    }
  }

  // console.log(newUrl)
  // Caller navigates with this string (React called navigate(newUrl, {replace:true}))
  return newUrl;
};


const listDictConverter = (listOrDict) => {
  // If is a list, convert to dict
  // key is string, value is array
  if (Array.isArray(listOrDict)) {
    let dict = {};
    for (let item of listOrDict) {
      let isMultiple = false;
      let key = item.split('=')[0];
      let value = item.split('=')[1];

      // Handle range values
      if (key === 'price' || key === 'screenSize') {
        value = value.split('-');
        isMultiple = true;
      }

      // Handle multiple values
      if (value.includes(',')) {
        value = value.split(',');
        isMultiple = true;
      }

      const existingValue = dict[key];
      if (existingValue && isMultiple) {
        const newValue = [...existingValue, ...value];
        dict[key] = newValue;
      }

      if (existingValue && !isMultiple) {
        const newValue = [...existingValue, value];
        dict[key] = newValue;
      }

      if (!existingValue && isMultiple) {
        dict[key] = [...value];
      }

      if (!existingValue && !isMultiple) {
        dict[key] = [value];
      }
    }
    return dict;
  }

  // If is a dict, convert to list
  if (typeof listOrDict === 'object') {
    let newList = [];
    const parameterList = Object.keys(listOrDict);
    for (let parameter of parameterList) {
      let valueList = listOrDict[parameter];

      // Handle range values for price and screenSize
      if (parameter === 'minPrice' || parameter === 'maxPrice' || parameter === 'minScreenSize' || parameter === 'maxScreenSize') {
        newList.push(`${parameter}=${valueList}`);
      } else {
        valueList = valueList.join(',');
        newList.push(`${parameter}=${valueList}`);
      }
    }
    return newList;
  }
}


// Remove the existing key value pair
const removeExistingKeyValue = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;

  if (queryDict[parameterKey]) {
    // If the option key value pair already exists, remove it
    let existingValueList = queryDict[parameterKey];
    // faithful port: pre-existing quirk — encodes space as %20 here, but
    // mergeExistingKey() pushes the raw value -> a space value toggles ON but
    // never OFF (the asymmetry). Carried, pinned by a golden test.
    optionValue = optionValue.replace(' ', '%20');
    if (existingValueList.includes(optionValue)) {
      existingValueList.splice(existingValueList.indexOf(optionValue), 1);
      queryDict[parameterKey] = existingValueList;
      isProcessed = true;
    }

    // If the option key value pair is empty, remove it
    if (existingValueList.length === 0) {
      delete queryDict[parameterKey];
    }
  }
  // faithful port: pre-existing quirk — comma-operator return (only isProcessed
  // is returned; queryDict was mutated by reference above)
  return queryDict, isProcessed;
}

// Merge the new value to the existing key
const mergeExistingKey = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;
  let existingValueList = queryDict[parameterKey];
  const isRange = parameterKey === 'price' || parameterKey === 'screenSize';
  if (existingValueList && isRange) {
    optionValue = optionValue.split('-');
    existingValueList.push(...optionValue);
    queryDict[parameterKey] = existingValueList;
    isProcessed = true;
  }

  if (existingValueList && !isRange) {
    // faithful port: pre-existing quirk — raw value pushed (NOT %20-encoded),
    // unlike removeExistingKeyValue() -> the toggle-OFF asymmetry
    existingValueList.push(optionValue);
    queryDict[parameterKey] = existingValueList;
    isProcessed = true;
  }
  // faithful port: pre-existing quirk — comma-operator return
  return queryDict, isProcessed;
}

// Process range values
const processRangeValue = (parameterKey, optionValue, queryDict) => {
  let isProcessed = false;

  // get the min and max value
  let minKey = `min${parameterKey.charAt(0).toUpperCase()}${parameterKey.slice(1)}`;
  let maxKey = `max${parameterKey.charAt(0).toUpperCase()}${parameterKey.slice(1)}`;

  let newMinValue = optionValue.split('-')[0];
  let newMaxValue = optionValue.split('-')[1];

  queryDict[minKey] = newMinValue;
  queryDict[maxKey] = newMaxValue;

  delete queryDict[parameterKey];
  isProcessed = true;
  // faithful port: pre-existing quirk — comma-operator return
  return queryDict, isProcessed;
}


export {
  buildFilterUrl,
  normalzedTitle,
  listDictConverter,
  removeExistingKeyValue,
  mergeExistingKey,
  processRangeValue,
};
