# todolist
* запуск электрона должен быть из под требуемой питонскрипту conda env
* либо развернуть локально подходящий envirioment
# Electron-vosk-speech
Lightweight Speech Recognition Library for Electron. Based on nodejs-speech-kiosk-usercase and vosk-api.

Requirements: Python 3.8

Install:
`yarn add electron-vosk-speech`

Example usage:

```
const {Recognizer} = require('nodejs-speech-kiosk-usercase')
const apiKeys = {
	googleCloud: ['YOUR_API_KEY']
}

const Rec = new Recognizer({
	apiKeys, 
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
> **For those who read it: the example below can only be used in kiosk usecase. For regular browsers, please use `OAuth2Client` to implement a proper authentication workflow.**

# Saving WAV files to local machine
Add this to Electron's `main` process:
```
const {app, BrowserWindow} = require('electron')
const {speechSaverHandler} = require('nodejs-speech-kiosk-usercase/src/utils-node')

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
Then set the `save` option in your Recognizer:
```
const Rec = new Recognizer({
	apiKeys, 
	onSpeechRecognized: res => console.log('РЕЗУЛЬТАТ! ' + JSON.stringify(res)), 
	onSpeechStart: () => console.log('ГОВОРИТ!'), // fires on speech started
	onSpeechEnd: () => console.log('ЗАМОЛЧАЛ!'), // fires on speech ended
	options: {
		save: true
	}
})

```
Enjoy!

Создание ключа:
1. https://console.cloud.google.com/apis/credentials
2. Клик "Создать учетные данные" > "Ключ API" > "Применить ограничения для ключа"
3. Выбрать "Допустимый тип приложений" > "HTTP-источники перехода (веб-сайты)"
4. Сохранить

> More on API keys: https://cloud.google.com/docs/authentication/api-keys