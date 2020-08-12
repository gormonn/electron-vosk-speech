'use strict'
const hark = require('hark')
const Recorder = require('opus-recorder')
const fs = require('fs-sync')

const { SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY, SPEECH_ACTION_DATA } = require('./utils')
console.log('Recorder.isRecordingSupported()', Recorder.isRecordingSupported())
function Recognizer({
	ipcRenderer,
	onSpeechStart = () => console.log('voice_start'),
	onSpeechEnd = () => console.log('voice_stop'),
	onSpeechRecognized = res => console.log('onSpeechRecognized', res),
	onStartRecognize = () => console.log('onRecognizeStart'),
	onAllStart = () => console.log('onAllStart'),
	onAllStop = () => console.log('onAllStop'),
	options = {}
}){
	const {
		debug = false,
		isSpeech2Text = true,
		autoInit = true,
		forced = true,
		idleDelay = 5000,
		harkOptions = {},
		save = false,
		languageCode = 'ru',
		gsFormat = false // if true, returns result in GoogleSpeech format
		// for backward compatibility with solutions based on GoogleSpeech
	} = options
	// it's might be an issue with memory (global)
	this._isSpeech2Text = isSpeech2Text
	this._idleTimeout = null
	this._touched = false
	this._isRecording = false
	this._recorder = { worker: false }
	this._debug = debug
	
	const recognitionResult = res => {
		return gsFormat
			? {results:[{alternatives:[{transcript: res.text /*,confidence: 0.7914224863052368*/}],languageCode}]}
			: res
	}

	const Debug = text => {
		let style = ['padding: 1px;',
		'background: linear-gradient( gold, orangered);',
		'text-shadow: 0 2px orangered;',
		'font: 1.3rem/3 Georgia;',
		'color: white;'].join('');
		if(this._debug) console.log( '%c%s', style, text)
	}
	const mediaListener = (stream) => {
		this.Stream = stream
		const speechEvents = hark(stream, harkOptions)

		this._audioContext = new AudioContext({sampleRate: 8000});
		// console.log('mediaListener sampleRate this._audioContext', this._audioContext)
		const source = this._audioContext.createMediaStreamSource(stream)	
		// console.log('mediaListener sampleRate source', source)

		const processorPath = `${global.__dirname}/node_modules/electron-vosk-speech/node_modules/opus-recorder/dist/encoderWorker.min.js`;
		const processorSource = fs.read(processorPath); // just a promisified version of fs.readFile
		const processorBlob = new Blob([processorSource.toString()], { type: 'text/javascript' });
		const processorURL = URL.createObjectURL(processorBlob);
		this._recorder = new Recorder({
			encoderSampleRate: 8000,
			numberOfChannels: 1,
			sourceNode: source,
			encoderPath: processorURL
		})

		this._recorder.onstart = () => {
			Debug('Recorder: я начинаю запись!');
			this._isRecording = true
		}

		this._recorder.onstop = () => {
			Debug('Recorder: я остановлен!');
			this._isRecording = false
		};

		this._recorder.onpause = () => {
			Debug('Recorder: я на паузе!');
			this._isRecording = false
		};

		this._recorder.onresume = () => {
			Debug('Recorder: продолжаю запись!');
			this._isRecording = true
		};

		this._recorder.onstreamerror = (e) => {
			Debug('Recorder: Error encountered: ' + e.message );
		};

		this._recorder.ondataavailable = (typedArray) => {
			speechSave('recognitionResult', typedArray)
		};

		const onVoiceStart = () => {
			this._touched = true
			startRecording()
			onSpeechStart()
		}
		const onVoiceEnd = () => {
			stopRecording()
			onSpeechEnd()
		}

		// не понятно надо отвязывать или нет (автоматическая сборка мусора, не?)
		speechEvents.on('speaking', onVoiceStart)
		speechEvents.on('stopped_speaking', onVoiceEnd)

		const startRecording = () => {
			if(this._isSpeech2Text) this._recorder.start()
		}
		const stopRecording = () => {
			restartIdleTimeout()
			// if(this._isSpeech2Text) this._recorder.exportWAV(speechPrepare) // might be a bug
			if(this._isSpeech2Text){
				this._recorder.stop()
			}
		}

		const speechPrepare = blob => {
			onStartRecognize()
			let reader = new FileReader()
			reader.onload = async function() {
				try{
					if (reader.readyState == 2) {
						const buffer = reader.result
						speechSave('recognitionResult', buffer)
					}
				}catch(e){
					console.error(e)
				}
			}
			reader.readAsArrayBuffer(blob)
		}

		const speechSave = (results, buffer) => {
			let link = document.createElement('a')
			// const blob = new Blob([buffer], {type: 'audio/x-wav'})
			const blob = new Blob([buffer], {type: 'audio/ogg'})
			link.href = URL.createObjectURL(blob)
			link.setAttribute("download", SPEECH_NAME_DEFAULT)
			link.click()
			URL.revokeObjectURL(link.href)
		}

		const forcedStartRecord = () => {
			if(forced){
				startRecording()
			}
		}

		const restartIdleTimeout = () => {
			clearTimeout(this._idleTimeout)
			if(idleDelay){
				this._idleTimeout = setTimeout(beforeStopAll, idleDelay)
			}
		}
		const beforeStopAll = () => {
			const isRecording = this._isRecording //
			const wasSpeech = this._touched
			const isIdleWithoutSpeech = !wasSpeech && isRecording
			if(isIdleWithoutSpeech){
				Debug('Recognizer: Пользователь ничего не сказал, поэтому я остановился!')
				return this.stopAll()
			}
			if(isRecording){
				return restartIdleTimeout()
			}else{
				Debug('Recognizer: Прошел таймаут ожидания! поэтому я остановился!')
				return this.stopAll()
			}
		}

		onAllStart()
		forcedStartRecord()
		restartIdleTimeout()
	}

	this.startListening = () => {
		// ipcRenderer.on(SPEECH_ACTION_READY, async (e, savePath) => {
		// 	try{
		// 		const data = await recognize(savePath, languageCode)
		// 		const res = recognitionResult(data)
		// 		onSpeechRecognized(res)
		// 	}catch(e){
		// 		console.error(e)
		// 	}
		// })
		ipcRenderer.on(SPEECH_ACTION_DATA, (e, json) => {
			const data = JSON.parse(json)
			if(data.hasOwnProperty('result') && data.hasOwnProperty('text')){
				const res = recognitionResult(data)
				onSpeechRecognized(res)
			}else if(this._debug){
				throw new Error(`Не удалось распознать речь.
				Если проблема повторяется, это может быть связано с повышеной частотой дискретизации записанной речи.
				(sampleRate должен быть равен 8000)`)
			}
		})
		navigator.getUserMedia({audio: {sampleRate: 8000}}, stream => mediaListener(stream), err => {
			console.error("No live audio input in this browser: " + err)
		})
	}
	
	this.stopRecognize = () => {
		this._isSpeech2Text = false
		this._recorder.close()
		ipcRenderer.removeAllListeners(SPEECH_ACTION_DATA)
	}
	this.startRecognize = () => {
		this._isSpeech2Text = true
	}

	this.stopAll = async () => {
		try{
			this.stopRecognize()
			onAllStop()
		}catch(e){
			console.error(e)
		}
	}
	this.startAll = async () => {
		try{
			// во избежание дублирования
			await this.stopAll()
			this.startRecognize()
			this.startListening()
		}catch(e){
			console.error(e)
		}
	}
	
	if(autoInit){
		this.startListening()
	}
}

module.exports = {
	Recognizer,
	Recorder,
	// recognize
}