'use-strict'
// const env = require('dotenv').config()
const spawn = require('await-spawn')
const models = require('./models')
const { NlpManager } = require('node-nlp');

async function getEntities(text, lang){
  const manager = new NlpManager({ languages: ['ru'], ner: { ducklingUrl: 'http://0.0.0.0:8000/parse' } })
  const result = await manager.process(text)
  return result
//   console.log(JSON.stringify(result, null, 2))
}

// console.log(env)

function getModelPath(key){
    try {
        if(models.done){
            return models.paths.hasOwnProperty(key) ? models.paths[key] : false
        }else{
            throw new Error('recognize: Before using speech recognition, you must download the model!')
        }
    } catch (e) {
        console.error(e)
        return false
    }
}

// (async()=>{
//     const r = await recognize('', 'ru1')
//     console.log(r)
// })()

async function recognize(speechPath, lang){
    try{
        // console.log(__dirname,{args})
        // const args = [`${voskPath}/test_simple.py`, speechPath, `${voskPath}/models/${lang}`]
        const pathToModel = getModelPath(lang)
        const pathToScript = `${__dirname}/vosk/test_simple.py`
        if(pathToModel && speechPath){
            const args = [pathToScript, speechPath, pathToModel]
            console.log({args: args.join(' ')})
            const res = await spawn('python3', args)
            const entities = await getEntities(res.toString(), lang)
            console.log({entities})
            return res.toString()
        }
        if(!pathToModel){
            throw new Error(`recognize: Can't find path to selected model "${lang}" in "/node_modules/src/vosk/models.yaml" file.\r\nYou can correct this manualy, or reinstall models.`
            )
        }
        if(!speechPath.length){
            throw new Error(`recognize: speechPath is Empty`)
        }
    }catch(e){
        console.error(e)
        return false
    }
}

// example use:
// (async () => {
//     const res = await recognize('vosk/test.wav', 'ru-RU')
//     console.log(res)
// })()

module.exports = recognize