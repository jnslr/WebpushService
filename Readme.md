## Installing the Container

`git clone https://github.com/jnslr/WebpushService.git`
`cd WebpushService/PushService/ && docker build . -t jnslr/push-service`

`docker volume create pushservice_data`
`docker run -d --name PushService -v pushservice_data:/config --restart=unless-stopped jnslr/push-service`
`docker cp ~/config.yml PushService:/config`

## Updating the container

`git pull`
`docker build . -t jnslr/push-service`
`docker container stop PushService && docker container rm PushService && docker run -d --name PushService -v pushservice_data:/config --restart=unless-stopped jnslr/push-service`

## Docker Compose file


```yml
---
version: '3'
services:
  pushservice:
    image: jnslr/push-service:latest
    container_name: pushservice
    restart: unless-stopped
    volumes:
      - data:/config
volumes:
    data:
```


## Publishing a push notification

- Publish to topic `pushservice`

```json
{
    "title": "Hello",
    "options": {
      "timestamp": 0,
      "icon": "data:image/png;base64,iVBORw0",
      "actions": [],
      "body": "Hello World"
    }
}
```