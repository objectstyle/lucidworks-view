/*eslint-env node*/
var $               = require('gulp-load-plugins')();
var gulp            = require('gulp');

var packageJson     = require('../package.json');
var buildFolder = packageJson.buildFolder;

// var browserSync     = require('browser-sync').create();

// Compiles Sass
gulp.task('sass', function () {
  var cssnano = $.if(global.isProduction, $.cssnano());

  return gulp.src('client/assets/scss/app.scss')
    .pipe($.sass({
      includePaths: global.paths.sass,
      outputStyle: (global.isProduction ? 'compressed' : 'nested'),
      errLogToConsole: true
    }))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(cssnano)
    .pipe($.plumber())
    .pipe(gulp.dest(buildFolder + '/assets/css/'));
    // .pipe(browserSync.stream())
});
