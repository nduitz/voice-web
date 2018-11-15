"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise-native");
const locales = require('locales/all.json');
const contributableLocales = require('locales/contributable.json');
const db_1 = require("./model/db");
const split_1 = require("./model/split");
const config_helper_1 = require("../config-helper");
const lazy_cache_1 = require("./lazy-cache");
const AVG_CLIP_SECONDS = 4.7; // I queried 40 recordings from prod and avg'd them
function fetchLocalizedPercentagesByLocale() {
    return request({
        uri: 'https://pontoon.mozilla.org/graphql',
        method: 'POST',
        json: true,
        body: {
            query: `{
            project(slug: "common-voice") {
              localizations {
                totalStrings
                approvedStrings
                locale {
                  code
                }
              }
            }
          }`,
            variables: null,
        },
    }).then(({ data }) => data.project.localizations.reduce((obj, l) => {
        obj[l.locale.code] = Math.round((100 * l.approvedStrings) / l.totalStrings);
        return obj;
    }, {}));
}
function clipCountToHours(count) {
    return Math.round((count * AVG_CLIP_SECONDS) / 3600);
}
const MINUTE = 1000 * 60;
const DAY = MINUTE * 60 * 24;
/**
 * The Model loads all clip and user data into memory for quick access.
 */
class Model {
    constructor() {
        this.db = new db_1.default();
        this.clipDistribution = split_1.IDEAL_SPLIT;
        this.cacheClipDistribution = async () => {
            this.clipDistribution = split_1.rowsToDistribution(await this.db.getClipBucketCounts());
            console.log('clip distribution', JSON.stringify(this.clipDistribution));
        };
        this.getValidatedHours = lazy_cache_1.default(async () => {
            const english = (await this.db.getValidClipCount(['en']))[0];
            return clipCountToHours(english ? english.count : 0);
        }, DAY);
        this.getLanguageStats = lazy_cache_1.default(async () => {
            const inProgressLocales = locales.filter(locale => !contributableLocales.includes(locale));
            function indexCountByLocale(rows) {
                return rows.reduce((obj, { count, locale }) => {
                    obj[locale] = count;
                    return obj;
                }, {});
            }
            const [localizedPercentages, sentenceCounts, validClipsCounts, speakerCounts,] = await Promise.all([
                fetchLocalizedPercentagesByLocale(),
                this.db
                    .getSentenceCountByLocale(inProgressLocales)
                    .then(indexCountByLocale),
                this.db.getValidClipCount(contributableLocales).then(indexCountByLocale),
                this.db.getSpeakerCount(contributableLocales).then(indexCountByLocale),
            ]);
            return {
                inProgress: inProgressLocales.map(locale => ({
                    locale,
                    localizedPercentage: localizedPercentages[locale] || 0,
                    sentencesCount: sentenceCounts[locale] || 0,
                })),
                launched: contributableLocales.map(locale => ({
                    locale,
                    seconds: Math.floor((validClipsCounts[locale] || 0) * AVG_CLIP_SECONDS),
                    speakers: speakerCounts[locale] || 0,
                })),
            };
        }, 20 * MINUTE);
        this.getClipsStats = lazy_cache_1.default(async (locale) => (await this.db.getClipsStats(locale)).map(stat => (Object.assign({}, stat, { total: Math.round(stat.total * AVG_CLIP_SECONDS), valid: Math.round(stat.valid * AVG_CLIP_SECONDS) }))), DAY);
        this.getVoicesStats = lazy_cache_1.default((locale) => this.db.getVoicesStats(locale), 20 * MINUTE);
        this.cacheClipDistribution().catch((e) => {
            console.error(e);
        });
    }
    /**
     * Fetch a random clip but make sure it's not the user's.
     */
    async findEligibleClips(client_id, locale, count) {
        return this.db.findClipsWithFewVotes(client_id, locale, Math.min(count, 50));
    }
    async findEligibleSentences(client_id, locale, count) {
        const bucket = await this.db.getOrSetUserBucket(client_id, locale, split_1.randomBucketFromDistribution(split_1.IDEAL_SPLIT));
        return this.db.findSentencesWithFewClips(client_id, bucket, locale, Math.min(count, 50));
    }
    /**
     * Update current user
     */
    async syncUser(client_id, data, sourceURL = '') {
        const user = await this.db.updateUser(client_id, data);
        const { BASKET_API_KEY, PROD } = config_helper_1.getConfig();
        if (BASKET_API_KEY && user && user.send_emails && !user.basket_token) {
            const response = await request({
                uri: 'https://basket.mozilla.org/news/subscribe/',
                method: 'POST',
                form: {
                    'api-key': BASKET_API_KEY,
                    newsletters: 'common-voice',
                    format: 'H',
                    lang: 'en',
                    email: user.email,
                    source_url: sourceURL,
                    sync: 'Y',
                },
            });
            this.db.updateUser(client_id, Object.assign({}, data, { basket_token: JSON.parse(response).token }));
        }
    }
    /**
     * Ensure the database is properly set up.
     */
    async ensureDatabaseSetup() {
        await this.db.ensureSetup();
    }
    /**
     * Upgrade to the latest version of the db.
     */
    async performMaintenance() {
        await this.db.ensureLatest();
    }
    /**
     * Perform any cleanup work to the model before shutting down.
     */
    cleanUp() {
        this.db.endConnection();
    }
    async saveClip(clipData) {
        const bucket = await this.db.saveClip(clipData);
        if (bucket) {
            this.clipDistribution[bucket]++;
        }
    }
}
exports.default = Model;
//# sourceMappingURL=model.js.map