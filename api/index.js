
import fs from 'fs';
import Backbone from 'backbone';
import config from 'config';
import userApi from './user';
import themeApi from './theme';
import nonOsmDataApi from './nonOsmData';
import osmCacheApi from './osmCache';
import fileApi from './file';
import overPassCacheApi from './overPassCache';
import ThemeModel from '../public/js/model/theme';


function isLoggedIn(req, res, next) {
    if ( req.isAuthenticated() ) {
        return next();
    }

    return res.sendStatus(401);
}


function onPromiseError(res, errorCode) {
    res.sendStatus(errorCode);
}


function getiDPresets(CONST) {
    return new Promise((resolve, reject) => {
        fs.readFile(CONST.iDPresetsPath, 'utf-8', (err, data) => {
            if (err) {
                return reject(err);
            }

            return resolve(JSON.parse(data));
        });
    });
}


export default class Api {
    init(app, db, CONST, packageJson) {
        const options = {
            CONST,
            database: db,
            fileApi,
        };

        userApi.setOptions( options );
        themeApi.setOptions( options );
        nonOsmDataApi.setOptions( options );
        osmCacheApi.setOptions( options );
        fileApi.setOptions( options );
        fileApi.initDirectories( app );
        overPassCacheApi.setOptions( options );


        app.get('/api/user/logout', userApi.Api.logout);
        // app.get('/api/user', userApi.Api.getAll);
        app.get('/api/user/:_id', userApi.Api.get);
        app.post('/api/user', isLoggedIn, userApi.Api.post);
        app.put('/api/user/:_id', isLoggedIn, userApi.Api.put);
        // app.delete('/api/user/:_id', isLoggedIn, userApi.Api.delete);

        app.get('/api/theme', themeApi.Api.getAll);
        app.get('/api/theme/:_id', themeApi.Api.get);
        app.post('/api/theme', isLoggedIn, themeApi.Api.post);
        app.put('/api/theme/:_id', isLoggedIn, themeApi.Api.put);
        // app.delete('/api/theme/:_id', isLoggedIn, themeApi.Api.delete);

        app.get('/api/nonOsmData', nonOsmDataApi.Api.getAll);
        app.get('/api/nonOsmData/:_id', nonOsmDataApi.Api.get);
        app.post('/api/nonOsmData', isLoggedIn, nonOsmDataApi.Api.post);
        app.put('/api/nonOsmData/:_id', isLoggedIn, nonOsmDataApi.Api.put);

        app.get('/api/osmCache', osmCacheApi.Api.getAll);
        app.get('/api/osmCache/:_id', osmCacheApi.Api.get);
        app.post('/api/osmCache', isLoggedIn, osmCacheApi.Api.post);
        app.put('/api/osmCache/:_id', isLoggedIn, osmCacheApi.Api.put);
        app.delete('/api/osmCache/:_id', osmCacheApi.Api.delete);


        app.get('/', (req, res) => {
            const clientConfig = config.get('client');
            const templateVars = {
                user: req.session.user ? escape(JSON.stringify(req.session.user)) : '{}',
                config: JSON.stringify( clientConfig ),
                highlightList: '[]',
                version: packageJson.version,
                analyticScript: config.get('analyticScript'),
            };

            if (clientConfig.highlightedThemes && clientConfig.highlightedThemes.length > 0) {
                const promises = [];

                for (const fragment of clientConfig.highlightedThemes) {
                    promises.push(
                        themeApi.Api.findFromFragment(fragment)
                    );
                }

                Promise.all(promises)
                .then((themeObjects) => {
                    const highlightList = [];

                    for (const themeObject of themeObjects) {
                        highlightList.push(themeObject);
                    }

                    templateVars.highlightList = escape(JSON.stringify( highlightList ));

                    res.render('home', templateVars);
                })
                .catch( onPromiseError.bind(this, res) );
            }
            else {
                res.render('home', templateVars);
            }
        });

        app.get(/\/t\/(\w+)(-.*)?/, (req, res) => {
            const fragment = req.params['0'];
            const templateVars = {
                user: req.session.user ? escape(JSON.stringify(req.session.user)) : '{}',
                config: JSON.stringify( config.get('client') ),
                version: packageJson.version,
                analyticScript: config.get('analyticScript'),
            };

            const promises = [
                themeApi.Api.findFromFragment(fragment),
                nonOsmDataApi.Api.findFromFragment(fragment),
                osmCacheApi.Api.findFromFragment(fragment),
                getiDPresets(CONST),
            ];

            Promise.all( promises )
            .then((data) => {
                templateVars.theme = escape(JSON.stringify( data[0] ));
                templateVars.themeAnalyticScript = data[0].analyticScript;
                templateVars.nonOsmData = escape(JSON.stringify( data[1] ));
                templateVars.osmCache = escape(JSON.stringify( data[2] ));
                templateVars.iDPresets = escape(JSON.stringify( data[3] ));

                res.render('theme', templateVars);
            })
            .catch( onPromiseError.bind(this, res) );
        });


        app.get('/create_theme', (req, res) => {
            if (!req.session.user) {
                res.sendStatus(401);
            }

            const userId = req.session.user._id.toString();

            themeApi.Api.createTheme(req.session, userId)
            .then((theme) => {
                Backbone.Relational.store.reset();

                const model = new ThemeModel(theme);

                res.redirect(
                    model.buildPath()
                );
            })
            .catch( onPromiseError.bind(this, res) );
        });


        app.post('/api/file/shape', fileApi.Api.postShapeFile);
        app.post('/api/file/nonOsmData', fileApi.Api.postNonOsmDataFile);

        app.get('/api/overPassCache/generate/:uuid', overPassCacheApi.Api.generate);

        app.get('/api/iDPresets/locale', (req, res) => {
            if (!req.query.locales || req.query.locales.length < 1) {
                return res.sendStatus(400);
            }

            for (const locale of req.query.locales) {
                const localeFile = `${CONST.iDLocalesDirectoryPath}/${locale}.json`;

                try {
                    fs.statSync(localeFile);
                    return res.send(
                        fs.readFileSync(localeFile, 'utf-8')
                    );
                }
                catch (e) {
                    console.error(e);
                }
            }

            return res.sendStatus(404);
        });
    }
}
