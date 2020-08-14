# Electron-vosk-speech
Lightweight Speech Recognition Library for Electron. Based on [nodejs-speech-kiosk-usercase](https://www.npmjs.com/package/nodejs-speech-kiosk-usercase) and [vosk-api](https://github.com/alphacep/vosk-api).

1. Install:

`yarn add electron-vosk-speech`

Then you need to install [docker](https://docs.docker.com/get-docker/).

Run vosk-api local server:
`sudo docker run -d -p 2700:2700 alphacep/kaldi-ru:latest`
`docker run -d -p 2700:2700 alphacep/kaldi-ru:latest`

To restart:
`docker restart alphacep/kaldi-ru:latest`
To clear docker containers:
```
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
```


<!-- To install python, read [this](https://realpython.com/installing-python/) guide.
```
sudo apt-get update
sudo apt-get install python3.8
pip3 install vosk
``` -->
<!-- 
Before build duckling you need to install [haskell](https://www.fpcomplete.com/haskell/get-started/)
Then:
```
sudo apt-get update
sudo apt-get install libpcre3 libpcre3-dev
cd duckling
stack build
```
Run duckling server:
```
stack exec duckling-example-exe
```
The first time you run it, it will download all required packages.

This runs a basic HTTP server. Example request:
```
$ curl -XPOST http://0.0.0.0:8000/parse --data 'locale=en_GB&text=tomorrow at eight'
``` -->

<!-- 2. Then, you need to download vosk's speech model:
For example:
```
#download and save 2 models (ru, en)
cd node_modules/electron-vosk-speech/scripts
sh dl_models.sh
```
You can find list of vosk pretrained models [here](https://alphacephei.com/vosk/models.html).

Then, you can find all available lang-models in file src/models.js -->


# Example usage:
Add this to Electron's `render` process:

```
const {Recognizer} = require('electron-vosk-speech')
const {ipcRenderer} = require('electron')

const Rec = new Recognizer({
	ipcRenderer, 
	onSpeechRecognized: res => console.log('РЕЗУЛЬТАТ! ' + JSON.stringify(res)), 
	onSpeechStart: () => console.log('ГОВОРИТ!'), // fires on speech started
	onSpeechEnd: () => console.log('ЗАМОЛЧАЛ!'), // fires on speech ended
	options: {
		isSpeech2Text = true,
		autoInit = true,
		forced = true, // forced start recording
		idleDelay = 5000,
		languageCode = 'ru',
		harkOptions = {},
		gsFormat = false // if true, returns result in GoogleSpeech format
		// for backward compatibility with solutions based on GoogleSpeech
	}
})

// Rec.startAll() - start listening, recording and recognize
// Rec.stopAll() - stop listening, recording and recognize

// Rec.startListening() - start listening
// Rec.stopListening() - stop listening

// Rec.stopRecognize() - stop recording and recognize
// Rec.startRecognize() - start recording and recognize
```

Add this to Electron's `main` process:
```
const { app, BrowserWindow } = require('electron')
const {speechSaverHandler, connect2Vosk } = require('electron-vosk-speech/src/utils')

const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
})

// default values
const props = {
	sudo: false, // with sudo you can get an error now, so you need to configure docker to use without sudo, or other...
	autostart: true // to autostart docker server
}

// then add this handler to your 'will-download' event
connect2Vosk(win.webContents, (webContents, ws) => {
    webContents.session.on('will-download', function voskSpeechSaver(...rest){
      speechSaverHandler(app.getAppPath(), ws, ...rest) // for new version
    })
}, props)
```
Enjoy!
