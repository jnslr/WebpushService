const jsf = require('json-schema-faker')
const mqtt = require('mqtt')
const webpush = require('web-push');
const Ajv = require("ajv")
const addFormats = require("ajv-formats")
const betterAjvErrors = require('better-ajv-errors').default;
const ajv = new Ajv()
addFormats(ajv)
const fs = require('fs')
const YAML = require('yaml')

const winston = require('winston');
var logger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [new (winston.transports.Console)()]
});

const schemas = require('./schemas.js');
const path = require('path');
const configFileLocation = '/config/config.yml'

const notificationValidator = ajv.compile(schemas.notificationSchema)
const configValidator = ajv.compile(schemas.configSchema)

let fConfig //Config file handle
let config  //Config Object

let mqttClient

try {
    fConfig = fs.readFileSync(configFileLocation, 'utf8')
}
catch (e) {
    jsf.option('useDefaultValue',true)
    const sampleConfig = jsf.generate(schemas.configSchema)

    fs.mkdirSync(path.dirname(configFileLocation), { recursive: true });
    fs.writeFileSync(configFileLocation,YAML.stringify(sampleConfig))
    logger.error(`No config file found at ${path.resolve(configFileLocation)}. A sample config was created, please update this config.`)
    fConfig = fs.readFileSync(configFileLocation, 'utf8')
}
fs.watchFile(configFileLocation, ()=>{
    logger.info("Config file changed, reloading settings")
    reloadConfig()
});
reloadConfig()
logger.info(`Init done, watching ${path.resolve(configFileLocation)} for changes`)

function reloadConfig(){
    logger.info(`Loading config file from: ${path.resolve(configFileLocation)}`)
    fConfig = fs.readFileSync(configFileLocation, 'utf8')
    config =  YAML.parse(fConfig)
    const confValid  = configValidator(config)
    if (!confValid) {
        logger.error(`Config File is invalid`)
        logger.error(betterAjvErrors(schemas.configSchema, config, configValidator.errors,{indent:2}))
        return
    }
    initServer()
}


function initMQTT(){
    try {
        logger.info(`Connecting mqtt to host: ${config.mqtt.host}:${config.mqtt.port}`)
        if (mqttClient)
            mqttClient.end()
        
        mqttClient = mqtt.connect({host:config.mqtt.host,port:config.mqtt.port})
        mqttClient.on('connect', function () {
            logger.info("MQTT Client connected")
            mqttClient.subscribe('pushservice', function (err) {
            if (!err) {
                logger.info("subscribed")
            }
          })
        })
        mqttClient.on('error', function (err) {
            logger.info(`MQTT Client error: ${err}`)
        })
        mqttClient.on('message', (_,msg)=>sendPush(msg))
    }
    catch (err){
        logger.error(`Error connecting to MQTT server: ${err.message}`)
    }

}

function initServer(){
    try {
        logger.info(`Setting vapid credentials`)
        webpush.setVapidDetails(config.VapidKey.mail, config.VapidKey.publicVapidKey,config.VapidKey.privateVapidKey);
    }
    catch (err){
        logger.error(`Error setting VAPID credentials: ${err.message}`)
    }
    initMQTT();
}

async function sendPush(message){
    const msg = message.toString()
    logger.info(`Publishing message: ${msg}`)
    try {
        const obj = await JSON.parse(msg)
        const valid = notificationValidator(obj)
        if (!valid)
            throw new Error(`Json validation errors: ${betterAjvErrors(schemas.notificationSchema, obj, notificationValidator.errors,{indent:2})}`)
        for (const sub of config.subscriptions) {
            try{
                await webpush.sendNotification(sub, message)
                logger.info(`Message delivered to ${sub.keys.auth}`)
            }
            catch (err) {
                logger.error(`Pub message to ${sub.keys.auth} failed with ${err.message}`)
            }
        }
        
    }
    catch (err) {
        logger.error(err)
        const errObj = {}
        errObj.errMessage = err.message
        errObj.pubMessage = msg
        mqttClient.publish("pushservice/error", JSON.stringify(errObj))
    }
}