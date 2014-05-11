'use strict';

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    source = require('vinyl-source-stream'),
    lrserver = require('tiny-lr')(),
    livereload = require('connect-livereload'),
    express = require('express'),
    livereloadPort = 35729,
    serverPort = 8000,
    server = express();

server.use(express.static('./dist'));
server.use(livereload({ port: livereloadPort }));

gulp.task('sass', function () {
  return gulp.src('app/styles/**/*.scss')
    .pipe(plugins.plumber())
    .pipe(plugins.autoprefixer('last 10 version'))
    .pipe(plugins.rubySass({
      style: 'compressed',
      precision: 10
    }))
    .pipe(gulp.dest('dist/styles'))
    .pipe(plugins.livereload(lrserver));
});

gulp.task('common-scripts', function() {
  return browserify('./app/scripts/common.js')
    .transform('browserify-shim')
    .bundle()
    .pipe(plugins.plumber())
    .pipe(source('common.js'))
    .pipe(buffer())
    .pipe(plugins.uglify())
    .pipe(gulp.dest('dist/scripts'))
    .pipe(plugins.livereload(lrserver));
});

gulp.task('scripts', ['jshint', 'common-scripts'], function () {
  [
    'main.js',
    'main-second.js'
  ].forEach(function(s) {
    return browserify('./app/scripts/' + s)
      .bundle()
      .pipe(plugins.plumber())
      .pipe(source(s))
      .pipe(buffer())
      .pipe(plugins.uglify())
      .pipe(gulp.dest('dist/scripts/'))
      .pipe(plugins.livereload(lrserver));
  });
});

gulp.task('jshint', function () {
  return gulp.src('app/scripts/**/*.js')
    .pipe(plugins.plumber())
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter(require('jshint-stylish')));

});

gulp.task('html', ['sass', 'scripts'], function() {
  return gulp.src('app/templates/pages/**/*.jade')
    .pipe(plugins.plumber())
    .pipe(plugins.jade())
    .pipe(gulp.dest('dist'))
    .pipe(plugins.livereload(lrserver));
});

gulp.task('images', function () {
  return gulp.src('app/images/**/*')
    .pipe(plugins.cache(plugins.imagemin({
      optimizationLevel: 3,
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'))
    .pipe(plugins.livereload((lrserver)));
});

gulp.task('fonts', function () {
  return plugins.bowerFiles()
    .pipe(plugins.filter('**/*.{eot,svg,ttf,woff}'))
    .pipe(plugins.flatten())
    .pipe(gulp.dest('dist/styles/fonts'))
    .pipe(plugins.livereload((lrserver)));
});

gulp.task('extras', function () {
  return gulp.src(['app/*.*', '!app/*.jade'], { dot: true })
    .pipe(gulp.dest('dist'));
});

gulp.task('clean', function () {
  return gulp.src(['.tmp', 'dist'], { read: false }).pipe(plugins.clean());
});

gulp.task('serve', function () {
  server.listen(serverPort);
  server.on('error', function(err) {
    console.error(err);
  });
  lrserver.listen(livereloadPort);

  require('opn')('http://localhost:' + serverPort);
});

gulp.task('watch', ['build', 'serve'], function () {
  gulp.watch('app/templates/**/*.jade', ['html']);
  gulp.watch('app/styles/**/*.scss', ['sass']);
  gulp.watch('app/scripts/**/*.js', ['scripts']);
  gulp.watch('app/images/**/*', ['images']);
});

gulp.task('build', ['html', 'images', 'fonts', 'extras']);

gulp.task('default', ['clean'], function () { gulp.start('build'); });
