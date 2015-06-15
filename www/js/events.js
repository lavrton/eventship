'use strict';

function isFullChildren(nestedEvent) {
    var fullChildren = false;
    var lastChild = nestedEvent.children.sort(function (a, b) {
        return a.id > b.id;
    })[nestedEvent.children.length - 1];
    if (!lastChild) {
        return false;
    }
    if (nestedEvent.type === 'week') {
        // for week chooser
        var tempDate = new Date(lastChild.date);
        if (tempDate.getDay() === 0) {
            fullChildren = true;
        }
        var nextDay = new Date(tempDate.toString());
        nextDay.setDate(nextDay.getDate() + 1);
        var value = (lastChild.title || '').toString();
        if (nextDay.getMonth() !== tempDate.getMonth() && value.length > 2) {
            fullChildren = true;
        }
        fullChildren = fullChildren && !nestedEvent.children.filter(function (child) {
            return !child.title;
        }).length;
    } else {
        // for month, quater, year
        fullChildren = true;
        nestedEvent.children.forEach(function (child) {
            fullChildren = fullChildren && isFullChildren(child) && !isNeedSubmit(child);
        });
        //if (!childrenDone) {
        //    fullChildren = false;
        //}
        var lastDay = undefined;
        while (true) {
            if (lastChild.type !== 'day') {
                lastChild = lastChild.children[lastChild.children.length - 1];
            } else {
                lastDay = lastChild;
                break;
            }
        }
        // теперь находим следующий за последним день
        var nextDay_ = new Date(lastDay.date);
        nextDay_.setDate(nextDay_.getDate() + 1);
        // если месяц остаётся такой же, значит еще не все данные введены
        if (nextDay_.getMonth() === new Date(lastDay.date).getMonth()) {
            fullChildren = false;
        } else {
            fullChildren = fullChildren && true;
            var month = lastDay.date.getMonth();
            if (nestedEvent.type === 'quarter') {
                if ([2, 5, 8, 11].indexOf(month) === -1) {
                    fullChildren = false;
                }
            } else if (nestedEvent.type === 'year') {
                if (month !== 11) {
                    fullChildren = false;
                }
            }
        }
    }
    return fullChildren;
}

function isNeedSubmit(nestedEvent) {
    return !nestedEvent.selectedChildId && isFullChildren(nestedEvent);
}

