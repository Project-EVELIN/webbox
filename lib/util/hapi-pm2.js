exports.register = function(server, options, done) {
  process.on('SIGINT', function() {
    server.log(['info', 'pm2', 'shutdown'], 'stopping hapi...');
    server.root.stop(options, function() {
      server.log(['info', 'pm2', 'shutdown'], 'hapi stopped');
      return process.exit(0);
    });
  });

  return done();
};

exports.register.attributes = {
  name: 'hapi-pm2-shutdown',
  version: '0.0.1'
};