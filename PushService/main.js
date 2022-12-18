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
    console.error(`No config file found at ${path.resolve(configFileLocation)}. A sample config was created, please update this config.`)
    fConfig = fs.readFileSync(configFileLocation, 'utf8')
}
fs.watchFile(configFileLocation, ()=>{
    console.log("Config file changed, reloading settings")
    reloadConfig()
});
reloadConfig()
console.log(`Init done, watching ${path.resolve(configFileLocation)} for changes`)

function reloadConfig(){
    console.log(`Loading config file from: ${path.resolve(configFileLocation)}`)
    fConfig = fs.readFileSync(configFileLocation, 'utf8')
    config =  YAML.parse(fConfig)
    const confValid  = configValidator(config)
    if (!confValid) {
        console.error(`Config File is invalid`)
        console.error(betterAjvErrors(schemas.configSchema, config, configValidator.errors,{indent:2}))
        return
    }
    initServer()
}


function initMQTT(){
    try {
        console.log(`Connecting mqtt to host: ${config.mqtt.host}:${config.mqtt.port}`)
        if (mqttClient)
            mqttClient.end()
        
        mqttClient = mqtt.connect({host:config.mqtt.host,port:config.mqtt.port})
        mqttClient.on('connect', function () {
            console.log("MQTT Client connected")
            mqttClient.subscribe('pushservice', function (err) {
            if (!err) {
                console.log("subscribed")
            }
          })
        })
        mqttClient.on('error', function (err) {
            console.log(`MQTT Client error: ${err}`)
        })
        mqttClient.on('message', (_,msg)=>sendPush(msg))
    }
    catch (err){
        console.error(`Error connecting to MQTT server: ${err.message}`)
    }

}

function initServer(){
    // const publicVapidKey = 'BA0A-i8Dhl0zTEeK06N4xhJcsZ-bdWSfSk1MQDHPHL-pHCYMYQXTath96NvpB-YRjG01dPT8DZrBrX-v9FR_75I';
    // const privateVapidKey = '0ZguIXY0WFrOWiFCPt1BI_otDQBIXVR8VCS-RoDnIr8';
    // const  mail = 'mailto:jonas.lauer93@gmail.com'
    // webpush.setVapidDetails(config.vapmail, publicVapidKey,privateVapidKey);
    try {
        console.log(`Setting vapid credentials`)
        webpush.setVapidDetails(config.VapidKey.mail, config.VapidKey.publicVapidKey,config.VapidKey.privateVapidKey);
    }
    catch (err){
        console.error(`Error setting VAPID credentials: ${err.message}`)
    }
    initMQTT();
}

async function sendPush(message){
    const msg = message.toString()
    console.log(`Publishing message: ${msg}`)
    try {
        const obj = await JSON.parse(msg)
        const valid = notificationValidator(obj)
        if (!valid)
            throw new Error(`Json validation errors: ${JSON.stringify(validate.errors)}`)
        for (const sub of config.subscriptions) {
            try{
                await webpush.sendNotification(sub, message)
                console.log(`Message delivered to ${sub.keys.auth}`)
            }
            catch (err) {
                console.error(`Pub message to ${sub.keys.auth} failed with ${err.message}`)
            }
        }
        
    }
    catch (err) {
        console.error(err)
        const errObj = {}
        errObj.errMessage = err.message
        errObj.pubMessage = msg
        mqttClient.publish("pushservice/error", JSON.stringify(errObj))
    }
}




// sub = {"endpoint":"https://fcm.googleapis.com/fcm/send/fOSvd0_utOU:APA91bENrKnoonZM6QCBaLdftJijt7VYG7lm4zDg3dOlM9rAHThXqpVF4cjZ3UjYsCe2nRDS4ieiwCpeWG0tEatGv1icOVe6R6oyHNjpv-w0fZHfQ6Wh37PYeo5lDzJ_sJysDAn0vXuM","expirationTime":null,"keys":{"p256dh":"BDghQm66tobgmOWhFlbV8chFeshHny-I_8DIuvGSuHdkDKZCgW4rjcq5Qnoe0p9Y8f13f1lxsN3qEO0evpcMwzQ","auth":"1Co0mUm3kgvqQRoujRY1Yw"}}

// const mqttClient  = mqtt.connect({host:'192.168.0.80',port:1883})

// mqttClient.on('connect', function () {
//     mqttClient.subscribe('pushservice', function (err) {
//     if (!err) {
//         console.log("subscribed")
//     }
//   })
// })

// mqttClient.on('message', async function (topic, message) {

//   const msg = message.toString()
//   console.log(`Publishing message: ${msg}`)
//   try {
//     const obj = await JSON.parse(msg)
//     const valid = validate(obj)
//     if (!valid)
//         throw new Error(`Json validation errors: ${JSON.stringify(validate.errors)}`)
//     await webpush.sendNotification(sub, message)
//     console.log("Message delivered")
//   }
//   catch (err) {
//     console.error(err)
//     const errObj = {}
//     errObj.errMessage = err.message
//     errObj.pubMessage = msg
//     mqttClient.publish("pushservice/error", JSON.stringify(errObj))
//   }
// })