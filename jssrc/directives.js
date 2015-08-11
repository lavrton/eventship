angular.module('mie')
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
