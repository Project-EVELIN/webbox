/**
 * Handler prerequisites utils
 *
 * Prerequisites can be plugged into any route and perform
 * fetching from database and additionally work before calling
 * the actual handler.
 */
import Boom from 'boom';
import assign from 'lodash/assign';

import CodeDocument from '../models/codeDocument';
import CodeEmbed from '../models/codeEmbed';
import Document from '../models/document';
import Course from '../models/course';
import AuthAttempt from '../models/authattempt';
import User from '../models/user';

import { extractClientIp } from '../util/requestUtils';
import { toRelativeDate } from '../util/dateUtils';


module.exports = {
  getCourse: function (request, reply) {
    const courseName = encodeURIComponent(request.params.course);
    // fetch
    Course.getBySlug(courseName)
    .then((c) => {
      return reply(c);
    })
    .error((err) => {
      console.log(err);
      return reply(Boom.notFound(`Der Kurs ${courseName} wurde nicht gefunden!`));
    });
  },
  isCourseOwner: function (request, reply) {
    if (request.pre.course && request.auth.credentials) {
      const isOwner = request.pre.course._owner === request.auth.credentials.id;
      reply(isOwner);
    }
  },
  getUserInformation: function (request, reply) {
    const user = {
      isAnonymous: !request.auth.isAuthenticated,
      scope: [],
      roles: []
    };

    if (!user.isAnonymous) {
      assign(user, request.auth.credentials);
      console.info(`Authenticated "${request.auth.credentials.username}" with roles: ${request.auth.credentials.scope}`);
    }

    return reply(user);
  },
  detectAbuse: function (request, reply) {
    var ip = extractClientIp(request);
    var username = request.payload.username;
    AuthAttempt.detectAbuse(ip, username)
    .then((isAbuse) => {
      if (isAbuse === true) {
        return reply.view('login',
          {
            user: { isAnonymous: true },
            errorMessage: 'Sie haben sich zu oft mit falschen Daten angemeldet. Um Missbrauch zu vermeiden, wurde ihr Konto gesperrt. Melden Sie sich bitte bei einem Dozenten oder Administrator, um ihr Konto wieder freizuschalten.'
          }).takeover().code(400);
      }

      return reply();
    })
    .error((err) => {
      console.error('PreHelpers.detectAbuse', err);
      return reply();
    });
  },
  checkIfEmailExists: function (request, reply) {
    const email = request.payload.email;
    User.findByEmail(email)
    .then(usr => {
      // user exists
      if (usr != null) {
        const response = {
          errorMessage: 'Diese Adresse wurde bereits verwendet.'
        };

        return reply(response).takeover().code(409);
      } else {
        return reply();
      }
    })
    .error(err => {
      console.error('PreHelpers.checkEmail', err);
      const response = {
        errorMessage: 'Fehler bei der Registrierung. Versuchen Sie es erneut.'
      };
      return reply(response).takeover().code(409);
    });
  },
  isAuthenticatedJsonResponse: function (request, reply) {
    if (request.auth.isAuthenticated === false) {
      const response = {
        error: {
          message: 'User is not authenticated.',
          type: 'Authentication',
          error_user_title: 'Fehler',
          error_user_msg: 'Sie sind nicht angemeldet. Bitte laden Sie die Seite neu.'
        }
      };
      reply(response);
    } else {
      return reply();
    }
  },
  checkAdminRole: function (request, reply) {
    if (request.auth.isAuthenticated === true && request.auth.credentials.scope.indexOf('admin') !== -1) {
      return reply(true);
    }

    return reply(false);
  },
  getRecentCourses: function (request, reply) {
    Course.getRecent(10).then(res => {
      reply(res);
    }).error(err => {
      console.error('PreHelpers.getRecentCourses', err);
      return reply();
    });
  },
  getRecentDocuments: function (request, reply) {
    if (request.auth.isAuthenticated === false) {
      // Skip if not authenticated
      return reply();
    }

    // ToDo: Sort by date
    const userId = request.auth.credentials.id;
    Document.getRecent(userId, 10).then(res => {
      for (let doc of res) {
        if (doc.metadata.lastUpdate) {
          try {
            doc.metadata.lastUpdate = toRelativeDate(doc.metadata.lastUpdate);
          } catch (e) {
            console.error(`PreHelpers.getRecentDocuments: failed to convert lastUpdate to relative format (id: ${doc.id})`);
          }
        }
      }

      reply(res);
    }).error(err => {
      console.error('PreHelpers.getRecentDocuments', err);
      return reply();
    });
  },
  getRecentCodeDocuments: function (request, reply) {
    if (request.auth.isAuthenticated === false) {
      // Skip if not authenticated
      return reply();
    }

    // ToDo: Sort by date
    const userId = request.auth.credentials.id;
    CodeDocument.getRecent(userId, 10).then(res => {
      for (let doc of res) {
        if (doc.lastUpdate) {
          try {
            doc.lastUpdate = toRelativeDate(doc.lastUpdate);
          } catch (e) {
            console.error(`PreHelpers.getRecentDocuments: failed to convert lastUpdate to relative format (id: ${doc.id})`);
          }
        }

        if (doc.embed == null) {
          doc.embed = {
            meta: {
              name: "Das Beispiel wurde vom Ersteller gelöscht"
            }
          };
        }
      }
      reply(res);
    }).error(err => {
      console.error('PreHelpers.getRecentCodeDocuments', err);
      return reply();
    });
  },
  getRecentCodeEmbeds: function (request, reply) {
    if (request.auth.isAuthenticated === false) {
      // Skip if not authenticated
      return reply();
    }

    const userId = request.auth.credentials.id;
    CodeEmbed.getRecent(userId, 10).then(res => {
      for (let embed of res) {
        if (embed.lastUpdate) {
          try {
            embed.lastUpdate = toRelativeDate(embed.lastUpdate);
          } catch (e) {
            console.error(`PreHelpers.getRecentDocuments: failed to convert lastUpdate to relative format (id: ${embed.id})`);
          }
        }
      }
      reply(res);
    }).error(err => {
      console.error('PreHelpers.getRecentCodeEmbeds', err);
      return reply();
    });
  },
  getRecentlyViewedDocuments: function (request, reply) {
    if (request.auth.isAuthenticated === false) {
      // Skip if not authenticated
      return reply();
    }

    const userId = request.auth.credentials.id;
    User.get(userId).then(user => {
      reply(user.recentDocuments);
    }).error(err => {
      console.error('PreHelpers.getRecentlyViewedDocuments', err);
      return reply();
    });
  }
};