// Ionic Starter App


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
    })
    .directive('standardTimeMeridian', function () {
        return {
            restrict: 'AE',
            replace: true,
            scope: {
                etime: '=etime'
            },
            template: '<strong>{{stime}}</strong>',
            link: function (scope) {

                function epochParser(val, opType) {
                    if (val === null) {
                        return '00:00';
                    } else {
                        let meridian = ['AM', 'PM'];

                        if (opType === 'time') {
                            let hours = parseInt(val / 3600);
                            let minutes = (val / 60) % 60;
                            let hoursRes = hours > 12 ? (hours - 12) : hours;

                            let currentMeridian = meridian[parseInt(hours / 12)];

                            return (prependZero(hoursRes) + ':' + prependZero(minutes) + ' ' + currentMeridian);
                        }
                    }
                }

                scope.stime = epochParser(scope.etime, 'time');

                function prependZero(param) {
                    if (String(param).length < 2) {
                        return '0' + String(param);
                    }
                    return param;
                }


                scope.$watch('etime', function () {
                    scope.stime = epochParser(scope.etime, 'time');
                });

            }
        };
    });
