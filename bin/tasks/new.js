'use strict';

/* eslint-disable global-require */

const _ = require('../lib/util');

const path = require('path');

const DATABASE_TEMPLATE = `module.exports = {
  development: {
    dialect: 'sqlite',
    storage: 'db_{{snakeCase APP_NAME}}_dev.sqlite',
  },{{#IS_SQLITE3}}
  production: {
    dialect: 'sqlite',
    storage: 'db_{{snakeCase APP_NAME}}_prod.sqlite',
  },{{/IS_SQLITE3}}{{^IS_SQLITE3}}
  production: {
    host: 'localhost',
    dialect: '{{DATABASE}}',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: '{{snakeCase APP_NAME}}_prod',
  },{{/IS_SQLITE3}}
};
`;

const BOWER_TEMPLATE = `{
  "name": "{{paramCase APP_NAME}}",
  "license": "MIT",
  "ignore": [
    "**/.*",
    "node_modules",
    "bower_components",
    "test",
    "tests"
  ]
}
`;

const JASMINE_TEST = `describe('The truth', () => {
  it('is truthy', () => {
    const truth = 42;

    expect(truth).toBe(42);
  });
});
`;

const MOCHA_TEST = `const expect = require('chai').expect;

${JASMINE_TEST.replace('toBe', 'to.equal')}`;

const AVA_TEST = `import test from 'ava';

test('The truth', t => {
  t.pass();
});`;

