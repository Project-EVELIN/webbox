/* global process */
var Promise = require('bluebird');

// setup args
require('yargs').usage('webboxcli <cmd> [args]')
  .command('list <model>', 'list database entries for <model>', { },
  function (argv) {
    list(argv.model);
  })
  .example('list User', 'list all users')
  .command('addUser <username> <email> <password> <isAdmin>', 'adds/updates a user to the database', {}, function (argv) {
    addUser(argv.username, argv.email, argv.password, argv.isAdmin);
  })
  .command('removeUser <id>', 'removes the user with <id>', {}, function (argv) {
    removeUser(argv.id);
  })
  .command('addCourse <slug> <userid>', 'adds dummy course', {}, function (argv) {
    addCourse(argv.slug, argv.userid);
  })
  .command('removeCourse <id>', 'removes the course with <id>', {}, function (argv) {
    removeCourse(argv.id);
  })
  .command('addEmbed <userid>', 'Adds a new embed with some sample content', {}, function (argv) {
    addEmbed(argv.userid);
  })
  .command('removeEmbed <id>', 'Removes the embed', {}, function (argv) {
    removeEmbed(argv.id);
  })
  .help('help')
  .argv;


function list (model) {
  if (model === "User") {
    var User = require('../lib/models/user');

    User.orderBy({index: 'username'}).run().then(function (users) {
      for (var u of users) {
        console.log(u.username, u.email, u.roles, u.id, u.password);
      }
      process.exit();
    });
  } else if (model === "Course") {
    var Course = require('../lib/models/course');

    Course.orderBy({index: 'name'}).run().then(function (courses) {
      for (var c of courses) {
        console.log(c.name, c.title, c.id);
      }
      process.exit();
    });
  }
}

/**
 * Adds a new user if not already existing
 */
function addUser (username, email, password, isAdmin) {
  var User = require('../lib/models/user');
  var roles = ['user', 'staff', 'admin'];

  /*if (isAdmin && isAdmin === true) {
    roles.push('admin');
  }*/

  User.findByEmailorUsername(username, email)
  .then((user) => {
    console.log('A user with this username/email already exists.', user.id);
    process.exit(1);
  })
  .error((err) => {
    // user does not exist already, proceed
    // encrypt password
    return User.encryptPassword(password);
  })
  .then((hash) => {
    console.info('Trying to save encrypted password:', username, hash);
    // create a new user with default role
    var newUser = new User({
      username: username,
      email: email,
      password: hash,
      roles: roles,
      isActive: true,
      verification: {
        token: undefined,
        isCompleted: true
      }
    });
    return newUser.save();
  })
  .then((user) => {
    console.log('Saved User: ', user.username, user.id);
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}

function removeUser (id) {
  var User = require('../lib/models/user');

  User.get(id).run()
  .then((user) => {
    return user.delete();
  })
  .then(() => {
    console.log('Removed user with id: ', id);
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}

function addCourse (slug, userid) {
  const DUMMY_DOCUMENT = `# Markdown - eine einfache Sprache

hier noch etwas Text. Und anschließend einen Beispielcode
\`\`\`python
print('All your base are belong to us!')
\`\`\`
`;
  var Course = require('../lib/models/course');

  // ToDo: check if there is an existing course with this id

  var c = Course({
    title: 'Einführung in ' + slug,
    slug: slug,
    _creator: userid,
    chapters: [{
      document: DUMMY_DOCUMENT,
      title: 'Einstieg',
      isIndex: true,
      titleSlug: 'einstieg',
      history: []
    }]
  });

  c.save()
  .then(() => {
    console.log('Created dummy course');
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}

function removeCourse (id) {
  var Course = require('../lib/models/course');

  Course.get(id).run()
  .then((course) => {
    return course.delete();
  })
  .then(() => {
    console.log('Removed course with id: ', id);
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}


function addEmbed (userid) {
  var CodeEmbed = require('../lib/models/codeEmbed');
  var meta = CodeEmbed.getDefaultMeta('PythonTest');
  var ce = new CodeEmbed({
    meta: meta,
    code: {
      'main.py': 'import os\n\nprint(os.environ.get(\'PYTHONPATH\'))\nprint(os.environ.get(\'MPLBACKEND\'))\n\nt = 3\ng = 9.81\n\nh = 0.5 * g * t**2\n\nprint(\"h(t) = %d\" % h)\n\nimport matplotlib.pyplot as pp\nimport numpy as np\n\nt = np.linspace(0, 10, 10)  # make a list of values from 0 to 10\nh = 0.5 * g * t**2 # calculate h for each value in t (h is also a list)\n\n# plot h and t\npp.plot(h, t, \"--ro\", linewidth=3, markersize=6, dash_capstyle=\"projecting\", markerfacecolor=\"b\");\npp.title(\"Free Fall\")\npp.xlabel(\"t in seconds\")\npp.ylabel(\"h in meters\")\npp.show()',
      'data.txt': 'test\ntest2\ntest3\n',
      'backend_sb.py': '#http:\/\/stackoverflow.com\/a\/32988875\/1602537\n\"\"\"\nTrinket backend to override plt.show() with plt.savefig().\n\"\"\"\n\nfrom __future__ import (absolute_import, division, print_function,\n                        unicode_literals)\n\nfrom matplotlib.externals import six\n\nimport matplotlib\nfrom matplotlib.backends.backend_agg import new_figure_manager, FigureCanvasAgg\nfrom matplotlib._pylab_helpers import Gcf\nfrom matplotlib.backend_bases import RendererBase, GraphicsContextBase,\\\n     FigureManagerBase, FigureCanvasBase\nfrom matplotlib.figure import Figure\nfrom matplotlib.transforms import Bbox\nimport io\nimport os\nimport sys\n\n\n########################################################################\n#\n# The following functions and classes are for pylab and implement\n# window\/figure managers, etc...\n#\n########################################################################\n\ndef show():\n    for manager in Gcf.get_all_fig_managers():\n        canvas = FigureCanvasAgg(manager.canvas.figure)\n\n\n        # now the filedescriptor 3 must exist\n        try:\n            fd = os.fdopen(3, \'wb\')\n            fd.write(b\'STARTIMGAGE\')\n            fd.flush()\n            canvas.print_png(fd)\n            fd.flush()\n            fd.write(b\'ENDIMAGE\')\n            fd.flush()\n            fd.close()\n        except e:\n            print(\'An error occured while sending the image to your browser.\')\n            \n\n########################################################################\n#\n# Now just provide the standard names that backend.__init__ is expecting\n#\n########################################################################\n\nFigureCanvas = FigureCanvasAgg'
    },
    _creatorId: userid
  });

  ce.save()
  .then(() => {
    console.log('Created code embed');
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}

function removeEmbed (id) {
  var CodeEmbed = require('../lib/models/codeEmbed');

  CodeEmbed.get(id).run()
  .then((embed) => {
    return embed.delete();
  })
  .then(() => {
    console.log('Removed embed with id: ', id);
  })
  .error((err) => {
    console.log(err);
  })
  .finally(() => {
    process.exit();
  });
}
