'use strict'
const hark = require('hark')
const Recorder = require('./recorder')
// const recognize = require('./recognize')
const { SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY, SPEECH_ACTION_DATA } = require('./utils')

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
	this._recorder = { worker: false }
	
	const recognitionResult = res => {
		console.log('1111 recognitionResult', res)
		return gsFormat
			? {results:[{alternatives:[{transcript: res.text /*,confidence: 0.7914224863052368*/}],languageCode}]}
			: res
	}

	const mediaListener = (stream) => {
		this.Stream = stream
		const speechEvents = hark(stream, harkOptions)

		this._audioContext = new AudioContext({sampleRate: 8000});
		const source = this._audioContext.createMediaStreamSource(stream)		
		this._recorder = new Recorder(source, {numChannels: 1})

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
			if(this._isSpeech2Text) this._recorder.record()
		}
		const stopRecording = () => {
			restartIdleTimeout()
			this._recorder.stop()
			if(this._isSpeech2Text) this._recorder.exportWAV(speechPrepare) // might be a bug
			this._recorder.clear() // иначе, запись склеивается
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
			const blob = new Blob([buffer], {type: 'audio/x-wav'})
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
			const isRecording = this._recorder.recording
			const wasSpeech = this._touched
			const isIdleWithotSpeech = !wasSpeech && isRecording
			if(isIdleWithotSpeech){
				return this.stopAll()
			}
			if(isRecording){
				return restartIdleTimeout()
			}else{
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
			}
		})
		navigator.getUserMedia({audio: true}, stream => mediaListener(stream), err => {
			console.error("No live audio input in this browser: " + err)
		})
	}
	this.stopListening = async () => {
		try{
			clearTimeout(this._idleTimeout)
			if(this._audioContext.state !== 'closed'){
				// по сути недостижимо, ибо чистим idleTimeout
				this.Stream.getTracks()[0].stop()
				await this._audioContext.close()
			}
		}catch(e){
			console.error(e)
		}
	}
	
	this.stopRecognize = () => {
		this._isSpeech2Text = false
	}
	this.startRecognize = () => {
		this._isSpeech2Text = true
	}

	this.stopAll = async () => {
		try{
			// не понятно, останавливается ли запись
			this.stopRecognize()
			await this.stopListening()
			if(this._recorder.worker) this._recorder.worker.terminate()
			// ipcRenderer.removeAllListeners(SPEECH_ACTION_READY)
			ipcRenderer.removeAllListeners(SPEECH_ACTION_DATA)
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