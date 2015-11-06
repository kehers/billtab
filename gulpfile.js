var gulp = require('gulp');

var minify = require('gulp-minifier');

gulp.task('minify', function() {
  return gulp.src('raw/**/*').pipe(minify({
    minify: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    minifyJS: true,
    minifyCSS: true
  })).pipe(gulp.dest('dist'));
});