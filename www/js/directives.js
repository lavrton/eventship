'use strict';

angular.module('mie').directive('standardTimeMeridian', function () {
    return {
        restrict: 'AE',
        replace: true,
        scope: {
            etime: '=etime'
        },
        template: '<strong>{{stime}}</strong>',
        link: function link(scope) {

            function epochParser(val, opType) {
                if (val === null) {
                    return '00:00';
                } else {
                    var meridian = ['AM', 'PM'];

                    if (opType === 'time') {
                        var hours = parseInt(val / 3600);
                        var minutes = val / 60 % 60;
                        var hoursRes = hours > 12 ? hours - 12 : hours;

                        var currentMeridian = meridian[parseInt(hours / 12)];

                        return prependZero(hoursRes) + ':' + prependZero(minutes) + ' ' + currentMeridian;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRpcmVjdGl2ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUNoQixTQUFTLENBQUMsc0JBQXNCLEVBQUUsWUFBWTtBQUMvQyxXQUFPO0FBQ0gsZ0JBQVEsRUFBRSxJQUFJO0FBQ2QsZUFBTyxFQUFFLElBQUk7QUFDYixhQUFLLEVBQUU7QUFDSCxpQkFBSyxFQUFFLFFBQVE7U0FDbEI7QUFDRCxnQkFBUSxFQUFFLDRCQUE0QjtBQUN0QyxZQUFJLEVBQUUsY0FBVSxLQUFLLEVBQUU7O0FBRW5CLHFCQUFTLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFO0FBQzlCLG9CQUFJLEdBQUcsS0FBSyxJQUFJLEVBQUU7QUFDZCwyQkFBTyxPQUFPLENBQUM7aUJBQ2xCLE1BQU07QUFDSCx3QkFBSSxRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7O0FBRTVCLHdCQUFJLE1BQU0sS0FBSyxNQUFNLEVBQUU7QUFDbkIsNEJBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDakMsNEJBQUksT0FBTyxHQUFHLEFBQUMsR0FBRyxHQUFHLEVBQUUsR0FBSSxFQUFFLENBQUM7QUFDOUIsNEJBQUksUUFBUSxHQUFHLEtBQUssR0FBRyxFQUFFLEdBQUksS0FBSyxHQUFHLEVBQUUsR0FBSSxLQUFLLENBQUM7O0FBRWpELDRCQUFJLGVBQWUsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztBQUVyRCwrQkFBUSxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLEdBQUcsZUFBZSxDQUFFO3FCQUN2RjtpQkFDSjthQUNKOztBQUVELGlCQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDOztBQUUvQyxxQkFBUyxXQUFXLENBQUMsS0FBSyxFQUFFO0FBQ3hCLG9CQUFJLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO0FBQzFCLDJCQUFPLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7aUJBQzlCO0FBQ0QsdUJBQU8sS0FBSyxDQUFDO2FBQ2hCOztBQUdELGlCQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxZQUFZO0FBQzlCLHFCQUFLLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ2xELENBQUMsQ0FBQztTQUVOO0tBQ0osQ0FBQztDQUNMLENBQUMsQ0FBQyIsImZpbGUiOiJkaXJlY3RpdmVzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiYW5ndWxhci5tb2R1bGUoJ21pZScpXG4gICAgLmRpcmVjdGl2ZSgnc3RhbmRhcmRUaW1lTWVyaWRpYW4nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgICAgIHJlcGxhY2U6IHRydWUsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgICBldGltZTogJz1ldGltZSdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGU6ICc8c3Ryb25nPnt7c3RpbWV9fTwvc3Ryb25nPicsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBlcG9jaFBhcnNlcih2YWwsIG9wVHlwZSkge1xuICAgICAgICAgICAgICAgIGlmICh2YWwgPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICcwMDowMCc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1lcmlkaWFuID0gWydBTScsICdQTSddO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcFR5cGUgPT09ICd0aW1lJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGhvdXJzID0gcGFyc2VJbnQodmFsIC8gMzYwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbWludXRlcyA9ICh2YWwgLyA2MCkgJSA2MDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBob3Vyc1JlcyA9IGhvdXJzID4gMTIgPyAoaG91cnMgLSAxMikgOiBob3VycztcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRNZXJpZGlhbiA9IG1lcmlkaWFuW3BhcnNlSW50KGhvdXJzIC8gMTIpXTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIChwcmVwZW5kWmVybyhob3Vyc1JlcykgKyAnOicgKyBwcmVwZW5kWmVybyhtaW51dGVzKSArICcgJyArIGN1cnJlbnRNZXJpZGlhbik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLnN0aW1lID0gZXBvY2hQYXJzZXIoc2NvcGUuZXRpbWUsICd0aW1lJyk7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHByZXBlbmRaZXJvKHBhcmFtKSB7XG4gICAgICAgICAgICAgICAgaWYgKFN0cmluZyhwYXJhbSkubGVuZ3RoIDwgMikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzAnICsgU3RyaW5nKHBhcmFtKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtO1xuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHNjb3BlLiR3YXRjaCgnZXRpbWUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUuc3RpbWUgPSBlcG9jaFBhcnNlcihzY29wZS5ldGltZSwgJ3RpbWUnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH1cbiAgICB9O1xufSk7XG4iXSwic291cmNlUm9vdCI6Ii4uLy4uL2pzc3JjIn0=