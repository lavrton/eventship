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
var gulpCopy = require('gulp-copy');
var shell = require('gulp-shell');
var replace = require('gulp-replace');
var rimraf = require('rimraf');

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


var wwwFiles = ['www/css/*', 'www/img/*', 'www/icons/*', 'www/js/*', 'www/*', 'www/templates/*',

    'www/lib/ionic/js/ionic.bundle.min.js',
    'www/lib/ionic/fonts/ionicons.woff',
    'www/lib/ionic/fonts/ionicons.ttf',

    'www/lib/ionic-timepicker/dist/style.css',
    'www/lib/ionic-timepicker/dist/templates.js',
    'www/lib/ionic-timepicker/dist/ionic-timepicker.js',


    'www/lib/moment/min/moment.min.js',
    'www/lib/lodash/lodash.min.js',
    'www/lib/firebase/firebase.js'
];

var www_build = 'www_build';

gulp.task('clean_build', function (cb) {
    rimraf(www_build + '/', cb);
});

gulp.task('copy_www', ['clean_build'], function () {
    return gulp.src(wwwFiles.concat('firebase.json'))
        .pipe(gulpCopy(www_build, {
            prefix: 1
        }));
});

gulp.task('deploy_firebase', ['copy_www', 'manifest', 'replace_index_manifest'], shell.task([
    'firebase deploy'
], {
    cwd: './' + www_build
}));

gulp.task('deploy', ['deploy_firebase']);

gulp.task('manifest', ['copy_www'], function () {
    return gulp.src(www_build + '/**/*')
        .pipe(manifest({
            hash: true,
            preferOnline: true,
            network: ['http://*', 'https://*', '*'],
            filename: 'app.manifest',
            exclude: ['app.manifest', 'firebase.json']
        }))
        .pipe(gulp.dest(www_build));
});

gulp.task('replace_index_manifest', ['copy_www'], function (cb) {
    var input = './' + 'www' + '/index.html';
    var output = '' + www_build + '/index.html'

    rimraf(output, function () {
        gulp.src(input)
            .pipe(replace('<html>', '<html manifest="app.manifest">'))
            .pipe(gulp.dest(www_build))
            .on('end', cb);
    });
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