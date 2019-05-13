// !!!!!!!!! PUT OUTSIDE OF s.doPlugins !!!!!!!!! //

/**
 * Writes all set props, eVars and events into a documentation prop
 * @param s The tracker object
 */
var writeAADocuString = function (s) {
    /**
     * Configuration
     */
    // Prop to be used for documentation reporting
    var finalProp = 'prop11';
    // prop to be used in case there is an overflow in `finalProp`
    var backupProp = 'prop12';
    // defined maximum length for `finalProp` (you may want to change this if using an eVar
    var maxLength = 100;


    /**
     * Only trigger on Exit-, Download- and Custom Links as well as Pageloads
     * @returns {boolean} 'pageload', 'link', or null
     */
    function determineExitDownloadCustomLinkOrPageload(s) {
        if ('d' === s.linkType || 'e' === s.linkType || 'o' === s.linkType) {
            // Exit-, Download- and Custom Links
            return 'link';
        } else if ((typeof event != 'undefined' && event.type === 'load') || typeof event === 'undefined') {
            // event.type = 'load' for pageload
            // In case of a DCR which triggers a pageload ( s.t() ), the event is undefined
            return 'pageload';
        } else if (event instanceof MouseEvent) {
            // This was triggered by a click within doPlugins, which we don't care about
            return null;
        } else {
            console.warn("determineExitDownloadCustomLinkOrPageload: This case should never happen...");
        }
        return null;
    }


    var eventType = determineExitDownloadCustomLinkOrPageload(s);
    if (eventType === null) {
        return;
    }

    var writtenValuesString;
    if (eventType === 'pageload') {
        writtenValuesString = buildVarString(buildSearchStringForPageload());
    } else if (eventType === 'link') {
        writtenValuesString = buildVarString(buildSearchStringForLinks());
    } else {
        console.warn('setWrittenValuesIntoProp: You\'ve broken the code. Please fix me now!');
    }

    if ('undefined' !== writtenValuesString && writtenValuesString) {
        var final = writtenValuesString.final;
        var backup = writtenValuesString.backup;

        s[finalProp] = final;
        if (typeof s.linkTrackVars === 'undefined') {
            s.linkTrackVars = finalProp;
        } else {
            s.linkTrackVars += "," + finalProp;
        }
        if (backup !== '') {
            s[backupProp] = backup;
            s.linkTrackVars += "," + backupProp;
        }
    }

    /**
     * Build the encoded string to be tracked
     * @param toSearch Search string depending on link type or pageload
     * @returns {{backup: string, final: string}}
     */
    function buildVarString(toSearch) {
        var splitted = toSearch.split(",");
        var varsMap = buildCachedVarsMap();
        var finalVars = "";
        var backupVars = "";

        if (eventType === 'pageload') {
            finalVars += varsMap['pageView'];
        } else if (eventType === 'link') {
            if ('d' === s.linkType) {
                finalVars += varsMap['downloadLink'];
            }
            if ('e' === s.linkType) {
                finalVars += varsMap['exitLink'];
            }
            if ('o' === s.linkType) {
                finalVars += varsMap['customLink'];
            }
        }

        for (var key in splitted) {
            if (splitted.hasOwnProperty(key)) {
                var elem = varsMap[splitted[key]];
                if (elem) {
                    if ((finalVars + "," + elem).length < maxLength) {
                        finalVars += "," + elem;
                    } else {
                        backupVars += "," + elem;
                    }
                }
            }
        }

        return {
            final: finalVars,
            backup: backupVars
        }
    }

    /**
     * Build up the search string based on all available props, evVars and events on the tracker object.
     * @returns {string}
     */
    function buildSearchStringForPageload() {
        var toSearch = '';
        var varsMap = buildCachedVarsMap();
        var key;
        for (key in varsMap) {
            if (varsMap.hasOwnProperty(key)) {
                var x = s[key];
                if (typeof x !== 'undefined' && x !== null && x !== '') {
                    toSearch += ',' + key;
                }
            }
        }

        if (typeof s.events !== 'undefined') {
            toSearch += ',' + cleanEventString(s.events);
        }

        return toSearch.replace(/^,/, '');
    }

    /**
     * Build up the search string based on s.linkTrackVars and s.linkTrackEvents.
     * @returns {string}
     */
    function buildSearchStringForLinks() {
        var toSearch = s.linkTrackVars;
        if (s.linkTrackVars.indexOf('events') > -1) {
            // linkTrackVars containts the string "events", add events to search string
            tosearch += ',' + cleanEventString(s.linkTrackEvents); 
        }
        return toSearch;
    }

    /**
     * Clean a list of events to only contain event names (no counters or event serialization)
     * @returns {string}
     */
    function cleanEventString(eventString) {
        var eventStringCleaned = "";
        var events = eventString.split(',');

        for (key in events) {
            if (events.hasOwnProperty(key)) {
                // add event-name without additional information (event serialization or counter event)
                if (events[key].indexOf("=")>0) {
                    // counter event: skip counter
                    eventStringCleaned += ',' + events[key].substr(0,events[key].indexOf("="));
                } else if(events[key].indexOf(":")>0) {
                    // event serialization: skip serialization string
                    eventStringCleaned += ',' + events[key].substr(0,events[key].indexOf(":"));
                } else {
                    eventStringCleaned += ',' + events[key];
                }
            }
        }
        return eventStringCleaned.replace(/^,/, '');
    }

    /**
     * Build up the variable mapping table and cache it
     * @returns {*}
     */
    function buildCachedVarsMap() {
        // Return cache if available
        if ('undefined' !== _satellite.your_company && _satellite.your_company && 'undefined' !== _satellite.your_company.varsMap && _satellite.your_company.varsMap) {
            return _satellite.your_company.varsMap;
        }

        var digitsStr = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-";
        var eVarOffset = 0;
        var eVarNum = 250;
        var propOffset = 300;
        var propNum = 75;
        var eventOffset = 500;
        var eventNum = 1000;

        var varsMap = {};
        for (var i = 0; i < 25; i++) {
            for (var j = 0; j < 64; j++) {
                var base64Code = "";
                if (0 === i) {
                    base64Code = digitsStr.charAt(j);
                } else {
                    base64Code = digitsStr.charAt(i) + digitsStr.charAt(j);
                }
                if ((i * 64 + j > eVarOffset) && (i * 64 + j <= (eVarOffset + eVarNum))) {  // eVars from 0 to 250/299
                    varsMap["eVar" + (i * 64 + j)] = base64Code;
                } else if ((i * 64 + j > propOffset) && (i * 64 + j <= (propOffset + propNum))) {  // props from 300 to 375/499
                    varsMap["prop" + (i * 64 + j - propOffset)] = base64Code;
                } else if ((i * 64 + j > eventOffset) && (i * 64 + j <= (eventOffset + eventNum))) {
                    varsMap["event" + (i * 64 + j - eventOffset)] = base64Code;
                }
            }
        }

        varsMap['pageName'] = "6G";
        varsMap['customLink'] = "6H";
        varsMap['downloadLink'] = "6I";
        varsMap['exitLink'] = "6J";

        varsMap['channel'] = "6K";
        varsMap["campaign"] = "6L";
        varsMap['products'] = "6M";
        varsMap['purchaseID'] = "6N";
        varsMap['server'] = "6O";
        varsMap['state'] = "6P";
        varsMap['transactionID'] = "6Q";
        varsMap['zip'] = "6R";

        varsMap['list1'] = "6a";
        varsMap['list2'] = "6b";
        varsMap['list3'] = "6c";

        varsMap['hier1'] = "6d";
        varsMap['hier2'] = "6e";
        varsMap['hier3'] = "6f";
        varsMap['hier4'] = "6g";
        varsMap['hier5'] = "6h";

        varsMap['pageView'] = "72";
        varsMap["prodView"] = "73";
        varsMap['scOpen'] = "74";
        varsMap['scAdd'] = "75";
        varsMap['scView'] = "76";
        varsMap['scRemove'] = "77";
        varsMap['scCheckout'] = "78";
        varsMap['purchase'] = "79";

        if (typeof _satellite.your_company === 'undefined') {
            _satellite.your_company = {};
        }
        _satellite.your_company.varsMap = varsMap;
        return varsMap;
    }
};
