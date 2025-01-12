# GeoFS-AI-ATC
AI ATC for GeoFS using free Puter JS GPT API.

This userscript provides support for AI (GPT) ATC "simulation" using the free PuterJS GPT api. All you need to do is log
in with your Puter.com account (registration is free and done in one click) and this script will add a new icon to the bottom
of your screen. You can click it to speak to atc using web speech recognition API (all major browsers support this) or
Ctrl+click (Cmd+click on Mac) to input your text. The GPT will generate ATC response and display it on screen AND read 
it aloud using web text to speech API (also supported by all major browsers).

## Key features
- speak to the atc and hear it respond (speech recognition and text-to-speech), or type the message if you can't speak
(if someone is sleeping 🤣 for example)
- you have to be within 100 km of the airport to talk to it
- click on the radio icon to tune in to different airport; you can tune to a particular airport ATC by using their ICAO code
- on screen notification will be shown when you are in range of another airport
- every day there is a new controller working at each airport
- you can talk to ATC about flight or about whatever (especially when on ground)

## Known issues
- The ATC will **never** contact you first. If ATC tells you to wait for instructions, you will have to ask them for
updates every couple (10-20) seconds.
- ATC may hallucinate, so don't rely too much on their navigation. While they know their position and your aircraft position
(and other params like speed, heading, altitude), they don't know how many runways the airport has, nor the orientation
of the runways, so they will always guide you directly to the runway. You can tell them you want to land on e.g. rwy 12 
and only then they might give you proper vectors.

## A note
I am not a pilot, just someone who likes airplanes and aviation. I might have screwed something up, but please open an
issue here on Github and i'll try to fix it.

# Requirements
- [Tampermonkey](https://www.tampermonkey.net/)

## Installation
[Install GeoFS-AI-ATC](https://github.com/avramovic/geofs-ai-atc/raw/master/GeoFS-AI-ATC.user.js)