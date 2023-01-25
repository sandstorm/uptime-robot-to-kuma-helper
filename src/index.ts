import dotenv from "dotenv"

import {
    UptimeRobotMonitor,
    UptimeRobotGetMonitorResponse,
    UptimeRobotEditMonitorResponse,
    UptimeRobotDeleteMonitorResponse
} from "./types";
import {chromium, Page} from 'playwright';
import axios from "axios";

dotenv.config()

const UPTIME_ROBOT_API_KEY = process.env.UPTIME_ROBOT_API_KEY

const KUMA_URL = process.env.KUMA_URL
const KUMA_USERNAME = process.env.KUMA_USERNAME
const KUMA_PASSWORD = process.env.KUMA_PASSWORD


if (
    !UPTIME_ROBOT_API_KEY ||
    !KUMA_URL ||
    !KUMA_USERNAME ||
    !KUMA_PASSWORD
) {
    console.warn('Required env variables are missing!')
    console.warn('Copy ".env.sample" as ".env"')
    process.exit(1)
}

const UPTIME_ROBOT_GET_MONITOR_API_PATH = "https://api.uptimerobot.com/v2/getMonitors?api_key="

const loadMonitorsFromUptimeRobot = async () => {
    const monitors: UptimeRobotMonitor[] = []

    let monitorCount = 0
    let currentOffset = 0
    let totalMonitors = 9999999

    while (monitorCount < totalMonitors) {
        const response = await axios.post(
            UPTIME_ROBOT_GET_MONITOR_API_PATH + UPTIME_ROBOT_API_KEY,
            `offset=${currentOffset}`
        )

        const jsonResponse = response.data as UptimeRobotGetMonitorResponse

        totalMonitors = jsonResponse.pagination.total
        currentOffset += 50
        monitorCount += jsonResponse.monitors.length
        monitors.push(...jsonResponse.monitors)

    }

    return monitors
}

const UPTIME_ROBOT_DISABLE_MONITOR_API_PATH = "https://api.uptimerobot.com/v2/editMonitor"

const disableUptimeRobotMonitor = async (monitor: UptimeRobotMonitor) => {
    const response = await axios.post(
        UPTIME_ROBOT_DISABLE_MONITOR_API_PATH,
        new URLSearchParams({
            'api_key': UPTIME_ROBOT_API_KEY,
            'format': 'json',
            'id': `${monitor.id}`,
            'status': '0'
        }),
        {
            headers: {
                'Cache-Control': 'no-cache'
            }
        }
    );

    const responseJson = response.data as UptimeRobotEditMonitorResponse
    if (responseJson?.stat === "fail") {
        console.error(`Failed to edit monitor '${monitor.friendly_name}' due to '${responseJson.error?.type}'`)
        process.exit(1)
    } else {
        console.log(`Disabled monitor "${monitor.friendly_name}"`)
    }
}

const UPTIME_ROBOT_DELETE_MONITOR_API_PATH = "https://api.uptimerobot.com/v2/deleteMonitor"
const deleteUptimeRobotMonitor = async (monitor: UptimeRobotMonitor) => {
    const response = await axios.post(
        UPTIME_ROBOT_DELETE_MONITOR_API_PATH,
        new URLSearchParams({
            'api_key': UPTIME_ROBOT_API_KEY,
            'format': 'json',
            'id': `${monitor.id}`,
        }),
        {
            headers: {
                'Cache-Control': 'no-cache'
            }
        }
    )
    const responseJson = response.data as UptimeRobotDeleteMonitorResponse
    if (responseJson?.stat === "fail") {
        console.error(`Failed to delete monitor '${monitor.friendly_name}' due to '${responseJson.error?.type}'`)
        process.exit(1)
    } else {
        console.log(`Deleted monitor "${monitor.friendly_name}"`)
    }
}

const startPlaywright = async () => chromium.launch({headless: false})

const ensureLoggedIn = async (page: Page) => {
    const loginButton = await page.getByText("Login")

    if (loginButton == null) {
        console.log('already logged in ...')
        return
    }

    await page.getByPlaceholder('Username').type(KUMA_USERNAME)
    await page.getByPlaceholder('Password').type(KUMA_PASSWORD)

    await loginButton.click()
    await page.waitForLoadState("domcontentloaded")
}

const createMonitor = async (page: Page, monitor: UptimeRobotMonitor) => {
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    await page.getByText('Add New Monitor').first().click()

    const createButton = await page.$('a:text(" Add New Monitor")')
    await createButton?.click()


    await page.waitForTimeout(100)
    await page.getByLabel('Friendly Name').first().fill(monitor.friendly_name)

    switch (monitor.type) {
        case 1:
            await createMonitorHTTP(page, monitor)
            break
        case 2:
            await createMonitorKeyword(page, monitor)
            break
        case 4:
            await createMonitorPort(page, monitor)
            break
        default:
            console.log(`Monitor type ${monitor.type} of ${monitor.friendly_name} is not supported`)
            break
    }

    await page.getByLabel('Heartbeat Interval (Check every').fill(String(monitor.interval))

    const saveButton = await page.$('button#monitor-submit-btn')
    await saveButton?.click()

    await page.waitForLoadState("domcontentloaded")
    await page.waitForLoadState("networkidle")

    await page.waitForTimeout(400)

    console.log('Created Monitor ', monitor.friendly_name)
}

const createMonitorHTTP = async (page: Page, monitor: UptimeRobotMonitor) => {
    await page.getByLabel("Monitor Type").selectOption("HTTP(s)")
    await page.getByLabel('URL').fill(monitor.url)
}

const createMonitorKeyword = async (page: Page, monitor: UptimeRobotMonitor) => {
    await page.getByLabel("Monitor Type").selectOption("HTTP(s) - Keyword")
    await page.getByLabel('URL').fill(monitor.url)
    await page.getByLabel('Keyword').fill(monitor.keyword_value)
}

const createMonitorPort = async (page: Page, monitor: UptimeRobotMonitor) => {
    await page.getByLabel("Monitor Type").selectOption("TCP Port")
    await page.getByLabel('Hostname').fill(monitor.url)
    await page.getByLabel('Port').fill(String(monitor.port))
}

const copyMonitors = async () => {
    const monitors = await loadMonitorsFromUptimeRobot()
    console.log(`Found ${monitors.length} monitors`)

    const browser = await startPlaywright()
    const page = await browser.newPage()
    await page.goto(KUMA_URL)

    await ensureLoggedIn(page)

    for (let monitor of monitors) {
        await createMonitor(page, monitor)
    }

    await browser.close()
}

const disableUptimeRobot = async () => {
    const monitors = await loadMonitorsFromUptimeRobot()
    console.log(`Found ${monitors.length} monitors`)

    for (let monitor of monitors) {
        await disableUptimeRobotMonitor(monitor)
    }
}

const deleteUptimeRobotMonitors = async () => {
    const monitors = await loadMonitorsFromUptimeRobot()
    console.log(`Found ${monitors.length} monitors`)

    for (let monitor of monitors) {
        await deleteUptimeRobotMonitor(monitor)
    }
}

const run = async () => {
    const task = process.argv[2]

    switch (task) {
        case 'copy-monitors':
            await copyMonitors()
            break
        case 'disable-uptime-robot':
            await disableUptimeRobot()
            break
        case 'delete-uptime-robot':
            await deleteUptimeRobotMonitors()
            break
        default:
            console.error(`Task '${task} is not supported ...'`)
    }
}

run()
