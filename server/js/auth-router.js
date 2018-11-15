"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_js_1 = require("crypto-js");
const Auth0Strategy = require('passport-auth0');
const PromiseRouter = require('express-promise-router');
const session = require("express-session");
const MySQLStore = require('express-mysql-session')(session);
const passport = require("passport");
const user_client_1 = require("./lib/model/user-client");
const config_helper_1 = require("./config-helper");
const { ENVIRONMENT, MYSQLHOST, MYSQLDBNAME, MYSQLUSER, MYSQLPASS, PROD, SECRET, AUTH0: { DOMAIN, CLIENT_ID, CLIENT_SECRET }, } = config_helper_1.getConfig();
const CALLBACK_URL = '/callback';
const router = PromiseRouter();
router.use(require('cookie-parser')());
router.use(session({
    cookie: {
        maxAge: 365 * 24 * 60 * 60,
        secure: PROD,
    },
    secret: SECRET,
    store: new MySQLStore({
        host: MYSQLHOST,
        user: MYSQLUSER,
        password: MYSQLPASS,
        database: MYSQLDBNAME,
        createDatabaseTable: false,
    }),
    proxy: true,
    resave: false,
    saveUninitialized: false,
}));
router.use(passport.initialize());
router.use(passport.session());
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((sessionUser, done) => done(null, sessionUser));
if (DOMAIN) {
    Auth0Strategy.prototype.authorizationParams = function (options) {
        var options = options || {};
        const params = {};
        if (options.connection && typeof options.connection === 'string') {
            params.connection = options.connection;
        }
        if (options.audience && typeof options.audience === 'string') {
            params.audience = options.audience;
        }
        params.tried_autologin = true;
        params.action = 'signup';
        return params;
    };
    const strategy = new Auth0Strategy({
        domain: DOMAIN,
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: ({
            stage: 'https://voice.allizom.org',
            prod: 'https://voice.mozilla.org',
        }[ENVIRONMENT] || '') + CALLBACK_URL,
        scope: 'openid email',
    }, (accessToken, refreshToken, extraParams, profile, done) => done(null, profile));
    passport.use(strategy);
}
else {
    console.log('No Auth0 configuration found');
}
router.get(CALLBACK_URL, passport.authenticate('auth0', { failureRedirect: '/login' }), async ({ user, query }, response) => {
    if (!user) {
        response.redirect('/login-failure');
    }
    else if (query.state) {
        const { old_sso_id } = JSON.parse(crypto_js_1.AES.decrypt(query.state, SECRET).toString(crypto_js_1.enc.Utf8));
        await user_client_1.default.updateSSO(old_sso_id, user.id, user.emails[0].value);
        response.redirect('/profile/preferences');
    }
    else {
        response.redirect('/login-success');
    }
});
router.get('/login', (request, response) => {
    const { user, query } = request;
    passport.authenticate('auth0', {
        state: user && query.change_email !== undefined
            ? crypto_js_1.AES.encrypt(JSON.stringify({ old_sso_id: user.id }), SECRET).toString()
            : '',
    })(request, response);
});
router.get('/logout', (request, response) => {
    response.clearCookie('connect.sid');
    response.redirect('/');
});
exports.default = router;
//# sourceMappingURL=auth-router.js.map