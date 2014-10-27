var gulp    = require('gulp');
var fs      = require('fs');
var plugins = require('gulp-load-plugins')();
var es      = require('event-stream');
var del     = require('del');

var handlebarOpts = {
  helpers: {
        assetPath: function (path, context) {
            return context.data.root[path];
        }
    }
};

var publicFolderPath = '../public';

var paths = {
  appJavascript:     ['app/js/app.js', 'app/js/**/*.js'],
  appTemplates:      'app/js/**/*.tpl.html',
  appMainSass:       'app/scss/main.scss',
  appStyles:         'app/scss/**/*.scss',
  appImages:         'app/images/**/*',
  indexHbs:          'app/index.hbs',
  vendorJavascript:  ['vendor/js/angular.js', 'vendor/js/**/*.js'],
  vendorCss:         ['vendor/css/**/*.css'],
  finalAppJsPath:    '/js/app.js',
  finalAppCssPath:   '/css/app.css',
  specFolder:        ['spec/**/*_spec.js'],
  publicFolder:      publicFolderPath,
  publicJavascript:  publicFolderPath + '/js',
  publicAppJs:       publicFolderPath + '/js/app.js',
  publicCss:         publicFolderPath + '/css',
  publicImages:      publicFolderPath + '/images',
  publicIndex:       publicFolderPath + '/index.html',
  publicJsManifest:  publicFolderPath + '/js/rev-manifest.json',
  publicCssManifest: publicFolderPath + '/css/rev-manifest.json'
};

gulp.task('scripts-dev', function() {
  return gulp.src(paths.vendorJavascript.concat(paths.appJavascript, paths.appTemplates))
    .pipe(plugins.if(/html$/, buildTemplates()))
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('app.js'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest(paths.publicJavascript));
});
gulp.task('scripts-prod', function() {
  return gulp.src(paths.vendorJavascript.concat(paths.appJavascript, paths.appTemplates))
    .pipe(plugins.if(/html$/, buildTemplates()))
    .pipe(plugins.concat('app.js'))
    .pipe(plugins.ngAnnotate())
    .pipe(plugins.uglify())
    .pipe(plugins.rev())
    .pipe(gulp.dest(paths.publicJavascript))
    .pipe(plugins.rev.manifest({path: 'rev-manifest.json'}))
    .pipe(gulp.dest(paths.publicJavascript));
});

gulp.task('styles-dev', function() {
  return gulp.src(paths.vendorCss.concat(paths.appMainSass))
    .pipe(plugins.if(/scss$/, plugins.sass()))
    .pipe(plugins.concat('app.css'))
    .pipe(gulp.dest(paths.publicCss));
});

gulp.task('styles-prod', function() {
  return gulp.src(paths.vendorCss.concat(paths.appMainSass))
    .pipe(plugins.if(/scss$/, plugins.sass()))
    .pipe(plugins.concat('app.css'))
    .pipe(plugins.minifyCss())
    .pipe(plugins.rev())
    .pipe(gulp.dest(paths.publicCss))
    .pipe(plugins.rev.manifest({path: 'rev-manifest.json'}))
    .pipe(gulp.dest(paths.publicCss));
});

gulp.task('images', function() {
  return gulp.src(paths.appImages)
    .pipe(gulp.dest(paths.publicImages));
});

gulp.task('indexHtml-dev', ['scripts-dev', 'styles-dev'], function() {
  var manifest = {};

  manifest[paths.finalAppJsPath]  = paths.finalAppJsPath;
  manifest[paths.finalAppCssPath] = paths.finalAppCssPath;

  return gulp.src(paths.indexHbs)
    .pipe(plugins.compileHandlebars(manifest, handlebarOpts))
    .pipe(plugins.rename('index.html'))
    .pipe(gulp.dest(paths.publicFolder));
});

gulp.task('indexHtml-prod', ['scripts-prod', 'styles-prod'], function() {
  var jsManifest  = JSON.parse(fs.readFileSync(paths.publicJsManifest, 'utf8'));
  var cssManifest = JSON.parse(fs.readFileSync(paths.publicCssManifest, 'utf8'));

  var manifest = {};

  manifest[paths.finalAppJsPath]  = jsManifest['app.js'];
  manifest[paths.finalAppCssPath] = cssManifest['app.css'];

  return gulp.src(paths.indexHbs)
    .pipe(plugins.compileHandlebars(manifest, handlebarOpts))
    .pipe(plugins.rename('index.html'))
    .pipe(gulp.dest(paths.publicFolder));
});

gulp.task('lint', function() {
  return gulp.src(paths.appJavascript.concat(paths.specFolder))
    .pipe(plugins.jshint())
    .pipe(plugins.jshint.reporter('jshint-stylish'));
});

gulp.task('testem', function() {
  return gulp.src(['']) // We don't need files, that is managed on testem.json
    .pipe(plugins.testem({
      configFile: 'testem.json'
    }));
});

gulp.task('clean', function(cb) {
  del([paths.publicJavascript, paths.publicImages, paths.publicCss, paths.publicIndex], {force: true}, cb);
});

gulp.task('watch', ['indexHtml-dev', 'images'], function() {
  gulp.watch(paths.appJavascript, ['lint', 'scripts']);
  gulp.watch(paths.appTemplates, ['scripts']);
  gulp.watch(paths.vendorJavascript, ['scripts']);
  gulp.watch(paths.appImages, ['images']);
  gulp.watch(paths.specFolder, ['lint']);
  gulp.watch(paths.indexHtml, ['indexHtml']);
  gulp.watch(paths.appStyles, ['styles']);
  gulp.watch(paths.vendorCss, ['styles']);
});

gulp.task('default', ['watch']);
gulp.task('production', ['scripts-prod', 'styles-prod', 'images', 'indexHtml-prod']);

function buildTemplates() {
  return es.pipeline(
    plugins.minifyHtml({
      empty: true,
      spare: true,
      quotes: true
    }),
    plugins.angularTemplatecache({
      module: 'app'
    })
  );
}
