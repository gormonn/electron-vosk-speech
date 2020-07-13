# Electron-vosk-speech
Lightweight Speech Recognition Library for Electron. Based on nodejs-speech-kiosk-usercase and vosk-api.

Requirements: Python 3.8

1. Install:
`yarn add electron-vosk-speech`
To install python, read [this](https://realpython.com/installing-python/) guide.
`pip3 install vosk`

2. Then, you need to download vosk's speech model:
For example:
```
#download and save model to models/ru-small
cd node_modules/electron-vosk-speech/src/vosk
sh _model_loader.sh https://alphacephei.com/vosk/models/vosk-model-small-ru-0.4.zip ru
```

Or:
```
# download and save big russian model to models/ru-Ru
# then "ru" are used as languageCode in the options of Recognizer class
# so, you can download any models, and use it
cd node_modules/electron-vosk-speech/src/vosk
sh _model_loader.sh https://alphacephei.com/vosk/models/vosk-model-ru-0.10.zip ru
```
You can find list of vosk pretrained models [here](https://alphacephei.com/vosk/models.html).


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
const { app, BrowserWindow, ipcMain } = require('electron')
const {speechSaverHandler} = require('electron-vosk-speech/src/utils')

const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
})

// than add this handler to your 'will-download' event
const projectPath = app.getAppPath()
win.webContents.session.on('will-download', function(...rest){
	speechSaverHandler(projectPath, ...rest)
})
```
Enjoy!
