"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const express = require("express");
require('source-map-support').install();
const contributableLocales = require('locales/contributable.json');
const import_locales_1 = require("./lib/model/db/import-locales");
const model_1 = require("./lib/model");
const api_1 = require("./lib/api");
const logger_1 = require("./lib/logger");
const utility_1 = require("./lib/utility");
const import_sentences_1 = require("./lib/model/db/import-sentences");
const config_helper_1 = require("./config-helper");
const auth_router_1 = require("./auth-router");
const fetch_legal_document_1 = require("./fetch-legal-document");
const consul = require('consul')({ promisify: true });
const FULL_CLIENT_PATH = path.join(__dirname, '..', '..', 'web');
const CSP_HEADER = [
    `default-src 'none'`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://optimize.google.com https://fonts.googleapis.com 'unsafe-inline' https://optimize.google.com`,
    `img-src 'self' www.google-analytics.com www.gstatic.com https://optimize.google.com https://www.gstatic.com https://gravatar.com data:`,
    `media-src data: blob: https://*.amazonaws.com https://*.amazon.com`,
    // Note: we allow unsafe-eval locally for certain webpack functionality.
    `script-src 'self' 'unsafe-eval' 'sha256-a3JWJigb4heryKXgeCs/ZhQEaNkHypiyApGw7hQMdTA=' 'sha256-CwRubg9crsF8jHlnzlIggcJhxGbh5OW22+liQqQNE18=' 'sha256-KkfRSrCB8bso9HIC5wm/5cCYUmNSRWNQqyPbvopRCz4=' https://www.google-analytics.com https://pontoon.mozilla.org https://optimize.google.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://pontoon.mozilla.org/graphql https://*.amazonaws.com https://*.amazon.com https://www.gstatic.com https://www.google-analytics.com`,
    `frame-src https://optimize.google.com`,
].join(';');
class Server {
    constructor(options) {
        options = Object.assign({ bundleCrossLocaleMessages: true }, options);
        this.model = new model_1.default();
        this.api = new api_1.default(this.model);
        this.logger = new logger_1.default();
        this.isLeader = null;
        // Make console.log output json.
        if (config_helper_1.getConfig().PROD) {
            this.logger.overrideConsole();
        }
        const app = (this.app = express());
        app.use((request, response, next) => {
            // redirect to omit trailing slashes
            if (request.path.substr(-1) == '/' && request.path.length > 1) {
                const query = request.url.slice(request.path.length);
                response.redirect(301, request.path.slice(0, -1) + query);
            }
            else {
                next();
            }
        });
        app.use(auth_router_1.default);
        app.use('/api/v1', this.api.getRouter());
        const staticOptions = {
            setHeaders: (response) => {
                // Only use CSP locally. In production, Apache handles CSP headers.
                // See path: nubis/puppet/web.pp
                !config_helper_1.getConfig().PROD &&
                    response.set('Content-Security-Policy', CSP_HEADER);
            },
        };
        app.use(express.static(FULL_CLIENT_PATH, staticOptions));
        app.use('/contribute.json', express.static(path.join(__dirname, '..', 'contribute.json')));
        if (options.bundleCrossLocaleMessages) {
            this.setupCrossLocaleRoute();
        }
        this.setupPrivacyAndTermsRoutes();
        app.use(/(.*)/, express.static(FULL_CLIENT_PATH + '/index.html', staticOptions));
        app.use((error, request, response, next) => {
            console.log(error.message, error.stack);
            const isAPIError = error instanceof utility_1.APIError;
            if (!isAPIError) {
                console.error(request.url, error.message, error.stack);
            }
            response
                .status(error instanceof utility_1.ClientError ? 400 : 500)
                .json({ message: isAPIError ? error.message : '' });
        });
    }
    setupCrossLocaleRoute() {
        const localesPath = path.join(FULL_CLIENT_PATH, 'locales');
        const crossLocaleMessages = fs
            .readdirSync(localesPath)
            .reduce((obj, locale) => {
            const filePath = path.join(localesPath, locale, 'cross-locale.ftl');
            if (fs.existsSync(filePath)) {
                obj[locale] = fs.readFileSync(filePath, 'utf-8');
            }
            return obj;
        }, {});
        this.app.get('/cross-locale-messages.json', (request, response) => {
            response.json(crossLocaleMessages);
        });
    }
    setupPrivacyAndTermsRoutes() {
        this.app.get('/privacy/:locale.html', async ({ params: { locale } }, response) => {
            response.send(await fetch_legal_document_1.default('Privacy_Notice', locale));
        });
        this.app.get('/terms/:locale.html', async ({ params: { locale } }, response) => {
            response.send(await fetch_legal_document_1.default('Terms', locale));
        });
    }
    /**
     * Log application level messages in a common format.
     */
    print(...args) {
        args.unshift('APPLICATION --');
        console.log.apply(console, args);
    }
    /**
     * Perform any scheduled maintenance on the data model.
     */
    async performMaintenance(doImport) {
        const start = Date.now();
        this.print('performing Maintenance');
        try {
            await this.model.performMaintenance();
            await import_locales_1.importLocales();
            if (doImport) {
                await import_sentences_1.importSentences(await this.model.db.mysql.createPool());
            }
            await this.model.db.fillCacheColumns();
            this.print('Maintenance complete');
        }
        catch (err) {
            console.error('DB Maintenance error', err);
        }
        finally {
            this.print(`${utility_1.getElapsedSeconds(start)}s to perform maintenance`);
        }
    }
    /**
     * Kill the http server if it's running.
     */
    kill() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        this.model.cleanUp();
    }
    /**
     * Boot up the http server.
     */
    listen() {
        // Begin handling requests before clip list is loaded.
        let port = config_helper_1.getConfig().SERVER_PORT;
        this.server = this.app.listen(port, () => this.print(`listening at http://localhost:${port}`));
    }
    /**
     * Make sure we have a connection to the database.
     */
    async ensureDatabase() {
        try {
            await this.model.ensureDatabaseSetup();
        }
        catch (err) {
            console.error('could not connect to db', err);
        }
    }
    /**
     * Start up everything.
     */
    async run(options) {
        options = Object.assign({ doImport: true }, options);
        this.print('starting');
        await this.ensureDatabase();
        this.listen();
        const { ENVIRONMENT, RELEASE_VERSION } = config_helper_1.getConfig();
        if (!ENVIRONMENT || ENVIRONMENT === 'default') {
            await this.performMaintenance(options.doImport);
            return;
        }
        const lock = consul.lock({ key: 'maintenance-lock' });
        lock.on('acquire', async () => {
            const key = ENVIRONMENT + RELEASE_VERSION;
            try {
                const result = await consul.kv.get(key);
                const hasPerformedMaintenance = result && JSON.parse(result.Value);
                if (hasPerformedMaintenance) {
                    this.print('maintenance already performed');
                }
                else {
                    await this.performMaintenance(options.doImport);
                    await consul.kv.set(key, JSON.stringify(true));
                }
            }
            catch (e) {
                this.print('error during maintenance', e);
            }
            await lock.release();
        });
        lock.acquire();
        await this.warmUpCaches();
    }
    async warmUpCaches() {
        this.print('warming up caches');
        const start = Date.now();
        for (const locale of [null].concat(contributableLocales)) {
            await this.model.getClipsStats(locale);
            await this.model.getVoicesStats(locale);
        }
        this.print(`took ${utility_1.getElapsedSeconds(start)}s to warm up caches`);
    }
    /**
     * Reset the database to initial factory settings.
     */
    async resetDatabase() {
        await this.model.db.drop();
        await this.model.ensureDatabaseSetup();
    }
    async emptyDatabase() {
        await this.model.db.empty();
    }
}
exports.default = Server;
// Handle any top-level exceptions uncaught in the app.
process.on('uncaughtException', function (err) {
    if (err.code === 'EADDRINUSE') {
        // For now, do nothing when we are unable to start the http server.
        console.error('ERROR: server already running');
    }
    else {
        // We will crash the app when getting unknown top-level exceptions.
        console.error('uncaught exception', err);
        process.exit(1);
    }
});
// If this file is run directly, boot up a new server instance.
if (require.main === module) {
    let server = new Server();
    server
        .run({ doImport: config_helper_1.getConfig().IMPORT_SENTENCES })
        .catch(e => console.error(e));
}
//# sourceMappingURL=server.js.map