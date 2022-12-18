exports.notificationSchema = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    data: {
      type: "object",
      properties: {
        body: {type: "string"},
        timestamp: {type: "integer"},
        icon: {type: "string",format:"uri"},
        image: {type: "string",format:"uri"},
        badge: {type: "string",format:"uri"},
        actions: {type: "array"}
      }
    }
  },
  required: ["title"],
  additionalProperties: false
}

exports.configSchema = {
  type: "object",
  additionalProperties: false,
  required: ["VapidKey", "mqtt","subscriptions"],
  properties: {
      VapidKey: {
          type: "object",
          additionalProperties: false,
          required: ["publicVapidKey", "privateVapidKey","mail"],
          properties: {
              "publicVapidKey": {type: "string"},
              "privateVapidKey": {type: "string"},
              "mail": {type: "string"},
          }
      },
      mqtt: {
          type: "object",
          additionalProperties: false,
          properties: {
              "host": {type: "string", format:"ipv4"},
              "port": {type: "integer"},
          }
      },
      subscriptions: {
          type: "array",
          minItems: 0,
          items: {anyOf:[{
            type: "object",
            additionalProperties: false,
            properties: {
                endpoint: {type: "string", format:"uri"},
                expirationTime: {type: "integer", format:"date"},
                keys: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                      p256dh: {type: "string"},
                      auth: {type: "string"}
                  },
                  required: ["p256dh", "auth"]
                },
            },
            required: ["keys", "endpoint"]
        }]},
        
      }
  }
}