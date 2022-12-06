var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    concat = require('gulp-concat'),
    browserify = require('browserify'),
    buffer = require('gulp-buffer'),
    minifycss = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    sass = require('gulp-sass'),
    source     = require('vinyl-source-stream'),
    sourcemaps = require('gulp-sourcemaps'),
    transform = require('vinyl-transform'),
    uglify = require('gulp-uglify'),
    watch = require('gulp-watch');

var assetPath = './public/dist';
var srcPath = './src';

/* Output .scss files to compressed and prefixed CSS */
gulp.task('styles', function() {
    gulp.src(srcPath + '/sass/app.scss')
    	.pipe(
    		sass({ 
    			includePaths : ['./sass'] 
    		}))
        .pipe(sass().on('error', sass.logError))
        .pipe(sass({ style: 'expanded' }))
	    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1'))
	    .pipe(rename({suffix: '.min'}))
	    .pipe(minifycss())
        .pipe(gulp.dest(assetPath + '/css'));
});

/* Vendor */
gulp.task('javascript:vendor', function() {
  gulp.src([
        './src/vendor/*.js',
        './src/vendor/**/*.js'
    ])
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./public/dist/js'));
  
  // Materialize doesn't play nicely with other plugins, so it gets
  // passed through and included separately
  gulp.src('./src/vendor/materialize.min.js')
    .pipe(gulp.dest('./public/dist/js'))
});

gulp.task('css:vendor', function() {
    gulp.src(srcPath + '/vendor/css/*.css')
    .pipe(minifycss())
    .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9'))
    .pipe(concat('vendor.min.css'))
    .pipe(gulp.dest('./public/dist/css'))
});


/* Transform JS modules into a script per visualization */
gulp.task('graphs', function() {
  gulp.src(srcPath + '/js/graphs/graph.js')
    .pipe(uglify())
    .pipe(gulp.dest('./public/dist/js'));
});

gulp.task('graph-extras', function() {
  return browserify({entries:[srcPath + '/js/graphs/extras/Extras.js']})
    .bundle()
    .pipe(source('extras.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(assetPath + '/js'))
});

gulp.task('maps', function() {
  return browserify({entries:[srcPath + '/js/maps/map.js']})
    .bundle()
    .pipe(source('map.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(assetPath + '/js'))
});

gulp.task('spaghetti', function() {
  return browserify({entries:[srcPath + '/js/spaghetti/spaghetti.js']})
    .bundle()
    .pipe(source('spaghetti.min.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest(assetPath + '/js'))
});

/* Images */
// Make this compress images in future versions
gulp.task('images', function() {
     gulp.src(srcPath + '/images/*')
        .pipe(gulp.dest(assetPath + '/images'))
});

/* Watch task for development */
gulp.task('watch', function() {
 	gulp.watch(srcPath + '/sass/**/*.scss',['styles']);
 	gulp.watch(srcPath + '/js/graphs/graph.js',['graphs']);
    gulp.watch(srcPath + '/js/graphs/**/*.js',['graph-extras']);
    gulp.watch(srcPath + '/js/maps/**/*.js',['maps']);
    gulp.watch(srcPath + '/js/spaghetti/**/*.js',['spaghetti']);
});

/* Default build task */
gulp.task('default', function() {
 	gulp.start('styles', 'images', 'graphs', 'graph-extras', 'maps', 'spaghetti', 'javascript:vendor', 'css:vendor');
});
