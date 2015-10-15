// EventShip Starter App


// angular.module is a global place for creating, registering
// and retrieving Angular modules
angular.module('mie', ['ionic', 'mie.controllers', 'ionic-timepicker'])
    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                window.cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                // org.apache.cordova.statusbar required
                window.StatusBar.styleDefault();
            }

            let loading = document.getElementById('loading');
            document.body.removeChild(loading);
        });
    })

    .config(function ($stateProvider, $urlRouterProvider, $provide) {
        $stateProvider

            .state('app', {
                url: '/app',
                abstract: true,
                templateUrl: 'templates/menu.html',
                controller: 'AppCtrl'
            })

            .state('app.events', {
                url: '/events',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/events.html',
                        controller: 'EventsCtrl'
                    }
                }
            })

            .state('app.single', {
                url: '/events/:type/:id',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/event.html',
                        controller: 'EventCtrl'
                    }
                }
            })

            .state('app.settings', {
                url: '/settings',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/settings.html',
                        controller: 'SettingsCtrl'
                    }
                }
            });
        // if none of the above states are matched, use this as the fallback
        $urlRouterProvider.otherwise('/app/events');

        // exception handler
        $provide.decorator('$exceptionHandler', ['$delegate', function($delegate) {
            return function (exception, cause) {
                let isProduction = (location.href.indexOf('localhost') === -1);
                if (isProduction) {
                    window.Rollbar.error(exception);
                }
                $delegate(exception, cause);
            };
        }]);
    });

function onUpdateReady() {
    if (confirm('New version is ready. Update?')) {
        window.location.reload();
    }
}


function checkUpdates() {
    let cache = window.applicationCache;
    if (!cache) {
        return;
    }
    if (cache.status === cache.UPDATEREADY) {
        onUpdateReady();
    }
    cache.addEventListener('updateready', onUpdateReady);
}


checkUpdates();
