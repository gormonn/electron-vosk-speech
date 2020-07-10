'use-strict'
const SPEECH_NAME_DEFAULT = 'speech'
const SPEECH_ACTION_READY = 'SPEECH_ACTION_READY'
const SPEECH_DATA_SEPARATOR = '___SDS___'
const SPEECH_GOOGLE_RESULT_SEPARATOR = '___GRS___'
const SPEECH_SAVE_PATH = '/tmp/speech/'
const SPEECH_SAVE_PATH_L = SPEECH_SAVE_PATH + '70-80/' // low confidence
const SPEECH_SAVE_PATH_H = SPEECH_SAVE_PATH + '90/' // high confidence

const zip = (array, separator) =>
    array.join(separator)

const unzip = (string, separator) =>
    string.split(separator)

/**
 * Сохранение результатов распознавания в строку имени файла
 * где:
 * SPEECH_NAME_DEFAULT - Ключевое имя, для корректного перехвата
 * события will-download при скачивании файла
 * results: [
 *  transcript, - результат распознавания речи от гугла
 *  confidence  - степень доверия нейросети к корректности распознавания
 * ]
 * Считаю, что для корректного обучения Kaldi(VOSK-API) требуются значения не ниже 0,9
 * * @param {*} results 
 */
const zipResults = (res) => {
    const { results } = res
    const alternatives = (results && results[0] ? results[0].alternatives : null)
    const transcript = (alternatives && alternatives[0] ? alternatives[0].transcript : '')
    const confidence = (alternatives && alternatives[0] ? alternatives[0].confidence : '')
    const zippedResults = zip([transcript,confidence], SPEECH_GOOGLE_RESULT_SEPARATOR)
    return zip([SPEECH_NAME_DEFAULT, zippedResults], SPEECH_DATA_SEPARATOR)
}
const unzipResults = string => {
    const [fileName, results] = unzip(string, SPEECH_DATA_SEPARATOR)
    const [transcript, confidence] = unzip(results, SPEECH_GOOGLE_RESULT_SEPARATOR)
    return {fileName, transcript, confidence}
}
const isCorrectFilename = fileName =>
    fileName === SPEECH_NAME_DEFAULT

const setMetadataCallback = (err) => {
    if (err) console.error("Error writing metadata", err)
    else console.log("Data written")

    ffmetadata.read(savePath, function(err, data) {
        if (err) console.error("ffmetadata Error reading metadata", err)
        else console.log('ffmetadata', data)
        // console.log('need to put:', transcription)
    })
}
/**
 * title - is a transcript
 * comment - is a confidence
 * @param {*} savePath 
 * @param {*} param1 
 */
const setMetadata = (savePath, [title, comment], cb = setMetadataCallback) => {
    const ffmetadata = require("ffmetadata")
    ffmetadata.write(savePath, {title, comment}, cb)
}

function speechSaverHandler(projectPath, e, item, webContents){
    const fileName = item.getFilename()
    if(isCorrectFilename(fileName)){
        const savePath = `${projectPath + SPEECH_SAVE_PATH + fileName}.wav`
        if(savePath){
            item.setSavePath(savePath)
            item.once('done', (event, state) => {
                if (state === 'completed') {
                    webContents.send(SPEECH_ACTION_READY, savePath)              
                } else {
                    console.log(`Download failed: ${state}`)
                }
            })
        }
    }else{
        console.log("A speech file won't save")
        e.preventDefault()
    }
}

module.exports = { zipResults, unzipResults, isCorrectFilename, speechSaverHandler, SPEECH_NAME_DEFAULT, SPEECH_ACTION_READY }