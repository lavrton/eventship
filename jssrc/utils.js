angular.module('mie.utils', [])
    .factory('utils', () => {
        var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g, pad = function (val_, len_) {
            var val = String(val_);
            var len = len_ || 2;
            while (val.length < len) {
                val = '0' + val;
            }
            return val;
        };
        var dateFormat = function (date, mask) {
            if (!date) {
                throw SyntaxError('invalid date');
            }
            // Allow setting the utc argument via the mask
            if (mask.slice(0, 4) === 'UTC:') {
                mask = mask.slice(4);
            }
            var d = date.getDate(), m = date.getMonth(), y = date.getFullYear(), flags = {
                dd: pad(d),
                mm: pad(m + 1),
                yyyy: y
            };
            return mask.replace(token, function ($0) {
                return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
            });
        };

        function formatDate(date, mask) {
            return dateFormat(date, mask);
        }


        let cache = {};
        var Utils = {
            formatDate: formatDate,
            findWeekId: function (dayDate) {
                var cached = cache[dayDate.toDateString()];
                if (cached) {
                    return cached;
                }
                var date;
                if (dayDate.getDay() === 1) {
                    date = new Date(dayDate.toString());
                }
                else {
                    var tempDate = new Date(dayDate.toString());
                    while (true) {
                        tempDate.setDate(tempDate.getDate() - 1);
                        if ((tempDate.getMonth() !== dayDate.getMonth()) || tempDate.getDay() === 0) {
                            var weekDate = new Date(tempDate.toString());
                            weekDate.setDate(tempDate.getDate() + 1);
                            date = weekDate;
                            break;
                        }
                    }
                }
                let result = formatDate(date, 'yyyy-mm-dd');
                cache[dayDate.toDateString()] = result;
                return result;
            },
            findMonthId: function (dayDate) {
                return formatDate(dayDate, 'yyyy-mm');
            },
            findQuarterId: function (dayDate) {
                return formatDate(dayDate, 'yyyy') + '-' + (Math.floor(dayDate.getMonth() / 3) + 1);
            },
            findYearId: function (dayDate) {
                return formatDate(dayDate, 'yyyy');
            }
        };
        return Utils;
    });
