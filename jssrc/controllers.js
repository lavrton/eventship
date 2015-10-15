// FIRST APP OPENING CONTROLLER
// LOGIN CHECK
// SOME NEW EXTRA TIPS AND TOUR

angular.module('mie.controllers', ['mie.events', 'mie.settings'])
    .controller('AppCtrl', ['$scope', '$location', '$ionicModal', '$rootScope', '$ionicSlideBoxDelegate', '$ionicLoading',
        function ($scope, $location, $ionicModal, $rootScope, $ionicSlideBoxDelegate, $ionicLoading) {
            // Create the login modal that we will use later
            let ref = new Firebase('https://incandescent-fire-1476.firebaseio.com/');
            $rootScope.user = $scope.user = ref.getAuth();

            $ionicModal.fromTemplateUrl('templates/login.html', {
                scope: $scope
            }).then(function (modal) {
                $scope.modal = modal;
                if ($rootScope.user) {
                    $location.path('/events');
                } else {
                    $scope.login();
                }
            });



            // Triggered in the login modal to close it
            $scope.closeLogin = function () {
                if ($scope.modal) {
                    $scope.modal.hide();
                }
            };

            // Open the login modal
            $scope.login = function () {
                $scope.modal.show();
            };

            function onAuth(authData) {
                if (!authData) {
                    throw new Error('Empty auth data');
                }
                $rootScope.user = $scope.user = authData;


                localStorage.setItem('logged', 'true');
                $location.path('/events');
                $ionicLoading.hide();
                let provider = authData.provider;
                ref.child('users')
                    .child($rootScope.user.uid)
                    .child('user')
                    .set({
                        name: authData[provider].displayName
                    });
            }

            function redir(provider) {
                localStorage.setItem('provider', provider);
                ref.authWithOAuthRedirect(provider, function(err, authData) {
                    if (err) {
                        console.error(err);
                        window.Rollbar.error(err);
                    } else {
                        onAuth(authData);
                    }
                });
                
            }

            // this is FUCKING hack around firebase bug
            // when on auth callback is not firing after first success authWithOAuthRedirect()
            // my current version of firebase is 2.3.1
            // may be you are from future and bug is fixed?

            // So nice code, right?
            setTimeout(function() {
                if (location.hash.indexOf('firebase') >= 0 && !ref.getAuth()) {
                    $ionicLoading.show();
                    setTimeout(function() {
                        if (!ref.getAuth()) {
                            redir(localStorage.getItem('provider'));
                        }
                    }, 4000);
                }
            }, 2000);

            // Perform the login action when the user submits the login form
            $scope.doLogin = function (provider) {
                redir(provider);
            };
            // redir('facebook');

            $scope.enterAsGuest = function() {
                $scope.closeLogin();
                $rootScope.guest = true;
            };

            ref.onAuth(function (authData) {
                //$scope.closeLogin();
                if (authData) {
                    $scope.closeLogin();
                    onAuth(authData);
                }
            });


            $ionicModal.fromTemplateUrl('templates/tour.html', {
                scope: $scope
            }).then(function (tour) {
                $rootScope.tourModal = tour;
                $scope.tour = tour;
                if (!localStorage.getItem('tourShowed')) {
                    tour.show();
                }
            });

            // Triggered in the login modal to close it
            $scope.closeTour = function () {
                if ($scope.tour) {
                    $scope.tour.hide();
                    localStorage.setItem('tourShowed', 'true');
                    if (!$rootScope.user && !$rootScope.guest) {
                        $scope.login();
                    }
                }
            };
        }
    ])


    // MAIN PAGE WITH SUBMIT FORM AND LIST
    .controller('EventsCtrl', ['$scope', 'Events', 'beautifyDate', '$ionicLoading', '$rootScope',
        function ($scope, Events, beautifyDate, $ionicLoading, $rootScope) {

            let started = false;
            function start() {
                console.error($rootScope.user, $rootScope.guest);
                let isLogged = localStorage.getItem('logged');

                if (!isLogged && !$rootScope.guest) {
                    return;
                }
                $ionicLoading.show();

                started = true;
                Events.load(() => {
                    $ionicLoading.hide();
                    update();
                    $scope.$apply();
                });
            }

            start();


            $scope.beautifyDate = beautifyDate;
            $scope.selectedEvent = {};
            $scope.event = {};

            function update() {
                $scope.event = Events.getUnsubmitEvent();
                if (!$scope.event) {
                    return;
                }
                if ($scope.event.type !== 'day') {
                    $scope.unsubmitVariants = Events.getNestedEventValuesVariants($scope.event);
                } else {
                    $scope.unsubmitVariants = [];
                }

                $scope.combinedEventsList = Events.getCombinedList();
            }
            update();

            Events.onUpdate(_.debounce(() => {
                update();
                $scope.$apply();
            }, 500));

            $rootScope.$watch('user', () => {
                if ($rootScope.user && !started) {
                    start();
                }
            });

            $rootScope.$watch('guest', () => {
                if ($rootScope.guest && !started) {
                    start();
                }
            });


            $scope.createDayEvent = function (event) {
                Events.submitDayEvent(event.title, event.score);

                // reset form
                event.title = '';
                event.score = 2;

                update();
            };

            $scope.onScoreChange = function(event) {
                let placeholders = [
                    'Bad :(? ANYTHING interesting here?',
                    'Not really good? So type your event...',
                    'Good day! What was you doing?',
                    'AWESOME? What did you do or make?'
                ];
                event.placeholder = placeholders[event.score];
            };


            $scope.createNestedEvent = function () {
                let selectedDayId = $scope.selectedEvent.id;
                Events.submitNestedEvent($scope.event.type, selectedDayId);

                // reset form
                $scope.selectedEvent = {};

                update();
            };
        }
    ])


    // EDIT EVENT
    .controller('EventCtrl', ['$scope', '$stateParams', '$location', 'Events', 'beautifyDate',
    function ($scope, $stateParams, $location, Events, beautifyDate) {
        $scope.beautifyDate = beautifyDate;

        let id = $stateParams.id;
        let type = $stateParams.type;
        $scope.event = Events.getEvent(type, id);

        console.log($scope.event);

        if (!$scope.event) {
            $location.path('/events');
            return;
        }
        if (type !== 'day') {
            $scope.variants = Events.getNestedEventValuesVariants($scope.event);
            $scope.selectedEvent = {
                id: $scope.event.selectedChildId
            };
        }

        $scope.$watch('selectedEvent.id', () => {
            let selectedDayId = $scope.selectedEvent && $scope.selectedEvent.id;
            if (!selectedDayId) {
                return;
            }
            if (type === 'day') {
                return;
            }
            Events.updateNestedEvent(type, $scope.event.id, selectedDayId);
        });


        $scope.$watchGroup(['event.title', 'event.score'], () => {
            if (type !== 'day') {
                return;
            }
            Events.updateDayEvent(id, $scope.event.title, $scope.event.score);
        });
    }
]);
