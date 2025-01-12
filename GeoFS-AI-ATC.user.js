// ==UserScript==
// @name         GeoFS AI (GPT) ATC
// @namespace    https://avramovic.info/
// @version      2025-01-12
// @description  AI ATC for GeoFS using free PuterJS GPT API
// @author       Nemanja Avramovic
// @match        https://www.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        GM.getResourceText
// @grant        GM.getResourceUrl
// @resource     airports https://github.com/avramovic/geofs-ai-atc/raw/master/airports.json
// @resource     radiostatic https://github.com/avramovic/geofs-ai-atc/raw/master/radio-static.mp3
// ==/UserScript==

(function() {
    'use strict';

    const head = document.querySelector('head');
    if (head) {
        const puterJS = document.createElement('script');
        puterJS.src = 'https://js.puter.com/v2/';
        head.appendChild(puterJS);

        const growlJS = document.createElement('script');
        growlJS.src = 'https://cdn.jsdelivr.net/gh/avramovic/geofs-ai-atc@master/vanilla-notify.min.js';
        head.appendChild(growlJS);

        const growlCSS = document.createElement('link');
        growlCSS.href = 'https://cdn.jsdelivr.net/gh/avramovic/geofs-ai-atc@master/vanilla-notify.css';
        growlCSS.rel = 'stylesheet';
        head.appendChild(growlCSS);
    }

    let airports;
    GM.getResourceText("airports").then((data) => {
        airports = JSON.parse(data);
    });

    let radiostatic;
    GM.getResourceText("radiostatic").then((data) => {
        radiostatic = new Audio('data:audio/mp3;'+data);
        radiostatic.loop = false;
    });


    const observer = new MutationObserver(() => {
        const menuList = document.querySelector('div.geofs-ui-bottom');

        if (menuList && !menuList.querySelector('.geofs-atc-icon')) {
            const micIcon = document.createElement('i');
            micIcon.className = 'material-icons';
            micIcon.innerText = 'headset_mic';

            const atcButton = document.createElement('button');
            atcButton.className = 'mdl-button mdl-js-button mdl-button--icon geofs-f-standard-ui geofs-atc-icon';
            atcButton.title = "Click to talk to ATC. Ctrl+click (Cmd+click on Mac) to input text instead of talking.";

            atcButton.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    let pilotMsg = prompt("Please enter your message to the ATC:");
                    if (pilotMsg != null && pilotMsg != "") {
                        callAtc(pilotMsg);
                    } else {
                        error("You cancelled the dialog");
                    }
                } else {
                    navigator.mediaDevices.getUserMedia({ audio: true });
                    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    let recognition = new SpeechRecognition();
                    recognition.continuous = false;
                    recognition.lang = 'en-US';
                    recognition.interimResults = false;
                    recognition.maxAlternatives = 1;
                    recognition.start();
                    recognition.onresult = (event) => {
                        let pilotMsg = event.results[event.results.length - 1][0].transcript;
                        if (pilotMsg != null && pilotMsg != "") {
                            callAtc(pilotMsg);
                        } else {
                            error("No speech recognized. Speak up?");
                        }
                        recognition.stop();
                    };
                    recognition.onerror = (event) => {
                        error('Speech recognition error:' + event.error);
                    };
                }
            });

            atcButton.appendChild(micIcon);
            menuList.appendChild(atcButton);
        }
    });

    observer.observe(document.body, {childList: true, subtree: true});


    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in kilometers
        const toRad = (deg) => deg * (Math.PI / 180);

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in kilometers
    }

    function findNearestAirport() {
        let aircraftPosition = {
            lat: unsafeWindow.geofs.aircraft.instance.lastLlaLocation[0],
            lon: unsafeWindow.geofs.aircraft.instance.lastLlaLocation[1],
        };

        let nearestAirport = null;
        let minDistance = Infinity;

        for (let i in unsafeWindow.geofs.mainAirportList) {
            let ap = unsafeWindow.geofs.mainAirportList[i];
            let airportPosition = {
                lat: ap[0],
                lon: ap[1]
            };

            let distance = haversine(
                aircraftPosition.lat,
                aircraftPosition.lon,
                airportPosition.lat,
                airportPosition.lon
            );

            if (distance < minDistance) {
                minDistance = distance;
                nearestAirport = {
                    code: i,
                    distanceInKm: distance
                };
            }

        }

        return nearestAirport;
    }

    function error(msg) {
        vNotify.error({text:msg, title:'Error', visibleDuration: 10000});
    }

    function atcSpeak(text) {
        let synth = window.speechSynthesis;
        let voices = synth.getVoices();
        let toSpeak = new SpeechSynthesisUtterance(text);
        toSpeak.voice = voices[0];
        synth.speak(toSpeak);
    }

    function atcGrowl(text, airport_code) {
        vNotify.warning({text: text, title: airport_code+' ATC', visibleDuration: 15000});
    }

    function atcMessage(text, airport_code) {
        atcGrowl(text, airport_code);
        atcSpeak(text);
    }

    function pilotMessage(text) {
        let user = unsafeWindow.geofs.userRecord;
        let airplane = unsafeWindow.geofs.aircraft.instance.aircraftRecord;

        let callsign = "Foo";
        if (user.id != 0) {
            callsign = user.callsign;
        }

        vNotify.success({text: text, title: airplane.name+': '+callsign, visibleDuration: 10000});
    }

     function isOnGround() {
        return unsafeWindow.geofs.animation.values.groundContact == 1 ? true : false;
    }

    function seaAltitude() {
        return unsafeWindow.geofs.animation.values.altitude;
    }

    function groundAltitude() {
        return seaAltitude() - unsafeWindow.geofs.animation.values.groundElevationFeet - 50;
    }

    let oldNearest = null;

    // generate controller for the nearest airport for today
    setInterval(function() {
        let airport = findNearestAirport();
        let airportMeta = airports[airport.code];
        let date = new Date().toISOString().split('T')[0];

        if (oldNearest != airport.code) {
            let apName = airportMeta ? airportMeta.name+' ('+airport.code+')' : airport.code;
            vNotify.info({text:'You are now in range of '+apName+'. You will now talk to them.', title:'New airport: '+airport.code, visibleDuration: 10000});
            oldNearest = airport.code;
        }

        unsafeWindow.geofs.mainAirportList.controllers = unsafeWindow.geofs.mainAirportList.controllers || {};
        unsafeWindow.geofs.mainAirportList.controllers[airport.code] = unsafeWindow.geofs.mainAirportList.controllers[airport.code] || null;


        if (unsafeWindow.geofs.mainAirportList.controllers[airport.code] == null) {
            fetch('https://randomuser.me/api/?gender=male&nat=au,br,ca,ch,de,us,dk,fr,gb,in,mx,nl,no,nz,rs,tr,ua,us&seed='+airport.code+'-'+date)
                .then(response => {
                if (!response.ok) {
                    throw new Error('HTTP error! status: '+response.status);
                }
                return response.text();
            }).then(resourceText => {
                let json = JSON.parse(resourceText)
                unsafeWindow.geofs.mainAirportList.controllers[airport.code] = json.results[0];
            });
        }
    }, 500);

    let context = {};


    function callAtc(pilotMsg) {
        let airport = findNearestAirport();

        if (airport.distanceInKm > 100) {
            radiostatic.play();
            vNotify.error({text:'No airports nearby. You need to be at least 54 nautical miles (100 km) away from the airport to contact it.', title:'Out of range', visibleDuration: 10000});
            return;
        }

        let airportMeta = airports[airport.code];
        let controller = unsafeWindow.geofs.mainAirportList.controllers[airport.code];

        let airportPosition = {
            lat: unsafeWindow.geofs.mainAirportList[airport.code][0],
            lon: unsafeWindow.geofs.mainAirportList[airport.code][1],
        };

        if (typeof context[airport.code] === "undefined") {
            let user = unsafeWindow.geofs.userRecord;
            let pilot = {
                callsign: 'Foo',
                name: 'not known',
                licensed_at: new Date().toISOString().split('T')[0]
            };

            if (user.id != 0) {
                pilot = {
                    callsign: user.callsign,
                    name: user.firstname + ' ' + user.lastname,
                    licensed_at: user.created
                };
            }

            let apName = airportMeta ? airportMeta.name + '(' + airport.code + ')' : airport.code;

            let intro = 'You are '+controller.name.first+' '+controller.name.last+', a '+controller.dob.age+' years old '+controller.gender+' ATC controller on the '+apName+' for today. ' +
                'Your airport location is (lat: '+airportPosition.lat+', lon: '+airportPosition.lon+'). You are talking to pilot whose name is '+pilot.name+' and they\'ve been piloting since '+pilot.licensed_at+'. ' +
                'You will be acting as ground, tower, approach or departure, depending on whether the plane is on the ground, their distance from the airport and previous context. ' +
                'If the aircraft is in the air, keep your communication short and concise, as real ATC. If they\'re on the ground, your sentences should still be short (1-2 sentence per reply), but you can ' +
                'use a more relaxed communication like making jokes, discussing weather, other traffic etc. If asked why so slow on replies, say you\'re busy, like the real ATC. '+
                'You should address them by their callsign ('+pilot.callsign+'), or aircraft type/model AND callsign, rarely by their name.';

            context[airport.code] = [];
            context[airport.code].push({content: intro, role: 'system'});
        }

        // provide current update
        let airplane = unsafeWindow.geofs.aircraft.instance.aircraftRecord;
        let aircraftPosition = {
            lat: unsafeWindow.geofs.aircraft.instance.lastLlaLocation[0],
            lon: unsafeWindow.geofs.aircraft.instance.lastLlaLocation[1],
        };

        let onGround = isOnGround() ? 'on the ground' : 'in the air';
        let distance;

        if (airport.distanceInKm > 1) {
            distance = airport.distanceInKm+' km away from the airport';
        } else if (isOnGround()) {
            distance = 'at the airport';
        } else {
            distance = 'above the airport';
        }

        let movingSpeed;
        if (isOnGround()) {
            if (unsafeWindow.geofs.animation.values.kias > 1) {
                movingSpeed = 'moving at '+unsafeWindow.geofs.animation.values.kias+ 'kts'
            } else {
                movingSpeed = 'stationary';
            }
        } else {
            movingSpeed = 'flying at '+unsafeWindow.geofs.animation.values.kias+'kts, heading '+unsafeWindow.geofs.animation.values.heading360;
        }

        let currentUpdate = 'The pilot is flying '+airplane.name+' and their position is (lat: '+aircraftPosition.lat+',lon: '+aircraftPosition.lon+'), '+onGround+' '+distance+'. Based on the airport and ' +
            'the aircraft coordinates you can figure out the angle (their relative position to the airport). The altitude of the aircraft is '+seaAltitude()+' feet above the sea level ('+groundAltitude()+' feet above ground) ' +
            'The plane is '+movingSpeed;

        //let pilotMsg = prompt("Please enter your message to the ATC:");

        context[airport.code].push({content: currentUpdate, role: 'system'});
        context[airport.code].push({content: pilotMsg, role: 'user'});

        pilotMessage(pilotMsg);

        puter.ai.chat(context[airport.code]).then(function(resp) {
            context[airport.code].push(resp.message);
            atcMessage(resp.message.content, airport.code);
        });
    }

})();