angular.module('mie.events', ['mie.utils', 'mie.settings', 'mie.store']).factory('DayEvent', function () {

    function DayEvent(data) {
        this.type = 'day';
        this.title = data.title;
        this.score = data.score !== undefined ? parseInt(data.score) : 2;
        this.id = data.id;
        this.date = new Date(data.date);
    }

    DayEvent.prototype.toObject = function () {
        return {
            type: this.type,
            title: this.title,
            id: this.id,
            score: this.score,
            date: this.date.toString()
        };
    };

    return DayEvent;
}).factory('NestedEvent', function () {

    function getDays(event) {
        if (event.type === 'week') {
            return event.children;
        }

        var days = [];
        event.children.forEach(function (child) {
            days = days.concat(getDays(child));
        });
        return days;
    }

    function NestedEvent(type, id) {
        this.type = type;
        this.id = id;
        this.children = [];
        this.selectedChildId = null;
    }

    Object.defineProperty(NestedEvent.prototype, 'title', {
        get: function get() {
            var _this = this;

            var day = _.find(getDays(this), function (d) {
                return d.id === _this.selectedChildId;
            });

            return day && day.title;
        }
    });

    Object.defineProperty(NestedEvent.prototype, 'score', {
        get: function get() {
            var sum = this.children.reduce(function (a, b) {
                return {
                    score: a.score + b.score
                };
            });
            return Math.round(sum.score / this.children.length);
        }
    });

    NestedEvent.prototype.toObject = function () {
        return {
            type: this.type,
            id: this.id,
            selectedChildId: this.selectedChildId || ''
        };
    };

    NestedEvent.prototype.addChild = function (child) {
        if (this.children.indexOf(child) !== -1) {
            return;
        }
        this.children.push(child);
        this.children.sort(function (a, b) {
            return a.id > b.id;
        });
    };

    Object.defineProperty(NestedEvent.prototype, 'date', {
        get: function get() {
            if (this.type === 'quarter') {
                var parts = this.id.split('-');
                var d = parts[0] + '-0' + parts[1];
                return new Date(d);
            }

            return new Date(this.id);
        }
    });

    return NestedEvent;
}).factory('Events', ['utils', 'settings', 'store', 'DayEvent', 'NestedEvent', 'isOnline', function (utils, settings, store, DayEvent, NestedEvent, isOnline) {
    isOnline().then(function (status) {
        console.log('isOnline', status);
    });
    var startFrom = new Date();
    //let lastEventDate = new Date(startFrom);
    //lastEventDate.setDate(startFrom.getDate() - 1);
    //let lastId = 0;

    var dayEvents = [];
    var nestedEvents = [];

    //(JSON.parse(localStorage.getItem('nestedEvents')) || []).forEach(function (item) {
    //    let e = new NestedEvent(item.type, item.id);
    //    e.selectedChildId = item.selectedChildId;
    //    nestedEvents.push(e);
    //});
    //
    //// find last date
    //dayEvents.forEach(function (event) {
    //    event.date = new Date(event.date);
    //    lastId = Math.max(lastId, event.id);
    //    lastEventDate = new Date(Math.max(Number(lastEventDate), event.date));
    //});
    //lastEventDate.setDate(lastEventDate.getDate() + 1);

    var findLoosed = function findLoosed() {
        var weekStart = utils.findWeekId(startFrom);
        var monthStart = utils.findMonthId(startFrom);
        var quaterStart = utils.findQuarterId(startFrom);
        var yearStart = utils.findYearId(startFrom);
        return nestedEvents.filter(function (e) {
            return e.type === 'week' && isFullChildren(e) && isNeedSubmit(e) && e.id >= weekStart;
        })[0] || nestedEvents.filter(function (e) {
            return e.type === 'month' && isFullChildren(e) && isNeedSubmit(e) && e.id >= monthStart;
        })[0] || nestedEvents.filter(function (e) {
            return e.type === 'quarter' && isFullChildren(e) && isNeedSubmit(e) && e.id >= quaterStart;
        })[0] || nestedEvents.filter(function (e) {
            return e.type === 'year' && isFullChildren(e) && isNeedSubmit(e) && e.id >= yearStart;
        })[0];
    };

    var Events = {
        allDayEvents: function allDayEvents() {
            return dayEvents;
        },
        allNestedEvents: function allNestedEvents() {
            return nestedEvents;
        },
        load: function load(cb) {
            store.load(function (data) {
                settings.startDate().then(function (date) {
                    startFrom = new Date(date);
                    Events._buildTree();
                    cb();
                });
                nestedEvents = data.nestedEvents.map(function (item) {
                    var e = new NestedEvent(item.type, item.id);
                    e.selectedChildId = item.selectedChildId;
                    return e;
                });
                dayEvents = data.dayEvents.map(function (event) {
                    return new DayEvent(event);
                });
            });
        },
        _buildTree: function _buildTree() {
            var currentDate = new Date(startFrom);
            while (currentDate < new Date()) {
                var day = _.find(dayEvents, function (d) {
                    return d.date.toDateString() === currentDate.toDateString();
                });
                if (!day) {
                    dayEvents.unshift(new DayEvent({
                        type: 'day',
                        title: '',
                        date: new Date(currentDate),
                        id: utils.formatDate(currentDate, 'yyyy-mm-dd')
                    }));
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            Events._sortDays();
            // reset children references
            nestedEvents.forEach(function (e) {
                e.children = [];
            });
            dayEvents.forEach(function (day) {
                var date = day.date;
                var yearId = utils.findYearId(date);
                var year = Events.getNested('year', yearId);
                if (!year) {
                    year = new NestedEvent('year', yearId);
                    nestedEvents.push(year);
                    store.save(year);
                }

                var quarterId = utils.findQuarterId(date);
                var quarter = Events.getNested('quarter', quarterId);
                if (!quarter) {
                    quarter = new NestedEvent('quarter', quarterId);
                    nestedEvents.push(quarter);
                    store.save(quarter);
                }

                year.addChild(quarter);

                var monthId = utils.findMonthId(date);
                var month = Events.getNested('month', monthId);
                if (!month) {
                    month = new NestedEvent('month', monthId);
                    nestedEvents.push(month);
                    store.save(month);
                }
                quarter.addChild(month);

                var weekId = utils.findWeekId(date);
                var week = Events.getNested('week', weekId);
                if (!week) {
                    week = new NestedEvent('week', weekId);
                    nestedEvents.push(week);
                    store.save(week);
                }
                month.addChild(week);

                week.addChild(day);
            });
        },
        _sortDays: function _sortDays() {
            dayEvents = _.sortBy(dayEvents, 'id');
        },
        _getUnsubmitDay: function _getUnsubmitDay() {
            return _.find(dayEvents, function (d) {
                return !d.title;
            });
        },
        getCombinedList: function getCombinedList() {
            var list = [];
            var years = nestedEvents.filter(function (e) {
                return e.type === 'year';
            });

            function addNested(e) {

                if (e.type === 'week') {
                    e.children.forEach(function (day) {
                        if (day.title) {
                            list.unshift(day);
                        }
                    });
                } else {
                    //console.log(e);
                    e.children.forEach(function (child) {
                        addNested(child);
                    });
                }
                if (e.selectedChildId) {
                    list.unshift(e);
                }
            }

            years.forEach(addNested);
            return list;
        },
        getDay: function getDay(id) {
            return dayEvents.filter(function (event) {
                return event.id === id;
            })[0];
        },
        getNested: function getNested(type, id) {
            return nestedEvents.filter(function (event) {
                return event.type === type && event.id === id;
            })[0];
        },
        getEvent: function getEvent(type, id) {
            if (type === 'day') {
                return Events.getDay(id);
            } else {
                return Events.getNested(type, id);
            }
        },
        isDaySubmitDone: function isDaySubmitDone() {
            var day = Events._getUnsubmitDay();
            if (day) {
                var past = day.date < new Date();
                var today = day.date.toDateString() === new Date().toDateString();
                return !(past || today);
            }
            return true;
        },
        isNestedSubmitDone: function isNestedSubmitDone() {
            return !findLoosed();
        },
        isSubmitDone: function isSubmitDone() {
            return this.isDaySubmitDone() && this.isNestedSubmitDone();
        },
        getUnsubmitDate: function getUnsubmitDate() {
            var day = Events._getUnsubmitDay();
            return day && day.date;
        },
        updateDayEvent: function updateDayEvent(id, title, score) {
            var event = this.getDay(id);
            if (event) {
                event.title = title;
                event.score = parseInt(score);
            }
            store.save(event);
        },
        updateNestedEvent: function updateNestedEvent(type, id, selectedChildId) {
            var event = Events.getNested(type, id);

            var oldVariant = event.selectedChildId;
            // validate selected id
            var vatiants = event.children.map(function (e) {
                return e.selectedChildId || e.id;
            });
            if (vatiants.indexOf(selectedChildId) === -1) {
                throw new Error('No such variant to select');
            }
            event.selectedChildId = selectedChildId;
            store.save(event);
            // now we need change all parents
            if (oldVariant) {
                nestedEvents.forEach(function (e) {
                    if (e.selectedChildId === oldVariant) {
                        e.selectedChildId = selectedChildId;
                    }
                    store.save(e);
                });
            }

            Events._saveNested();
        },
        _saveNested: function _saveNested() {
            var toSave = nestedEvents.map(function (e) {
                return {
                    id: e.id,
                    type: e.type,
                    selectedChildId: e.selectedChildId
                };
            });
            localStorage.setItem('nestedEvents', JSON.stringify(toSave));
        },
        submitDayEvent: function submitDayEvent(title, score) {
            var day = Events._getUnsubmitDay();
            day.title = title;
            if (score !== undefined) {
                day.score = parseInt(score);
            }
            store.save(day);
            var toSave = dayEvents.map(function (e) {
                return {
                    title: e.title,
                    id: e.id,
                    type: 'day',
                    date: e.date
                };
            });
            localStorage.setItem('dayEvents', JSON.stringify(toSave));
            this._buildTree();
        },
        submitNestedEvent: function submitNestedEvent(type, childId) {
            var loosed = findLoosed();
            Events.updateNestedEvent(type, loosed.id, childId);
        },
        getUnsubmitType: function getUnsubmitType() {
            var unsubmitDay = this._getUnsubmitDay();
            var unsubmitNested = findLoosed();

            if (unsubmitDay && unsubmitNested && unsubmitDay.date > unsubmitNested.date) {
                return unsubmitNested.type;
            } else if (unsubmitDay) {
                return 'day';
            } else if (unsubmitNested) {
                return unsubmitNested.type;
            }

            return null;
        },
        getUnsubmitNestedEvent: function getUnsubmitNestedEvent() {
            return findLoosed();
        },
        getNestedEventVariants: function getNestedEventVariants(type, id) {
            var loosed = undefined;
            if (id) {
                loosed = Events.getEvent(type, id);
            } else {
                loosed = findLoosed();
            }
            if (!loosed) {
                return [];
            }
            if (loosed.type === 'week') {
                return loosed.children;
            } else {
                return loosed.children.map(function (child) {
                    return dayEvents.filter(function (e) {
                        return e.id === child.selectedChildId;
                    })[0];
                });
            }
        },

        _setStartDate: function _setStartDate(date) {
            startFrom = new Date(date);
            //lastEventDate = new Date(startFrom);
            //lastEventDate.setDate(lastEventDate.getDate());
            Events._buildTree();
            dayEvents = dayEvents.filter(function (d) {
                return d.date > date || d.date.toDateString() === date.toDateString();
            });
            Events._updateFunctions.forEach(function (f) {
                return f();
            });
        },
        _updateFunctions: [],
        onUpdate: function onUpdate(cb) {
            Events._updateFunctions.push(cb);
        }
    };

    // for debug;
    window.events = Events;
    return Events;
}]).factory('beautifyDate', function () {
    function beautifyDate(event) {
        if (event.type === 'day') {
            var date = moment(new Date(event.id)).calendar();
            if (date.lastIndexOf('at') !== -1) {
                date = date.slice(0, date.lastIndexOf('at') - 1);
            }
            return date;
        } else if (event.type === 'month') {
            return moment(new Date(event.id)).format('MMMM');
        } else if (event.type === 'week') {
            return 'Week ' + event.id;
        } else if (event.type === 'quarter') {
            return 'Quarter ' + event.id;
        } else if (event.type === 'year') {
            return 'Year ' + event.id;
        } else {
            return event.id;
        }
    }

    return beautifyDate;
});
//# sourceMappingURL=data:application/json;base64,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SSxDQUFDO1NBQ2YsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFO0FBQy9CLG1CQUFPLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO0FBQzlCLG1CQUFPLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1NBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUNqQyxtQkFBTyxVQUFVLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztTQUNoQyxNQUFNLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7QUFDOUIsbUJBQU8sT0FBTyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7U0FDN0IsTUFBTTtBQUNILG1CQUFPLEtBQUssQ0FBQyxFQUFFLENBQUM7U0FDbkI7S0FDSjs7QUFFRCxXQUFPLFlBQVksQ0FBQztDQUN2QixDQUFDLENBQUMiLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gaXNGdWxsQ2hpbGRyZW4obmVzdGVkRXZlbnQpIHtcbiAgICBsZXQgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgbGV0IGxhc3RDaGlsZCA9IG5lc3RlZEV2ZW50LmNoaWxkcmVuLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEuaWQgPiBiLmlkO1xuICAgIH0pW25lc3RlZEV2ZW50LmNoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgIGlmICghbGFzdENoaWxkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICd3ZWVrJykge1xuICAgICAgICAvLyBmb3Igd2VlayBjaG9vc2VyXG4gICAgICAgIGxldCB0ZW1wRGF0ZSA9IG5ldyBEYXRlKGxhc3RDaGlsZC5kYXRlKTtcbiAgICAgICAgaWYgKHRlbXBEYXRlLmdldERheSgpID09PSAwKSB7XG4gICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXh0RGF5ID0gbmV3IERhdGUodGVtcERhdGUudG9TdHJpbmcoKSk7XG4gICAgICAgIG5leHREYXkuc2V0RGF0ZShuZXh0RGF5LmdldERhdGUoKSArIDEpO1xuICAgICAgICBsZXQgdmFsdWUgPSAobGFzdENoaWxkLnRpdGxlIHx8ICcnKS50b1N0cmluZygpO1xuICAgICAgICBpZiAobmV4dERheS5nZXRNb250aCgpICE9PSB0ZW1wRGF0ZS5nZXRNb250aCgpICYmICh2YWx1ZS5sZW5ndGggPiAyKSkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmdWxsQ2hpbGRyZW4gJiYgIW5lc3RlZEV2ZW50LmNoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiAhY2hpbGQudGl0bGU7XG4gICAgICAgIH0pLmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBmb3IgbW9udGgsIHF1YXRlciwgeWVhclxuICAgICAgICBmdWxsQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICBuZXN0ZWRFdmVudC5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZnVsbENoaWxkcmVuICYmIGlzRnVsbENoaWxkcmVuKGNoaWxkKSAmJiAhaXNOZWVkU3VibWl0KGNoaWxkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vaWYgKCFjaGlsZHJlbkRvbmUpIHtcbiAgICAgICAgLy8gICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgIC8vfVxuICAgICAgICBsZXQgbGFzdERheTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIGlmIChsYXN0Q2hpbGQudHlwZSAhPT0gJ2RheScpIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2hpbGQgPSBsYXN0Q2hpbGQuY2hpbGRyZW5bbGFzdENoaWxkLmNoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsYXN0RGF5ID0gbGFzdENoaWxkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vINGC0LXQv9C10YDRjCDQvdCw0YXQvtC00LjQvCDRgdC70LXQtNGD0Y7RidC40Lkg0LfQsCDQv9C+0YHQu9C10LTQvdC40Lwg0LTQtdC90YxcbiAgICAgICAgbGV0IG5leHREYXlfID0gbmV3IERhdGUobGFzdERheS5kYXRlKTtcbiAgICAgICAgbmV4dERheV8uc2V0RGF0ZShuZXh0RGF5Xy5nZXREYXRlKCkgKyAxKTtcbiAgICAgICAgLy8g0LXRgdC70Lgg0LzQtdGB0Y/RhiDQvtGB0YLQsNGR0YLRgdGPINGC0LDQutC+0Lkg0LbQtSwg0LfQvdCw0YfQuNGCINC10YnQtSDQvdC1INCy0YHQtSDQtNCw0L3QvdGL0LUg0LLQstC10LTQtdC90YtcbiAgICAgICAgaWYgKG5leHREYXlfLmdldE1vbnRoKCkgPT09IG5ldyBEYXRlKGxhc3REYXkuZGF0ZSkuZ2V0TW9udGgoKSkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmdWxsQ2hpbGRyZW4gJiYgdHJ1ZTtcbiAgICAgICAgICAgIGxldCBtb250aCA9IGxhc3REYXkuZGF0ZS5nZXRNb250aCgpO1xuICAgICAgICAgICAgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIGlmIChbMiwgNSwgOCwgMTFdLmluZGV4T2YobW9udGgpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgIGlmIChtb250aCAhPT0gMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmdWxsQ2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIGlzTmVlZFN1Ym1pdChuZXN0ZWRFdmVudCkge1xuICAgIHJldHVybiAhbmVzdGVkRXZlbnQuc2VsZWN0ZWRDaGlsZElkICYmIGlzRnVsbENoaWxkcmVuKG5lc3RlZEV2ZW50KTtcbn1cblxuXG5cbmFuZ3VsYXIubW9kdWxlKCdtaWUuZXZlbnRzJywgWydtaWUudXRpbHMnLCAnbWllLnNldHRpbmdzJywgJ21pZS5zdG9yZSddKVxuXG4uZmFjdG9yeSgnRGF5RXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBEYXlFdmVudChkYXRhKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdkYXknO1xuICAgICAgICB0aGlzLnRpdGxlID0gZGF0YS50aXRsZTtcbiAgICAgICAgdGhpcy5zY29yZSA9IChkYXRhLnNjb3JlICE9PSB1bmRlZmluZWQpID8gcGFyc2VJbnQoZGF0YS5zY29yZSkgOiAyO1xuICAgICAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZGF0YS5kYXRlKTtcbiAgICB9XG5cbiAgICBEYXlFdmVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB0eXBlOiB0aGlzLnR5cGUsXG4gICAgICAgICAgICB0aXRsZTogdGhpcy50aXRsZSxcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgc2NvcmU6IHRoaXMuc2NvcmUsXG4gICAgICAgICAgICBkYXRlOiB0aGlzLmRhdGUudG9TdHJpbmcoKVxuICAgICAgICB9O1xuICAgIH07XG5cbiAgICByZXR1cm4gRGF5RXZlbnQ7XG59KVxuXG4uZmFjdG9yeSgnTmVzdGVkRXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBnZXREYXlzKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC50eXBlID09PSAnd2VlaycpIHtcbiAgICAgICAgICAgIHJldHVybiBldmVudC5jaGlsZHJlbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBkYXlzID0gW107XG4gICAgICAgIGV2ZW50LmNoaWxkcmVuLmZvckVhY2goKGNoaWxkKSA9PiB7XG4gICAgICAgICAgICBkYXlzID0gZGF5cy5jb25jYXQoZ2V0RGF5cyhjaGlsZCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRheXM7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gTmVzdGVkRXZlbnQodHlwZSwgaWQpIHtcbiAgICAgICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5pZCA9IGlkO1xuICAgICAgICB0aGlzLmNoaWxkcmVuID0gW107XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRDaGlsZElkID0gbnVsbDtcbiAgICB9XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTmVzdGVkRXZlbnQucHJvdG90eXBlLCAndGl0bGUnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IGRheSA9IF8uZmluZChnZXREYXlzKHRoaXMpLCAoZCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBkLmlkID09PSB0aGlzLnNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICByZXR1cm4gZGF5ICYmIGRheS50aXRsZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE5lc3RlZEV2ZW50LnByb3RvdHlwZSwgJ3Njb3JlJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCBzdW0gPSB0aGlzLmNoaWxkcmVuLnJlZHVjZSgoYSwgYikgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3JlOiBhLnNjb3JlICsgYi5zY29yZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHN1bS5zY29yZSAvIHRoaXMuY2hpbGRyZW4ubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgTmVzdGVkRXZlbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgaWQ6IHRoaXMuaWQsXG4gICAgICAgICAgICBzZWxlY3RlZENoaWxkSWQ6IHRoaXMuc2VsZWN0ZWRDaGlsZElkIHx8ICcnXG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIE5lc3RlZEV2ZW50LnByb3RvdHlwZS5hZGRDaGlsZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICBpZiAodGhpcy5jaGlsZHJlbi5pbmRleE9mKGNoaWxkKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICB0aGlzLmNoaWxkcmVuLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmlkID4gYi5pZDtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShOZXN0ZWRFdmVudC5wcm90b3R5cGUsICdkYXRlJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIGxldCBwYXJ0cyA9IHRoaXMuaWQuc3BsaXQoJy0nKTtcbiAgICAgICAgICAgICAgICBsZXQgZCA9IHBhcnRzWzBdICsgJy0wJyArIHBhcnRzWzFdO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZShkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKHRoaXMuaWQpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gTmVzdGVkRXZlbnQ7XG59KVxuXG5cbi5mYWN0b3J5KCdFdmVudHMnLCBbJ3V0aWxzJywgJ3NldHRpbmdzJywgJ3N0b3JlJywgJ0RheUV2ZW50JywgJ05lc3RlZEV2ZW50JywgJ2lzT25saW5lJyxcblxuICAgIGZ1bmN0aW9uICh1dGlscywgc2V0dGluZ3MsIHN0b3JlLCBEYXlFdmVudCwgTmVzdGVkRXZlbnQsIGlzT25saW5lKSB7XG4gICAgICAgIGlzT25saW5lKCkudGhlbigoc3RhdHVzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnaXNPbmxpbmUnLCBzdGF0dXMpO1xuICAgICAgICB9KTtcbiAgICAgICAgbGV0IHN0YXJ0RnJvbSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIC8vbGV0IGxhc3RFdmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAvL2xhc3RFdmVudERhdGUuc2V0RGF0ZShzdGFydEZyb20uZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgIC8vbGV0IGxhc3RJZCA9IDA7XG5cblxuICAgICAgICBsZXQgZGF5RXZlbnRzID0gW107XG4gICAgICAgIGxldCBuZXN0ZWRFdmVudHMgPSBbXTtcblxuICAgICAgICAvLyhKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCduZXN0ZWRFdmVudHMnKSkgfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgLy8gICAgbGV0IGUgPSBuZXcgTmVzdGVkRXZlbnQoaXRlbS50eXBlLCBpdGVtLmlkKTtcbiAgICAgICAgLy8gICAgZS5zZWxlY3RlZENoaWxkSWQgPSBpdGVtLnNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgLy8gICAgbmVzdGVkRXZlbnRzLnB1c2goZSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vLy8gZmluZCBsYXN0IGRhdGVcbiAgICAgICAgLy9kYXlFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gICAgZXZlbnQuZGF0ZSA9IG5ldyBEYXRlKGV2ZW50LmRhdGUpO1xuICAgICAgICAvLyAgICBsYXN0SWQgPSBNYXRoLm1heChsYXN0SWQsIGV2ZW50LmlkKTtcbiAgICAgICAgLy8gICAgbGFzdEV2ZW50RGF0ZSA9IG5ldyBEYXRlKE1hdGgubWF4KE51bWJlcihsYXN0RXZlbnREYXRlKSwgZXZlbnQuZGF0ZSkpO1xuICAgICAgICAvL30pO1xuICAgICAgICAvL2xhc3RFdmVudERhdGUuc2V0RGF0ZShsYXN0RXZlbnREYXRlLmdldERhdGUoKSArIDEpO1xuXG4gICAgICAgIGxldCBmaW5kTG9vc2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IHdlZWtTdGFydCA9IHV0aWxzLmZpbmRXZWVrSWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCBtb250aFN0YXJ0ID0gdXRpbHMuZmluZE1vbnRoSWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCBxdWF0ZXJTdGFydCA9IHV0aWxzLmZpbmRRdWFydGVySWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCB5ZWFyU3RhcnQgPSB1dGlscy5maW5kWWVhcklkKHN0YXJ0RnJvbSk7XG4gICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICd3ZWVrJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSB3ZWVrU3RhcnQ7XG4gICAgICAgICAgICB9KVswXSB8fCBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGUudHlwZSA9PT0gJ21vbnRoJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSBtb250aFN0YXJ0O1xuICAgICAgICAgICAgfSlbMF0gfHwgbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICdxdWFydGVyJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSBxdWF0ZXJTdGFydDtcbiAgICAgICAgICAgIH0pWzBdIHx8IG5lc3RlZEV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZS50eXBlID09PSAneWVhcicgJiYgaXNGdWxsQ2hpbGRyZW4oZSkgJiYgaXNOZWVkU3VibWl0KGUpICYmIGUuaWQgPj0geWVhclN0YXJ0O1xuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgIH07XG5cblxuICAgICAgICBsZXQgRXZlbnRzID0ge1xuICAgICAgICAgICAgYWxsRGF5RXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheUV2ZW50cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxOZXN0ZWRFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvYWQ6IChjYikgPT4ge1xuICAgICAgICAgICAgICAgIHN0b3JlLmxvYWQoKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc3RhcnREYXRlKCkudGhlbigoZGF0ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRGcm9tID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBFdmVudHMuX2J1aWxkVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cyA9IGRhdGEubmVzdGVkRXZlbnRzLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGUgPSBuZXcgTmVzdGVkRXZlbnQoaXRlbS50eXBlLCBpdGVtLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc2VsZWN0ZWRDaGlsZElkID0gaXRlbS5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRheUV2ZW50cyA9IGRhdGEuZGF5RXZlbnRzLm1hcCgoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF5RXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9idWlsZFRyZWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50RGF0ZSA8IG5ldyBEYXRlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRheSA9IF8uZmluZChkYXlFdmVudHMsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRlLnRvRGF0ZVN0cmluZygpID09PSBjdXJyZW50RGF0ZS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudHMudW5zaGlmdChuZXcgRGF5RXZlbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBuZXcgRGF0ZShjdXJyZW50RGF0ZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmZvcm1hdERhdGUoY3VycmVudERhdGUsICd5eXl5LW1tLWRkJylcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF0ZS5zZXREYXRlKGN1cnJlbnREYXRlLmdldERhdGUoKSArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBFdmVudHMuX3NvcnREYXlzKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVzZXQgY2hpbGRyZW4gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cy5mb3JFYWNoKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRlID0gZGF5LmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGxldCB5ZWFySWQgPSB1dGlscy5maW5kWWVhcklkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgeWVhciA9IEV2ZW50cy5nZXROZXN0ZWQoJ3llYXInLCB5ZWFySWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHllYXIgPSBuZXcgTmVzdGVkRXZlbnQoJ3llYXInLCB5ZWFySWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2goeWVhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKHllYXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHF1YXJ0ZXJJZCA9IHV0aWxzLmZpbmRRdWFydGVySWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBxdWFydGVyID0gRXZlbnRzLmdldE5lc3RlZCgncXVhcnRlcicsIHF1YXJ0ZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcXVhcnRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVhcnRlciA9IG5ldyBOZXN0ZWRFdmVudCgncXVhcnRlcicsIHF1YXJ0ZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMucHVzaChxdWFydGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUocXVhcnRlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB5ZWFyLmFkZENoaWxkKHF1YXJ0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb250aElkID0gdXRpbHMuZmluZE1vbnRoSWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtb250aCA9IEV2ZW50cy5nZXROZXN0ZWQoJ21vbnRoJywgbW9udGhJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbW9udGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbnRoID0gbmV3IE5lc3RlZEV2ZW50KCdtb250aCcsIG1vbnRoSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2gobW9udGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShtb250aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcXVhcnRlci5hZGRDaGlsZChtb250aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHdlZWtJZCA9IHV0aWxzLmZpbmRXZWVrSWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB3ZWVrID0gRXZlbnRzLmdldE5lc3RlZCgnd2VlaycsIHdlZWtJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghd2Vlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2VlayA9IG5ldyBOZXN0ZWRFdmVudCgnd2VlaycsIHdlZWtJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMucHVzaCh3ZWVrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUod2Vlayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW9udGguYWRkQ2hpbGQod2Vlayk7XG5cbiAgICAgICAgICAgICAgICAgICAgd2Vlay5hZGRDaGlsZChkYXkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9zb3J0RGF5czogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGRheUV2ZW50cyA9IF8uc29ydEJ5KGRheUV2ZW50cywgJ2lkJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX2dldFVuc3VibWl0RGF5OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmluZChkYXlFdmVudHMsIChkKSA9PiAhZC50aXRsZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29tYmluZWRMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGxpc3QgPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgeWVhcnMgPSBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICd5ZWFyJztcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGFkZE5lc3RlZChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGRheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXkudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC51bnNoaWZ0KGRheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZE5lc3RlZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC51bnNoaWZ0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgeWVhcnMuZm9yRWFjaChhZGROZXN0ZWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldERheTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheUV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TmVzdGVkOiBmdW5jdGlvbiAodHlwZSwgaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnR5cGUgPT09IHR5cGUgJiYgZXZlbnQuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEV2ZW50OiBmdW5jdGlvbiAodHlwZSwgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2RheScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV2ZW50cy5nZXREYXkoaWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFdmVudHMuZ2V0TmVzdGVkKHR5cGUsIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNEYXlTdWJtaXREb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRheSA9IEV2ZW50cy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXN0ID0gZGF5LmRhdGUgPCBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdG9kYXkgPSBkYXkuZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0gbmV3IERhdGUoKS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEocGFzdCB8fCB0b2RheSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzTmVzdGVkU3VibWl0RG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmluZExvb3NlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzU3VibWl0RG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzRGF5U3VibWl0RG9uZSgpICYmIHRoaXMuaXNOZXN0ZWRTdWJtaXREb25lKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VW5zdWJtaXREYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRheSA9IEV2ZW50cy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF5ICYmIGRheS5kYXRlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVwZGF0ZURheUV2ZW50OiBmdW5jdGlvbiAoaWQsIHRpdGxlLCBzY29yZSkge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IHRoaXMuZ2V0RGF5KGlkKTtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuc2NvcmUgPSBwYXJzZUludChzY29yZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUoZXZlbnQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVwZGF0ZU5lc3RlZEV2ZW50OiBmdW5jdGlvbiAodHlwZSwgaWQsIHNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IEV2ZW50cy5nZXROZXN0ZWQodHlwZSwgaWQpO1xuXG4gICAgICAgICAgICAgICAgbGV0IG9sZFZhcmlhbnQgPSBldmVudC5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgLy8gdmFsaWRhdGUgc2VsZWN0ZWQgaWRcbiAgICAgICAgICAgICAgICBsZXQgdmF0aWFudHMgPSBldmVudC5jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUuc2VsZWN0ZWRDaGlsZElkIHx8IGUuaWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhdGlhbnRzLmluZGV4T2Yoc2VsZWN0ZWRDaGlsZElkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBzdWNoIHZhcmlhbnQgdG8gc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV2ZW50LnNlbGVjdGVkQ2hpbGRJZCA9IHNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKGV2ZW50KTtcbiAgICAgICAgICAgICAgICAvLyBub3cgd2UgbmVlZCBjaGFuZ2UgYWxsIHBhcmVudHNcbiAgICAgICAgICAgICAgICBpZiAob2xkVmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuc2VsZWN0ZWRDaGlsZElkID09PSBvbGRWYXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zZWxlY3RlZENoaWxkSWQgPSBzZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBFdmVudHMuX3NhdmVOZXN0ZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfc2F2ZU5lc3RlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCB0b1NhdmUgPSBuZXN0ZWRFdmVudHMubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkQ2hpbGRJZDogZS5zZWxlY3RlZENoaWxkSWRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbmVzdGVkRXZlbnRzJywgSlNPTi5zdHJpbmdpZnkodG9TYXZlKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VibWl0RGF5RXZlbnQ6IGZ1bmN0aW9uICh0aXRsZSwgc2NvcmUpIHtcbiAgICAgICAgICAgICAgICBsZXQgZGF5ID0gRXZlbnRzLl9nZXRVbnN1Ym1pdERheSgpO1xuICAgICAgICAgICAgICAgIGRheS50aXRsZSA9IHRpdGxlO1xuICAgICAgICAgICAgICAgIGlmIChzY29yZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRheS5zY29yZSA9IHBhcnNlSW50KHNjb3JlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShkYXkpO1xuICAgICAgICAgICAgICAgIGxldCB0b1NhdmUgPSBkYXlFdmVudHMubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogZS50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RheScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBlLmRhdGVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZGF5RXZlbnRzJywgSlNPTi5zdHJpbmdpZnkodG9TYXZlKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYnVpbGRUcmVlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VibWl0TmVzdGVkRXZlbnQ6IGZ1bmN0aW9uICh0eXBlLCBjaGlsZElkKSB7XG4gICAgICAgICAgICAgICAgbGV0IGxvb3NlZCA9IGZpbmRMb29zZWQoKTtcbiAgICAgICAgICAgICAgICBFdmVudHMudXBkYXRlTmVzdGVkRXZlbnQodHlwZSwgbG9vc2VkLmlkLCBjaGlsZElkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRVbnN1Ym1pdFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgdW5zdWJtaXREYXkgPSB0aGlzLl9nZXRVbnN1Ym1pdERheSgpO1xuICAgICAgICAgICAgICAgIGxldCB1bnN1Ym1pdE5lc3RlZCA9IGZpbmRMb29zZWQoKTtcblxuXG4gICAgICAgICAgICAgICAgaWYgKHVuc3VibWl0RGF5ICYmIHVuc3VibWl0TmVzdGVkICYmIHVuc3VibWl0RGF5LmRhdGUgPiB1bnN1Ym1pdE5lc3RlZC5kYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnN1Ym1pdE5lc3RlZC50eXBlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodW5zdWJtaXREYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdkYXknO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodW5zdWJtaXROZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuc3VibWl0TmVzdGVkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VW5zdWJtaXROZXN0ZWRFdmVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaW5kTG9vc2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TmVzdGVkRXZlbnRWYXJpYW50czogKHR5cGUsIGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGxvb3NlZDtcbiAgICAgICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9vc2VkID0gRXZlbnRzLmdldEV2ZW50KHR5cGUsIGlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb29zZWQgPSBmaW5kTG9vc2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbG9vc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxvb3NlZC50eXBlID09PSAnd2VlaycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvb3NlZC5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9vc2VkLmNoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXlFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUuaWQgPT09IGNoaWxkLnNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfc2V0U3RhcnREYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0RnJvbSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIC8vbGFzdEV2ZW50RGF0ZSA9IG5ldyBEYXRlKHN0YXJ0RnJvbSk7XG4gICAgICAgICAgICAgICAgLy9sYXN0RXZlbnREYXRlLnNldERhdGUobGFzdEV2ZW50RGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgICAgIEV2ZW50cy5fYnVpbGRUcmVlKCk7XG4gICAgICAgICAgICAgICAgZGF5RXZlbnRzID0gZGF5RXZlbnRzLmZpbHRlcigoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRlID4gZGF0ZSB8fCBkLmRhdGUudG9EYXRlU3RyaW5nKCkgPT09IGRhdGUudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXZlbnRzLl91cGRhdGVGdW5jdGlvbnMuZm9yRWFjaCgoZikgPT4gZigpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfdXBkYXRlRnVuY3Rpb25zOiBbXSxcbiAgICAgICAgICAgIG9uVXBkYXRlOiAoY2IpID0+IHtcbiAgICAgICAgICAgICAgICBFdmVudHMuX3VwZGF0ZUZ1bmN0aW9ucy5wdXNoKGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmb3IgZGVidWc7XG4gICAgICAgIHdpbmRvdy5ldmVudHMgPSBFdmVudHM7XG4gICAgICAgIHJldHVybiBFdmVudHM7XG4gICAgfVxuXSlcbiAgICAuZmFjdG9yeSgnYmVhdXRpZnlEYXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBmdW5jdGlvbiBiZWF1dGlmeURhdGUoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC50eXBlID09PSAnZGF5Jykge1xuICAgICAgICAgICAgICAgIGxldCBkYXRlID0gbW9tZW50KG5ldyBEYXRlKGV2ZW50LmlkKSkuY2FsZW5kYXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZS5sYXN0SW5kZXhPZignYXQnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IGRhdGUuc2xpY2UoMCwgZGF0ZS5sYXN0SW5kZXhPZignYXQnKSAtIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ21vbnRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQobmV3IERhdGUoZXZlbnQuaWQpKS5mb3JtYXQoJ01NTU0nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdXZWVrICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdRdWFydGVyICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdZZWFyICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJlYXV0aWZ5RGF0ZTtcbiAgICB9KTtcbiJdLCJzb3VyY2VSb290IjoiLi4vLi4vanNzcmMifQ==