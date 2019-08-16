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
     * Build up the search string based on s.linkTrackVars, s.linkTrackEvents and s.events
     * @returns {string}
     */
    function buildSearchStringForLinks() {
        var toSearch = s.linkTrackVars;
        if (s.linkTrackVars.indexOf('events') > -1) {

            // Only do something if s.events is set
            if (typeof s.events !== 'undefined' && s.events !== '') {

                // Use only s.events in case s.linkTrackEvents is not set
                if (typeof s.linkTrackEvents === 'undefined' || s.linkTrackEvents === '') {
                    toSearch += ',' + cleanEventString(s.events);

                } else {
                    // If s.linkTrackEvents and s.events are both set
                    // calculate the intersection and use it.
                    var l1 = cleanEventString(s.events).split(',');

                    // We don't clean linkTrackEvents explicitly as any kind of event1=123 will cause event1 to be NOT tracked
                    // thus it will not be in the call and shall not be in the quality prop
                    var l2 = s.linkTrackEvents.split(',');
                    var combined = l1.filter(function (x) {
                        return -1 !== l2.indexOf(x)
                    }).join(',');

                    toSearch += ',' + combined;
                }
            }
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

        var digitsStr = "0123456789abcdefghijklmnopqrstuvwxyz+-_";
        var eVarOffset = 0;
        var eVarNum = 250;
        var propOffset = 300;
        var propNum = 75;
        var eventOffset = 500;
        var eventNum = 1000;

        var varsMap = {};
        for (var i = 0; i < 39; i++) {
            for (var j = 0; j < 39; j++) {
                var base39Code = "";
                if (0 === i) {
                    base39Code = digitsStr.charAt(j);
                } else {
                    base39Code = digitsStr.charAt(i) + digitsStr.charAt(j);
                }
                if ((i * 39 + j > eVarOffset) && (i * 39 + j <= (eVarOffset + eVarNum))) {  // eVars from 0 to 250/299
                    varsMap["eVar" + (i * 39 + j)] = base39Code;
                } else if ((i * 39 + j > propOffset) && (i * 39 + j <= (propOffset + propNum))) {  // props from 300 to 375/499
                    varsMap["prop" + (i * 39 + j - propOffset)] = base39Code;
                } else if ((i * 39 + j > eventOffset) && (i * 39 + j <= (eventOffset + eventNum))) {
                    varsMap["event" + (i * 39 + j - eventOffset)] = base39Code;
                }
            }
        }

        varsMap['pageName'] = "aa";
        varsMap['customLink'] = "ab";
        varsMap['downloadLink'] = "ac";
        varsMap['exitLink'] = "ad";
        
        varsMap['channel'] = "ae";
        varsMap["campaign"] = "af";
        varsMap['products'] = "ag";
        varsMap['purchaseID'] = "ah";
        varsMap['server'] = "ai";
        varsMap['state'] = "aj";
        varsMap['transactionID'] = "ak";
        varsMap['zip'] = "al";

        varsMap['list1'] = "au";
        varsMap['list2'] = "av";
        varsMap['list3'] = "aw";

        varsMap['hier1'] = "ax";
        varsMap['hier2'] = "ay";
        varsMap['hier3'] = "az";
        varsMap['hier4'] = "a+";
        varsMap['hier5'] = "a-";

        varsMap['pageView'] = "bl";
        varsMap["prodView"] = "bm";
        varsMap['scOpen'] = "bn";
        varsMap['scAdd'] = "bo";
        varsMap['scView'] = "bp";
        varsMap['scRemove'] = "bq";
        varsMap['scCheckout'] = "br";
        varsMap['purchase'] = "bs";

        if (typeof _satellite.your_company === 'undefined') {
            _satellite.your_company = {};
        }
        _satellite.your_company.varsMap = varsMap;
        return varsMap;
    }
};
