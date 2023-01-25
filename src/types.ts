export interface UptimeRobotMonitor {
    id: number;
    friendly_name: string;
    url: string;
    type: number;
    sub_type: string;
    keyword_type: null;
    keyword_case_type: number;
    keyword_value: string;
    port: string;
    interval: number;
    timeout: number;
    status: number;
    create_datetime: number;
}

export interface UptimeRobotPagination {
    offset: number;
    limit:  number;
    total:  number;
}

export interface UptimeRobotGetMonitorResponse {
    stat:       'OK' | 'fail';
    pagination: UptimeRobotPagination;
    monitors:   UptimeRobotMonitor[];
}

export interface UptimeRobotEditMonitorResponse {
    stat: 'OK' | 'fail';
    error?: {
        type: 'not_authorized',
        message: string
    }
}

export interface UptimeRobotDeleteMonitorResponse {
    stat: 'OK' | 'fail';
    error?: {
        type: 'not_authorized',
        message: string
    }
}