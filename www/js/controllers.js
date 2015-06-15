/* @flow */

'use strict';

angular.module('mie.controllers', ['mie.events', 'mie.settings']).controller('AppCtrl', ['$scope', '$location', '$ionicModal', '$rootScope', function ($scope, $location, $ionicModal, $rootScope) {
    // Create the login modal that we will use later
    var ref = new Firebase('https://incandescent-fire-1476.firebaseio.com/');
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
}]).controller('EventsCtrl', ['$scope', 'Events', 'beautifyDate', '$ionicLoading', '$rootScope', function ($scope, Events, beautifyDate, $ionicLoading, $rootScope) {

    function start() {
        if (!$rootScope.user) {
            return;
        }
        $scope.loadingIndicator = $ionicLoading.show({
            scope: $scope
        });
        Events.load(function () {
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

    Events.onUpdate(_.debounce(function () {
        update();
        $scope.$apply();
    }, 500));

    $rootScope.$watch('user', function () {
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
        var selectedDayId = $scope.selectedEvent.id;
        Events.submitNestedEvent($scope.event.type, selectedDayId);

        // reset form
        $scope.selectedEvent = {};

        update();
    };
}]).controller('EventCtrl', ['$scope', '$stateParams', '$location', 'Events', 'beautifyDate', function ($scope, $stateParams, $location, Events, beautifyDate) {
    $scope.beautifyDate = beautifyDate;

    var id = $stateParams.id;
    var type = $stateParams.type;
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

    $scope.$watch('selectedEvent.id', function () {
        var selectedDayId = $scope.selectedEvent.id;
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

    $scope.$watchGroup(['event.title', 'event.score'], function () {
        if (type !== 'day') {
            return;
        }
        Events.updateDayEvent(id, $scope.event.title, $scope.event.score);
    });
}]);
//# sourceMappingURL=data:application/json;base64,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QUFDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQ3JFLENBQUMsQ0FBQztDQUNOLENBQ0osQ0FBQyxDQUFDIiwiZmlsZSI6ImNvbnRyb2xsZXJzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQGZsb3cgKi9cblxuYW5ndWxhci5tb2R1bGUoJ21pZS5jb250cm9sbGVycycsIFsnbWllLmV2ZW50cycsICdtaWUuc2V0dGluZ3MnXSlcbiAgICAuY29udHJvbGxlcignQXBwQ3RybCcsIFsnJHNjb3BlJywgJyRsb2NhdGlvbicsICckaW9uaWNNb2RhbCcsICckcm9vdFNjb3BlJyxcbiAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgJGxvY2F0aW9uLCAkaW9uaWNNb2RhbCwgJHJvb3RTY29wZSkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBsb2dpbiBtb2RhbCB0aGF0IHdlIHdpbGwgdXNlIGxhdGVyXG4gICAgICAgICAgICBsZXQgcmVmID0gbmV3IEZpcmViYXNlKCdodHRwczovL2luY2FuZGVzY2VudC1maXJlLTE0NzYuZmlyZWJhc2Vpby5jb20vJyk7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLnVzZXIgPSAkc2NvcGUudXNlciA9IHJlZi5nZXRBdXRoKCk7XG5cbiAgICAgICAgICAgICRpb25pY01vZGFsLmZyb21UZW1wbGF0ZVVybCgndGVtcGxhdGVzL2xvZ2luLmh0bWwnLCB7XG4gICAgICAgICAgICAgICAgc2NvcGU6ICRzY29wZVxuICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAobW9kYWwpIHtcbiAgICAgICAgICAgICAgICAkc2NvcGUubW9kYWwgPSBtb2RhbDtcbiAgICAgICAgICAgICAgICBpZiAoJHJvb3RTY29wZS51c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5wYXRoKCcvZXZlbnRzJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmxvZ2luKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFRyaWdnZXJlZCBpbiB0aGUgbG9naW4gbW9kYWwgdG8gY2xvc2UgaXRcbiAgICAgICAgICAgICRzY29wZS5jbG9zZUxvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5tb2RhbC5oaWRlKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBPcGVuIHRoZSBsb2dpbiBtb2RhbFxuICAgICAgICAgICAgJHNjb3BlLmxvZ2luID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5tb2RhbC5zaG93KCk7XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlZGlyKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgcmVmLmF1dGhXaXRoT0F1dGhSZWRpcmVjdChwcm92aWRlciwgZnVuY3Rpb24gKGVycm9yLCBhdXRoRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdMb2dpbiBGYWlsZWQhJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQXV0aGVudGljYXRlZCBzdWNjZXNzZnVsbHkgd2l0aCBwYXlsb2FkOicsIGF1dGhEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRyb290U2NvcGUudXNlciA9ICRzY29wZS51c2VyID0gYXV0aERhdGE7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24ucGF0aCgnL2V2ZW50cycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQZXJmb3JtIHRoZSBsb2dpbiBhY3Rpb24gd2hlbiB0aGUgdXNlciBzdWJtaXRzIHRoZSBsb2dpbiBmb3JtXG4gICAgICAgICAgICAkc2NvcGUuZG9Mb2dpbiA9IGZ1bmN0aW9uIChwcm92aWRlcikge1xuICAgICAgICAgICAgICAgIHJlZGlyKHByb3ZpZGVyKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJlZi5vbkF1dGgoZnVuY3Rpb24gKGF1dGhEYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8kc2NvcGUuY2xvc2VMb2dpbigpO1xuICAgICAgICAgICAgICAgIGlmIChhdXRoRGF0YSAmJiAkc2NvcGUubW9kYWwpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmNsb3NlTG9naW4oKTtcbiAgICAgICAgICAgICAgICAgICAgJHJvb3RTY29wZS51c2VyID0gJHNjb3BlLnVzZXIgPSBhdXRoRGF0YTtcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9ldmVudHMnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgXSlcbiAgICAuY29udHJvbGxlcignRXZlbnRzQ3RybCcsIFsnJHNjb3BlJywgJ0V2ZW50cycsICdiZWF1dGlmeURhdGUnLCAnJGlvbmljTG9hZGluZycsICckcm9vdFNjb3BlJyxcbiAgICAgICAgZnVuY3Rpb24gKCRzY29wZSwgRXZlbnRzLCBiZWF1dGlmeURhdGUsICRpb25pY0xvYWRpbmcsICRyb290U2NvcGUpIHtcblxuICAgICAgICAgICAgZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCEkcm9vdFNjb3BlLnVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkc2NvcGUubG9hZGluZ0luZGljYXRvciA9ICRpb25pY0xvYWRpbmcuc2hvdyh7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlOiAkc2NvcGVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBFdmVudHMubG9hZCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAkaW9uaWNMb2FkaW5nLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLiRhcHBseSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RhcnQoKTtcblxuXG4gICAgICAgICAgICAkc2NvcGUuYmVhdXRpZnlEYXRlID0gYmVhdXRpZnlEYXRlO1xuICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkRXZlbnQgPSB7fTtcblxuICAgICAgICAgICAgZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgICAgICAgICAgICAgICRzY29wZS51bnN1Ym1pdFR5cGUgPSBFdmVudHMuZ2V0VW5zdWJtaXRUeXBlKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN1Ym1pdERvbmUgPSBFdmVudHMuaXNTdWJtaXREb25lKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmV2ZW50ID0gRXZlbnRzLmdldFVuc3VibWl0TmVzdGVkRXZlbnQoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUubGFzdEV2ZW50RGF0ZSA9IEV2ZW50cy5nZXRVbnN1Ym1pdERhdGUoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUudW5zdWJtaXRWYXJpYW50cyA9IEV2ZW50cy5nZXROZXN0ZWRFdmVudFZhcmlhbnRzKCk7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmNvbWJpbmVkRXZlbnRzTGlzdCA9IEV2ZW50cy5nZXRDb21iaW5lZExpc3QoKTtcblxuICAgICAgICAgICAgICAgIGlmICghJHNjb3BlLnN1Ym1pdERvbmUgJiYgJHNjb3BlLnVuc3VibWl0VHlwZSAhPT0gJ2RheScgJiYgJHNjb3BlLnVuc3VibWl0VmFyaWFudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIEV2ZW50cy5zdWJtaXROZXN0ZWRFdmVudCgkc2NvcGUuZXZlbnQudHlwZSwgJHNjb3BlLnVuc3VibWl0VmFyaWFudHNbMF0uaWQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygndHlwZScsICRzY29wZS51bnN1Ym1pdFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdXBkYXRlKCk7XG5cbiAgICAgICAgICAgIEV2ZW50cy5vblVwZGF0ZShfLmRlYm91bmNlKCgpID0+IHtcbiAgICAgICAgICAgICAgICB1cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAkc2NvcGUuJGFwcGx5KCk7XG4gICAgICAgICAgICB9LCA1MDApKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kd2F0Y2goJ3VzZXInLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RhcnQoKTtcbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICRzY29wZS5jcmVhdGVEYXlFdmVudCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIEV2ZW50cy5zdWJtaXREYXlFdmVudChldmVudC50aXRsZSwgZXZlbnQuc2NvcmUpO1xuXG4gICAgICAgICAgICAgICAgLy8gcmVzZXQgZm9ybVxuICAgICAgICAgICAgICAgIGV2ZW50LnRpdGxlID0gJyc7XG4gICAgICAgICAgICAgICAgZXZlbnQuc2NvcmUgPSAyO1xuXG4gICAgICAgICAgICAgICAgdXBkYXRlKCk7XG4gICAgICAgICAgICB9O1xuXG5cbiAgICAgICAgICAgICRzY29wZS5jcmVhdGVOZXN0ZWRFdmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgc2VsZWN0ZWREYXlJZCA9ICRzY29wZS5zZWxlY3RlZEV2ZW50LmlkO1xuICAgICAgICAgICAgICAgIEV2ZW50cy5zdWJtaXROZXN0ZWRFdmVudCgkc2NvcGUuZXZlbnQudHlwZSwgc2VsZWN0ZWREYXlJZCk7XG5cbiAgICAgICAgICAgICAgICAvLyByZXNldCBmb3JtXG4gICAgICAgICAgICAgICAgJHNjb3BlLnNlbGVjdGVkRXZlbnQgPSB7fTtcblxuICAgICAgICAgICAgICAgIHVwZGF0ZSgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIF0pXG5cbi5jb250cm9sbGVyKCdFdmVudEN0cmwnLCBbJyRzY29wZScsICckc3RhdGVQYXJhbXMnLCAnJGxvY2F0aW9uJywgJ0V2ZW50cycsICdiZWF1dGlmeURhdGUnLFxuICAgIGZ1bmN0aW9uICgkc2NvcGUsICRzdGF0ZVBhcmFtcywgJGxvY2F0aW9uLCBFdmVudHMsIGJlYXV0aWZ5RGF0ZSkge1xuICAgICAgICAkc2NvcGUuYmVhdXRpZnlEYXRlID0gYmVhdXRpZnlEYXRlO1xuXG4gICAgICAgIGxldCBpZCA9ICRzdGF0ZVBhcmFtcy5pZDtcbiAgICAgICAgbGV0IHR5cGUgPSAkc3RhdGVQYXJhbXMudHlwZTtcbiAgICAgICAgJHNjb3BlLmV2ZW50ID0gRXZlbnRzLmdldEV2ZW50KHR5cGUsIGlkKTtcblxuICAgICAgICBpZiAoISRzY29wZS5ldmVudCkge1xuICAgICAgICAgICAgJGxvY2F0aW9uLnBhdGgoJy9ldmVudHMnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSAhPT0gJ2RheScpIHtcbiAgICAgICAgICAgICRzY29wZS52YXJpYW50cyA9IEV2ZW50cy5nZXROZXN0ZWRFdmVudFZhcmlhbnRzKHR5cGUsIGlkKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS52YXJpYW50cyk7XG4gICAgICAgICAgICAkc2NvcGUuc2VsZWN0ZWRFdmVudCA9IHtcbiAgICAgICAgICAgICAgICBpZDogJHNjb3BlLmV2ZW50LnNlbGVjdGVkQ2hpbGRJZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgICRzY29wZS4kd2F0Y2goJ3NlbGVjdGVkRXZlbnQuaWQnLCAoKSA9PiB7XG4gICAgICAgICAgICBsZXQgc2VsZWN0ZWREYXlJZCA9ICRzY29wZS5zZWxlY3RlZEV2ZW50LmlkO1xuICAgICAgICAgICAgaWYgKCFzZWxlY3RlZERheUlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkYXknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgRXZlbnRzLnVwZGF0ZU5lc3RlZEV2ZW50KHR5cGUsICRzY29wZS5ldmVudC5pZCwgc2VsZWN0ZWREYXlJZCk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygndXBkYXRlJywgc2VsZWN0ZWREYXlJZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vdGhyb3cgbmV3IEVycm9yKCdUZXN0IEVycm9yJyk7XG5cbiAgICAgICAgJHNjb3BlLiR3YXRjaEdyb3VwKFsnZXZlbnQudGl0bGUnLCAnZXZlbnQuc2NvcmUnXSwgKCkgPT4ge1xuICAgICAgICAgICAgaWYgKHR5cGUgIT09ICdkYXknKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgRXZlbnRzLnVwZGF0ZURheUV2ZW50KGlkLCAkc2NvcGUuZXZlbnQudGl0bGUsICRzY29wZS5ldmVudC5zY29yZSk7XG4gICAgICAgIH0pO1xuICAgIH1cbl0pOyJdLCJzb3VyY2VSb290IjoiLi4vLi4vanNzcmMifQ==