 'use strict';

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    lrserver = require('tiny-lr')(),
    livereload = require('connect-livereload'),
    express = require('express'),
    fs = require('fs'),
    livereloadPort = 35729,
    serverPort = 8000,
    server = express();

// Needed for revision task
require('events').EventEmitter.prototype._maxListeners = 20; 

server.use(livereload());
server.use(express.static('./dist'));

gulp.task('sass', function () {
  return gulp.src('app/styles/**/*.scss')
    .pipe(plugins.plumber())
    .pipe(plugins.autoprefixer('last 10 version'))
    .pipe(plugins.rubySass({
      style: 'compressed',
      precision: 10
    }))
    .pipe(gulp.dest('dist/styles'));
});

gulp.task('common-scripts', ['jshint'], function(cb) {
  browserify('./app/scripts/common.js')
    .transform('browserify-shim')
    .bundle()
    .pipe(plugins.plumber())
    .pipe(source('common.js'))
    .pipe(buffer())
    .pipe(plugins.uglify())
    .pipe(gulp.dest('dist/scripts'));
  cb();
});

gulp.task('scripts', ['common-scripts', 'jshint'], function (cb) {
  [
    'main.js',
    'main-second.js'
  ].map(function(s) {
    browserify('./app/scripts/' + s)
      .bundle()
      .pipe(plugins.plumber())
      .pipe(source(s))
      .pipe(buffer())
      .pipe(plugins.uglify())
      .pipe(gulp.dest('dist/scripts/'));
  });
  cb();
});

gulp.task('jshint', function () {
  return gulp.src('app/scripts/**/*.js')
    .pipe(plugins.plumber())
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter(require('jshint-stylish')));
});

gulp.task('html', function() {
  return gulp.src('app/templates/pages/**/*.jade')
    .pipe(plugins.plumber())
    .pipe(plugins.jade())
    .pipe(gulp.dest('dist'));
});

gulp.task('revision-files', ['scripts', 'sass'], function() {
  return gulp.src(['dist/styles/**/*.css', 'dist/scripts/**/*.js'], {base: 'dist'})
    .pipe(plugins.clean())
    .pipe(plugins.filter(function(file) {
      return /.*\/[a-z\-]+\.(css|js)/.test(file.path);
    }))
    .pipe(plugins.plumber())
    .pipe(plugins.rev())
    .pipe(gulp.dest('dist'))
    .pipe(plugins.rev.manifest())
    .pipe(gulp.dest('./'));
});

gulp.task('revision', ['revision-files', 'html'], function() {
  var manifest = JSON.parse(fs.readFileSync('./rev-manifest.json', 'utf-8')),
      html = gulp.src('dist/**/*.html');

  for (var key in manifest) {
    html.pipe(plugins.replace(key.replace(/.*\/\//, ''), manifest[key]));
  }

  return html
    .pipe(gulp.dest('dist/'))
    .pipe(plugins.livereload(lrserver));
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe(plugins.cache(plugins.imagemin({
      optimizationLevel: 3,
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function () {
  return plugins.bowerFiles()
    .pipe(plugins.filter('**/*.{eot,svg,ttf,woff}'))
    .pipe(plugins.flatten())
    .pipe(gulp.dest('dist/styles/fonts'));
});

gulp.task('extras', function () {
  return gulp.src(['app/*.*', '!app/*.jade'], { dot: true })
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
  return gulp.src(['.tmp', 'dist'], { read: false }).pipe(plugins.clean());
});

gulp.task('serve', ['build'], function () {
  server.listen(serverPort);
  server.on('error', function(err) {
    console.error(err);
  });
  lrserver.listen(livereloadPort);

  require('opn')('http://localhost:' + serverPort);
});

gulp.task('watch', ['serve'], function () {
  gulp.watch('app/templates/**/*.jade', ['html']);
  gulp.watch('app/styles/**/*.scss', ['sass']);
  gulp.watch('app/scripts/**/*.js', ['scripts']);
  gulp.watch('app/images/**/*', ['images']);
  gulp.watch('app/**/*', ['revision']);
});

gulp.task('build', ['html', 'extras', 'revision', 'scripts', 'sass', 'images', 'fonts']);

gulp.task('default', ['clean'], function () { gulp.start('build'); });