module.exports = ($, cwd, logger) => {
  let name = $._.shift();

  /* istanbul ignore else */
  if (!name) {
    throw new Error("Missing APP_PATH, it's required!");
  }

  if (name === '.') {
    name = path.basename(cwd);
  } else {
    name = (name || '').replace(/\W+/g, '-');
    cwd = path.join(cwd, name);
  }

  /* istanbul ignore else */
  if ($.data.DATABASE
    && ['postgres', 'mysql', 'mssql', 'sqlite'].indexOf($.data.DATABASE) === -1) {
    throw new Error(`Unsupported DATABASE=${$.data.DATABASE}`);
  }

  /* istanbul ignore else */
  if ($.data.RELOADER
    && ['browser-sync', 'live-reload'].indexOf($.data.RELOADER) === -1) {
    throw new Error(`Unsupported RELOADER=${$.data.RELOADER}`);
  }

  /* istanbul ignore else */
  if ($.data.BUNDLER
    && ['fusebox', 'webpack', 'rollup'].indexOf($.data.BUNDLER) === -1) {
    throw new Error(`Unsupported BUNDLER=${$.data.BUNDLER}`);
  }

  /* istanbul ignore else */
  if ($.data.STYLES
    && ['less', 'sass', 'styl', 'postcss'].indexOf($.data.STYLES) === -1) {
    throw new Error(`Unsupported STYLES=${$.data.STYLES}`);
  }

  /* istanbul ignore else */
  if ($.data.TESTS
    && ['ava', 'mocha', 'jasmine-node'].indexOf($.data.TESTS) === -1) {
    throw new Error(`Unsupported TESTS=${$.data.TESTS}`);
  }

  /* istanbul ignore else */
  if ($.data.ES6
    && ['buble', 'babel', 'traceur'].indexOf($.data.ES6) === -1) {
    throw new Error(`Unsupported ES6=${$.data.ES6}`);
  }

  const Haki = require('haki');

  const haki = new Haki(cwd, _.extend({}, $.flags));

  function ask() {
    return haki.runGenerator({
      abortOnFail: true,
      prompts: [
        {
          name: 'DATABASE',
          type: 'list',
          message: 'Database:',
          choices: [
            { label: 'None', value: null },
            { label: 'PostgreSQL', value: 'postgres' },
            { label: 'MySQL', value: 'mysql' },
            { label: 'MSSQL', value: 'mssql' },
            { label: 'SQLite3', value: 'sqlite' },
          ],
        },
        {
          name: 'RELOADER',
          type: 'list',
          message: 'Reloader:',
          choices: [
            { label: 'None', value: null },
            { label: 'LiveReload', value: 'live-reload' },
            { label: 'BrowserSync', value: 'browser-sync' },
          ],
        },
        {
          name: 'BUNDLER',
          type: 'list',
          message: 'Bundler:',
          choices: [
            { label: 'None', value: null },
            { label: 'Rollup', value: 'rollup' },
            { label: 'Webpack', value: 'webpack' },
            { label: 'FuseBox', value: 'fusebox' },
          ],
        },
        {
          name: 'STYLES',
          type: 'list',
          message: 'Styles:',
          choices: [
            { label: 'None', value: null },
            { label: 'LESS', value: 'less' },
            { label: 'Sass', value: 'sass' },
            { label: 'Styl', value: 'styl' },
            { label: 'PostCSS', value: 'postcss' },
          ],
        },
        {
          name: 'TESTS',
          type: 'list',
          message: 'Tests:',
          choices: [
            { label: 'None', value: null },
            { label: 'AVA', value: 'ava' },
            { label: 'Mocha', value: 'mocha' },
            { label: 'Jasmine', value: 'jasmine-node' },
          ],
        },
        {
          name: 'ES6',
          type: 'list',
          message: 'Scripts:',
          choices: [
            { label: 'None', value: null },
            { label: 'Bublé', value: 'buble' },
            { label: 'Babel', value: 'babel' },
            { label: 'Traceur', value: 'traceur' },
          ],
        },
      ],
      // merge user-input
      actions: values => {
        Object.keys(values).forEach(key => {
          $.data[key] = typeof values[key] !== 'undefined'
            ? values[key]
            : $.data[key];
        });
      },
    });
  }

  function run() {
    return haki.runGenerator({
      abortOnFail: true,
      basePath: path.join(__dirname, '../skel/template'),
      actions: [
        // mirror skeleton
        {
          copy: '.',
          src: '.',
        },
        // bower support?
        $.flags.bower !== false ? {
          type: 'add',
          dest: 'bower.json',
          template: BOWER_TEMPLATE,
        } : null,
        // evaluate templates
        {
          render: [
            'package.json',
            'app/server.js',
          ],
        },
        // models directory
        $.data.DATABASE ? {
          type: 'add',
          dest: 'app/models/.gitkeep',
        } : null,
        // default configuration
        $.data.DATABASE ? {
          type: 'add',
          dest: 'config/database.js',
          template: DATABASE_TEMPLATE,
        } : null,
        // testing support
        $.data.TESTS ? {
          type: 'add',
          dest: 'test/.gitkeep',
        } : null,
        $.data.TESTS === 'ava' ? {
          type: 'add',
          dest: 'test/blank.test.js',
          content: AVA_TEST,
        } : null,
        $.data.TESTS === 'mocha' ? {
          type: 'add',
          dest: 'test/blank.test.js',
          content: MOCHA_TEST,
        } : null,
        $.data.TESTS === 'jasmine-node' ? {
          type: 'add',
          dest: 'test/blank.spec.js',
          content: JASMINE_TEST,
        } : null,
        // framework dependencies
        {
          type: 'install',
          quiet: $.flags.verbose !== true,
          dependencies: [
            ['grown', 'route-mappings'],
            ['csurf', 'formidable', 'serve-static'],
            ['body-parser', 'cookie-parser', 'cookie-session'],
          ],
          devDependencies: [
            ['chokidar', 'node-notifier'],
            $.flags.talavera !== false ? 'talavera' : null,
            $.flags.bower !== false ? 'tarima-bower' : null,
            ['tarima', 'pug', 'csso', 'google-closure-compiler-js'],
            ['eslint', 'eslint-plugin-import', 'eslint-config-airbnb-base'],
          ],
        },
        // database dependencies
        $.data.DATABASE ? {
          type: 'install',
          quiet: $.flags.verbose !== true,
          dependencies: [
            ['sequelize', 'json-schema-sequelizer'],
            $.data.DATABASE === 'mysql' ? 'mysql' : null,
            $.data.DATABASE === 'mssql' ? 'mssql' : null,
            $.data.DATABASE === 'sqlite' ? 'sqlite3' : null,
            $.data.DATABASE === 'postgres' ? ['pg', 'pg-native'] : null,
          ],
        } : null,
        // extra dependencies
        ($.data.DATABASE || $.data.BUNDLER || $.data.STYLES || $.data.ES6) ? {
          type: 'install',
          quiet: $.flags.verbose !== true,
          devDependencies: [
            $.data.DATABASE && $.data.DATABASE !== 'sqlite' ? 'sqlite3' : null,
            $.data.BUNDLER === 'fusebox' ? 'fuse-box' : null,
            $.data.BUNDLER === 'webpack' ? 'webpack' : null,
            $.data.BUNDLER === 'rollup' ? ['rollup', 'rollup-plugin-node-resolve', 'rollup-plugin-commonjs'] : null,
            $.data.STYLES === 'less' ? ['less', 'less-plugin-autoprefix'] : null,
            $.data.STYLES === 'postcss' ? ['postcss', 'postcss-import', 'postcss-cssnext'] : null,
            $.data.STYLES === 'sass' ? 'node-sass' : null,
            $.data.STYLES === 'styl' ? 'styl' : null,
            $.data.ES6 === 'traceur' ? 'traceur' : null,
            $.data.ES6 === 'babel' ? ['babel-core', 'babel-preset-es2015', 'babel-plugin-transform-react-jsx'] : null,
            $.data.ES6 === 'buble' ? 'buble' : null,
          ],
        } : null,
        // testing dependencies
        $.data.TESTS ? {
          type: 'install',
          quiet: $.flags.verbose !== true,
          devDependencies: [
            ['nyc', 'codecov'],
            $.data.TESTS === 'jasmine-node'
              ? ['jasmine-node@2.0.0-beta4']
              : $.data.TESTS,
            $.data.TESTS === 'mocha' ? 'chai' : null,
          ],
        } : null,
        // reloader dependencies
        $.data.RELOADER ? {
          type: 'install',
          quiet: $.flags.verbose !== true,
          optionalDependencies: [
            $.data.RELOADER === 'browser-sync' ? 'tarima-browser-sync' : null,
            $.data.RELOADER === 'live-reload' ? 'tarima-lr' : null,
          ],
        } : null
      ],
    }, _.extend({
      APP_NAME: name,
      CSS_LANG: $.data.STYLES,
      CAN_BUNDLE: $.data.BUNDLER || $.data.STYLES || $.data.ES6,
      RUN: $.flags.npm === true ? 'npm run' : 'yarn',
      IS_LESS: $.data.STYLES === 'less',
      IS_BUBLE: $.data.ES6 === 'buble',
      IS_BABEL: $.data.ES6 === 'babel',
      IS_ROLLUP: $.data.BUNDLER === 'rollup',
      IS_POSTCSS: $.data.STYLES === 'postcss',
      IS_SQLITE3: $.data.DATABASE === 'sqlite',
      IS_BROWSER_SYNC: $.data.RELOADER === 'browser-sync',
      HAS_PLUGINS: $.flags.bower !== false || $.flags.talavera !== false || $.data.RELOADER,
      HAS_BOWER: $.flags.bower !== false,
      HAS_TALAVERA: $.flags.talavera !== false,
      HAS_TESTS: $.data.TESTS,
      IS_JASMINE: $.data.TESTS === 'jasmine-node',
      IS_MOCHA: $.data.TESTS === 'mocha',
      IS_AVA: $.data.TESTS === 'ava',
    }, $.data))
  }

  ($.flags.interactive
    ? ask().then(() => run())
    : run())
  .catch(e => {
    _.printError(e, $.flags, logger);
    _.die(1);
  });
};
