/* @flow */

angular.module('mie.controllers', ['mie.events', 'mie.settings'])
    .controller('AppCtrl', ['$scope', '$location', '$ionicModal', '$rootScope',
        function ($scope, $location, $ionicModal, $rootScope) {
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
                $scope.modal.hide();
            };

            // Open the login modal
            $scope.login = function () {
                $scope.modal.show();
            };


            function redir(provider) {
                ref.authWithOAuthRedirect(provider, function (error, authData) {
                    if (error) {
                        console.log('Login Failed!', error);
                    } else {

                        console.log('Authenticated successfully with payload:', authData);
                        $rootScope.user = $scope.user = authData;
                        $location.path('/events');
                    }
                });
            }
            // Perform the login action when the user submits the login form
            $scope.doLogin = function (provider) {
                redir(provider);
            };

            ref.onAuth(function (authData) {
                //$scope.closeLogin();
                if (authData && $scope.modal) {
                    $scope.closeLogin();
                    $rootScope.user = $scope.user = authData;
                    $location.path('/events');
                }

            });
        }
    ])
    .controller('EventsCtrl', ['$scope', 'Events', 'beautifyDate', '$ionicLoading', '$rootScope',
        function ($scope, Events, beautifyDate, $ionicLoading, $rootScope) {

            function start() {
                if (!$rootScope.user) {
                    return;
                }
                $scope.loadingIndicator = $ionicLoading.show({
                    scope: $scope
                });
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
                console.log('type', $scope.unsubmitType);
            }
            update();

            Events.onUpdate(_.debounce(() => {
                update();
                $scope.$apply();
            }, 500));

            $rootScope.$watch('user', () => {
                start();
            });


            $scope.createDayEvent = function (event) {
                Events.submitDayEvent(event.title, event.score);

                // reset form
                event.title = '';
                event.score = 2;

                update();
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
            console.log($scope.variants);
            $scope.selectedEvent = {
                id: $scope.event.selectedChildId
            };
        }

        $scope.$watch('selectedEvent.id', () => {
            let selectedDayId = $scope.selectedEvent.id;
            if (!selectedDayId) {
                return;
            }
            if (type === 'day') {
                return;
            }
            Events.updateNestedEvent(type, $scope.event.id, selectedDayId);
            console.log('update', selectedDayId);
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