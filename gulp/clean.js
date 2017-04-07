/*eslint-env node*/
var gulp    = require('gulp');
var rimraf  = require('rimraf');

var packageJson     = require('../package.json');
var buildFolder = packageJson.buildFolder;


// Cleans the build directory
gulp.task('clean', function(cb) {
  rimraf(buildFolder, cb);
});

gulp.task('clean:templates', function(cb){
  rimraf(buildFolder+ '/assets/js/templates.js', cb);
});

gulp.task('clean:package', function(cb){
  rimraf('./tmp/lucidworks-view', cb);
});
