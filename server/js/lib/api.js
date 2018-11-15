"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const crypto_js_1 = require("crypto-js");
const sendRequest = require("request-promise-native");
const config_helper_1 = require("../config-helper");
const user_client_1 = require("./model/user-client");
const clip_1 = require("./clip");
const prometheus_1 = require("./prometheus");
const aws_1 = require("./aws");
const utility_1 = require("./utility");
const PromiseRouter = require('express-promise-router');
class API {
    constructor(model) {
        this.saveUserClient = async ({ client_id, body, params }, response) => {
            const demographic = body;
            if (!client_id || !demographic) {
                throw new utility_1.ClientParameterError();
            }
            // Where is the clip demographic going to be located?
            const demographicFile = client_id + '/demographic.json';
            await this.model.db.updateUser(client_id, demographic);
            await aws_1.AWS.getS3()
                .putObject({
                Bucket: config_helper_1.getConfig().BUCKET_NAME,
                Key: demographicFile,
                Body: JSON.stringify(demographic),
            })
                .promise();
            console.log('clip demographic written to s3', demographicFile);
            response.json(client_id);
        };
        this.saveUser = async (request, response) => {
            await this.model.syncUser(request.params.id, request.body, request.header('Referer'));
            response.json('user synced');
        };
        this.getRandomSentences = async (request, response) => {
            const { client_id, headers, params } = request;
            const sentences = await this.model.findEligibleSentences(client_id, params.locale, parseInt(request.query.count, 10) || 1);
            response.json(sentences);
        };
        this.getRequestedLanguages = async (request, response) => {
            response.json(await this.model.db.getRequestedLanguages());
        };
        this.createLanguageRequest = async (request, response) => {
            await this.model.db.createLanguageRequest(request.body.language, request.client_id);
            response.json({});
        };
        this.createSkippedSentence = async (request, response) => {
            const { client_id, params: { id }, } = request;
            await this.model.db.createSkippedSentence(id, client_id);
            response.json({});
        };
        this.getLanguageStats = async (request, response) => {
            response.json(await this.model.getLanguageStats());
        };
        this.getUserClients = async ({ client_id, user }, response) => {
            if (!user) {
                response.json([]);
                return;
            }
            const email = user.emails[0].value;
            const userClients = [
                { email },
                ...(await user_client_1.default.findAllWithLocales({
                    email,
                    client_id,
                })),
            ];
            response.json(userClients);
        };
        this.saveAccount = async ({ body, user }, response) => {
            if (!user) {
                throw new utility_1.ClientParameterError();
            }
            response.json(await user_client_1.default.saveAccount(user.id, Object.assign({}, body, { email: user.emails[0].value })));
        };
        this.getAccount = async ({ user }, response) => {
            response.json(user ? await user_client_1.default.findAccount(user.id) : null);
        };
        this.subscribeToNewsletter = async (request, response) => {
            const { BASKET_API_KEY, PROD } = config_helper_1.getConfig();
            if (!BASKET_API_KEY) {
                response.json({});
                return;
            }
            const { email } = request.params;
            const basketResponse = await sendRequest({
                uri: 'https://basket.mozilla.org/news/subscribe/',
                method: 'POST',
                form: {
                    'api-key': BASKET_API_KEY,
                    newsletters: 'common-voice',
                    format: 'H',
                    lang: 'en',
                    email,
                    source_url: request.header('Referer'),
                    sync: 'Y',
                },
            });
            await user_client_1.default.updateBasketToken(email, JSON.parse(basketResponse).token);
            response.json({});
        };
        this.saveAvatar = async ({ body, headers, params, user }, response) => {
            let avatarURL;
            let error;
            switch (params.type) {
                case 'default':
                    avatarURL = null;
                    break;
                case 'gravatar':
                    try {
                        avatarURL =
                            'https://gravatar.com/avatar/' +
                                crypto_js_1.MD5(user.emails[0].value).toString() +
                                '.png?s=24';
                        await sendRequest(avatarURL + '&d=404');
                    }
                    catch (e) {
                        if (e.name != 'StatusCodeError') {
                            throw e;
                        }
                        error = 'not_found';
                    }
                    break;
                case 'file':
                    avatarURL =
                        'data:' +
                            headers['content-type'] +
                            ';base64,' +
                            body.toString('base64');
                    if (avatarURL.length > 2500) {
                        error = 'too_large';
                    }
                    break;
                default:
                    response.sendStatus(404);
                    return;
            }
            if (!error) {
                await user_client_1.default.updateAvatarURL(user.id, avatarURL);
            }
            response.json(error ? { error } : {});
        };
        this.getLanguageSpecificStats = (request, response) => {
            response.json({
                clips: {
                    you: 0,
                    all: 10,
                },
                votes: {
                    you: 0,
                    all: 10,
                },
                valid_clips_leaderboard: [
                    { avatar: '', username: '', total: 10, valid: 5, valid_share: 10.99 },
                ],
            });
        };
        this.model = model;
        this.clip = new clip_1.default(this.model);
        this.metrics = new prometheus_1.default();
    }
    getRouter() {
        const router = PromiseRouter();
        router.use(bodyParser.json());
        router.use(async (request, response, next) => {
            this.metrics.countRequest(request);
            const client_id = request.headers.client_id;
            if (client_id) {
                //TODO auth check back, without breaking registration
                // if (await UserClient.hasSSO(client_id)) {
                //   response.sendStatus(401);
                //   return;
                // }
                request.client_id = client_id;
            }
            if (request.user) {
                request.client_id = await user_client_1.default.findClientId(request.user.id);
            }
            next();
        });
        router.get('/metrics', (request, response) => {
            this.metrics.countPrometheusRequest(request);
            const { registry } = this.metrics;
            response
                .type(registry.contentType)
                .status(200)
                .end(registry.metrics());
        });
        router.use((request, response, next) => {
            this.metrics.countApiRequest(request);
            next();
        });
        router.put('/user_clients/:id', this.saveUserClient);
        router.get('/user_clients', this.getUserClients);
        router.get('/user_client', this.getAccount);
        router.patch('/user_client', this.saveAccount);
        router.post('/user_client/avatar/:type', bodyParser.raw({ type: 'image/*' }), this.saveAvatar);
        router.put('/users/:id', this.saveUser);
        router.get('/:locale/sentences', this.getRandomSentences);
        router.post('/skipped_sentences/:id', this.createSkippedSentence);
        router.use('/:locale?/clips', (request, response, next) => {
            this.metrics.countClipRequest(request);
            next();
        }, this.clip.getRouter());
        router.get('/:locale/stats', this.getLanguageSpecificStats);
        router.get('/requested_languages', this.getRequestedLanguages);
        router.post('/requested_languages', this.createLanguageRequest);
        router.get('/language_stats', this.getLanguageStats);
        router.post('/newsletter/:email', this.subscribeToNewsletter);
        router.use('*', (request, response) => {
            response.sendStatus(404);
        });
        return router;
    }
}
exports.default = API;
//# sourceMappingURL=api.js.map