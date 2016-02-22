/**
 * routes.js contains all routes and their configuration
 */

var Joi = require('joi');
var pages = require('../lib/controllers/pages');
var auth = require('../lib/controllers/auth');
var course = require('../lib/controllers/course');

module.exports = [
    {
        method: 'GET',
        path: '/',
        handler: pages.index,
        config: {}
    }, {
       method: 'GET',
       path: '/course',
       handler: pages.course 
    }, {
        method: 'POST',
        path: '/login',
        handler: auth.login,
        config: {
            validate: {
                payload: {
                    username: Joi.string().required(),
                    password: Joi.string().min(2).max(200).required()
                }
            }
        }       
    }, {
        method: 'GET',
        path: '/login',
        handler: auth.loginview,
        config: {
            auth: {
                mode: 'try',
                strategy: 'session'
            },
            plugins: {
                'hapi-auth-cookie': {
                    redirectTo: false
                    }
                }
        }
    }, {
        method: 'GET',
        path: '/logout',
        handler: auth.logout
    }, {
        method: 'GET',
        path: '/courseoverview',
        handler: course.overview,
    }
];