var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var manifest = require('gulp-manifest');

var paths = {
    sass: ['./scss/**/*.scss'],
    js: ['./jssrc/**/*.js']
};

gulp.task('default', ['sass']);

gulp.task('babel', function (done) {
    gulp.src(paths.js)
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(sourcemaps.write({
            sourceRoot: '../../jssrc'
        }))
        .pipe(gulp.dest('./www/js/'))
        .on('end', done)
        .on('error', function (err) {
            console.log(err.toString());
            this.emit('end');
        });
});

gulp.task('sass', function (done) {
    gulp.src('./scss/ionic.app.scss')
        .pipe(sass({
            errLogToConsole: true
        }))
        .pipe(gulp.dest('./www/css/'))
        .pipe(minifyCss({
            keepSpecialComments: 0
        }))
        .pipe(rename({
            extname: '.min.css'
        }))
        .pipe(gulp.dest('./www/css/'))
        .on('end', done);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, ['sass']);
    gulp.watch(paths.js, ['babel']);
});

gulp.task('install', ['git-check'], function () {
    return bower.commands.install()
        .on('log', function (data) {
            gutil.log('bower', gutil.colors.cyan(data.id), data.message);
        });
});

gulp.task('manifest', function () {
    gulp.src(['www/css/*', 'www/img/*', 'www/icons/*', 'www/js/*', 'www/*', 'www/templates/*',
        'wwww/lib/ionic/js/ionic.bundle.js',
        'www/lib/ionic-timepicker/dist/*',
        'www/lib/moment/min/moment.min.js',
        'www/lib/lodash/lodash.min.js',
        'www/lib/firebase/firebase.js'
    ])
        .pipe(manifest({
            hash: true,
            preferOnline: true,
            network: ['http://*', 'https://*', '*'],
            filename: 'app.manifest',
            exclude: 'app.manifest'
        }))
        .pipe(gulp.dest('www'));
});

gulp.task('git-check', function (done) {
    if (!sh.which('git')) {
        console.log(
            '  ' + gutil.colors.red('Git is not installed.'),
            '\n  Git, the version control system, is required to download Ionic.',
            '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
            '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
        );
        process.exit(1);
    }
    done();
});