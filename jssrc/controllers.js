// FIRST APP OPENING CONTROLLER
// LOGIN CHECK
// SOME NEW EXTRA TIPS AND TOUR

angular.module('mie.controllers', ['mie.events', 'mie.settings'])
    .controller('AppCtrl', ['$scope', '$location', '$ionicModal', '$rootScope', '$ionicSlideBoxDelegate',
        function ($scope, $location, $ionicModal, $rootScope, $ionicSlideBoxDelegate) {
            // Create the login modal that we will use later
            let ref = new Firebase('https://incandescent-fire-1476.firebaseio.com/app');
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
                $rootScope.guest = true;
            };

            // Open the login modal
            $scope.login = function () {
                $scope.modal.show();
            };

            function onAuth(authData) {
                if (!authData) {
                    throw "Empty auth data";
                }
                $rootScope.user = $scope.user = authData;
                localStorage.setItem('logged', 'true');
                $location.path('/events');
            }
            function redir(provider) {
                ref.authWithOAuthPopup(provider, function(error, authData) {
                    if (error) {
                        if (error.code === "TRANSPORT_UNAVAILABLE") {
                            // fall-back to browser redirects, and pick up the session
                            // automatically when we come back to the origin page
                            ref.authWithOAuthRedirect(provider, function(err, authData) {
                                if (err) {
                                    Rollbar.error(err);
                                } else {
                                    onAuth(authData);
                                }
                            });
                        } else {
                            Rollbar.error(error);
                        }
                    } if (authData) {
                        onAuth(authData);
                    }
                });
            }

            // Perform the login action when the user submits the login form
            $scope.doLogin = function (provider) {
                redir(provider);
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
                $scope.tour = tour;
                //tour.show();
            });

            // Triggered in the login modal to close it
            $scope.closeTour = function () {
                if ($scope.tour) {
                    $scope.tour.hide();
                }
            };
        }
    ])


    // MAIN PAGE WITH SUBMIT FORM AND LIST
    .controller('EventsCtrl', ['$scope', 'Events', 'beautifyDate', '$ionicLoading', '$rootScope',
        function ($scope, Events, beautifyDate, $ionicLoading, $rootScope) {

            function start() {
                let isLogged = localStorage.getItem('logged');
                // if (isLogged) {
                //     $scope.loadingIndicator = $ionicLoading.show({
                //         scope: $scope
                //     });
                // }
                if (!isLogged && !$rootScope.guest) {
                    return;
                }

                Events.load(() => {
                    update();
                    $ionicLoading.hide();
                    $scope.$apply();
                });
            }

            start();


            $scope.beautifyDate = beautifyDate;
            $scope.selectedEvent = {};

            function update() {
                $scope.unsubmitType = Events.getUnsubmitType();
                $scope.submitDone = Events.isSubmitDone();
                $scope.event = Events.getUnsubmitNestedEvent();
                $scope.lastEventDate = Events.getUnsubmitDate();
                $scope.unsubmitVariants = Events.getNestedEventVariants();
                $scope.combinedEventsList = Events.getCombinedList();

                if (!$scope.submitDone && $scope.unsubmitType !== 'day' && $scope.unsubmitVariants.length === 1) {
                    Events.submitNestedEvent($scope.event.type, $scope.unsubmitVariants[0].id);
                }
            }
            update();

            Events.onUpdate(_.debounce(() => {
                update();
                $scope.$apply();
            }, 500));

            $rootScope.$watch('user', () => {
                start();
            });

            $rootScope.$watch('guest', () => {
                start();
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
                    'Good day! What you was doing?',
                    'AWESOME?! What you did or made?'
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

        if (!$scope.event) {
            $location.path('/events');
            return;
        }
        if (type !== 'day') {
            $scope.variants = Events.getNestedEventVariants(type, id);
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

        //throw new Error('Test Error');

        $scope.$watchGroup(['event.title', 'event.score'], () => {
            if (type !== 'day') {
                return;
            }
            Events.updateDayEvent(id, $scope.event.title, $scope.event.score);
        });
    }
]);
