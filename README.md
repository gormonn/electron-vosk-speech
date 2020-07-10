# Electron-vosk-speech
Lightweight Speech Recognition Library for Electron. Based on nodejs-speech-kiosk-usercase and vosk-api.

Requirements: Python 3.8

Install:
`yarn add electron-vosk-speech`
`pip3 install vosk`

Example usage:

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
		vad = {} // pass options to vad function
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