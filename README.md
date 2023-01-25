# UptimeRobot to Kuma migration

We migrated from UptimeRobot to UptimeKuma, but there was no fast way to achieve this, so
we wrote our own small migration helper.

## Getting started

Copy the `.env.sample` as `.env` and enter your UptimeRobot API key.

For testing, you can simply start UptimeKuma via Docker:

```shell
docker run --rm -p 3001:3001 --name uptime-kuma louislam/uptime-kuma:1
```

Ensure you finished the initial setup (simply open [localhost:3001](localhost:3001) in your browser) and
updated the credentials in the `.env` file.

To start the migration run:

```bash
# copy all your UptimeRobot monitors to your Kuma installation
yarn copy-monitors

# disable all UptimeRobot monitors
yarn disable-uptime-robot

# delete all your monitors from UptimeRobot
# DANGER!!! This is can not be undone
yarn delete-uptime-robot
```

## Production Migration

**Important Node:** This migration helper was writen specially for our use-case. So not all UptimeRobot
scenarios and features are implemented. So no garantie this will work 100% for you.

**Pro Tipp:** Before migrating, create a default notification that will get used as default.

## Architecture

### Fetching from UptimeRobot

This part was quite easy, because UptimeRobot got a good REST-API to fetch all monitors from

### Creating the monitors in Kuma

This was the hard part. Currently, Kuma does not provide any form of API. In the first version of this migration
helper, I tried to hook into the websocket connection of the UI and create monitors that way. This was really instabile
and resulted in many non-deterministic errors.

For this reason I switched to Playwright. This allows us the remote-control a browser, which will create
the monitors via the Kuma-UI.
