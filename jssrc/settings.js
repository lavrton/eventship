angular.module('mie.settings', ['mie.store'])
    .factory('settings', ['store', (store) => {
        var Settings = {
            notificationTime: (time) => {
                if (time) { // setter
                    store.setting('notificationTime', time);
                } else {  // getter
                    return store.setting('notificationTime').then((t) => {
                        if (!t || !parseInt(t)) {
                            t = 75600;
                        }
                        return t;
                    });
                }
            },
            startDate: (date) => {
                if (date) {
                    store.setting('startDate', new Date(date).toString());
                } else {
                    return store.setting('startDate').then((dd) => {
                        let d = new Date(dd);
                        let isDateWrong = !d || isNaN(new Date(d).getYear()) || new Date(d).getFullYear() < 2012;
                        if (isDateWrong) {
                            d = new Date();
                            d.setDate(d.getDate() - 4);
                        }
                        return d;
                    });
                }
            }
        };
        return Settings;
    }])
    .controller('SettingsCtrl', ['$scope', 'settings', 'Events', function ($scope, settings, Events) {
        $scope.settings = {
            notificationTime: 0,
            startDate: new Date(),
            format: 12
        };

        settings.notificationTime().then((time) => {
            $scope.settings.notificationTime = time;
            $scope.$apply();
        });

        settings.startDate().then((date) => {
            console.log('from server', date);
            $scope.settings.startDate = date;
            $scope.$apply();
        });

        $scope.isApp = !!window.cordova;


        $scope.$watch('settings.notificationTime', function (newValue) {
            settings.notificationTime(newValue);
        });

        $scope.$watch('settings.startDate', function (newValue) {
            if (newValue.toDateString() === new Date().toDateString()) {
                return;
            }
            settings.startDate(newValue);
            Events._setStartDate(newValue);
        });

        $scope.logout = () => {
            var ref = new Firebase("https://incandescent-fire-1476.firebaseio.com/");
            ref.unauth();
            location.reload();
        };
    }]);
