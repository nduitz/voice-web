"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_helper_1 = require("../config-helper");
const prom_client_1 = require("prom-client");
// Probe every 5th second.
prom_client_1.collectDefaultMetrics({ timeout: 5000 });
class Prometheus {
    constructor() {
        this.registry = prom_client_1.register;
        // Do not run prometheus endpoints on non prod site.
        if (config_helper_1.getConfig().PROD) {
            this.requests = new prom_client_1.Counter({
                name: 'voice_requests',
                help: 'Total Requests Served',
            });
            this.clip_cnt = new prom_client_1.Counter({
                name: 'voice_clips_requests',
                help: 'Total Clip Requests Served',
            });
            this.api_cnt = new prom_client_1.Counter({
                name: 'voice_api_requests',
                help: 'Total API Requests Served',
            });
            this.prometheus_cnt = new prom_client_1.Counter({
                name: 'voice_prometheus_requests',
                help: 'Total Prometheus Requests Served',
            });
        }
    }
    countRequest(request) {
        this.requests && this.requests.inc();
    }
    countClipRequest(request) {
        this.clip_cnt && this.clip_cnt.inc();
    }
    countApiRequest(request) {
        this.api_cnt && this.api_cnt.inc();
    }
    countPrometheusRequest(request) {
        this.prometheus_cnt && this.prometheus_cnt.inc();
    }
}
exports.default = Prometheus;
//# sourceMappingURL=prometheus.js.map