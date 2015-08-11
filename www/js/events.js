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
        this.updated = data.updated || Date.now();
    }

    DayEvent.prototype.toObject = function () {
        return {
            type: this.type,
            title: this.title,
            id: this.id,
            score: this.score,
            date: this.date.toString(),
            updated: this.updated
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

    function NestedEvent(data) {
        this.type = data.type;
        this.id = data.id;
        this.children = [];
        this.selectedChildId = data.selectedChildId || null;
        this.updated = data.updated || Date.now();
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
        var obj = {
            type: this.type,
            id: this.id,
            updated: this.updated
        };

        if (this.selectedChildId) {
            obj.selectedChildId = this.selectedChildId;
        }

        return obj;
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
        _updateFromData: function _updateFromData(data) {
            nestedEvents = data.nestedEvents.map(function (event) {
                var e = new NestedEvent(event);
                return e;
            });
            dayEvents = data.dayEvents.map(function (event) {
                return new DayEvent(event);
            });
            Events._buildTree();
            Events._triggerUpdate();
        },
        load: function load(cb) {
            store.load(function (data) {
                settings.startDate().then(function (date) {
                    startFrom = new Date(date);
                    Events._updateFromData(data);
                    cb();
                });
            });
            store.onUpdate(function (data) {
                Events._updateFromData(data);
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
                    year = new NestedEvent({ type: 'year', id: yearId });
                    nestedEvents.push(year);
                    store.save(year);
                }

                var quarterId = utils.findQuarterId(date);
                var quarter = Events.getNested('quarter', quarterId);
                if (!quarter) {
                    quarter = new NestedEvent({ type: 'quarter', id: quarterId });
                    nestedEvents.push(quarter);
                    store.save(quarter);
                }

                year.addChild(quarter);

                var monthId = utils.findMonthId(date);
                var month = Events.getNested('month', monthId);
                if (!month) {
                    month = new NestedEvent({ type: 'month', id: monthId });
                    nestedEvents.push(month);
                    store.save(month);
                }
                quarter.addChild(month);

                var weekId = utils.findWeekId(date);
                var week = Events.getNested('week', weekId);
                if (!week) {
                    week = new NestedEvent({ type: 'week', id: weekId });
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

                if (e.selectedChildId) {
                    list.unshift(e);
                    return;
                }
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
        },
        _triggerUpdate: function _triggerUpdate() {
            Events._updateFunctions.forEach(function (func) {
                return func();
            });
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
//# sourceMappingURL=data:application/json;base64,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aXNGdWxsQ2hpbGRyZW4obmVzdGVkRXZlbnQpIHtcbiAgICBsZXQgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgbGV0IGxhc3RDaGlsZCA9IG5lc3RlZEV2ZW50LmNoaWxkcmVuLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEuaWQgPiBiLmlkO1xuICAgIH0pW25lc3RlZEV2ZW50LmNoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgIGlmICghbGFzdENoaWxkKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICd3ZWVrJykge1xuICAgICAgICAvLyBmb3Igd2VlayBjaG9vc2VyXG4gICAgICAgIGxldCB0ZW1wRGF0ZSA9IG5ldyBEYXRlKGxhc3RDaGlsZC5kYXRlKTtcbiAgICAgICAgaWYgKHRlbXBEYXRlLmdldERheSgpID09PSAwKSB7XG4gICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXh0RGF5ID0gbmV3IERhdGUodGVtcERhdGUudG9TdHJpbmcoKSk7XG4gICAgICAgIG5leHREYXkuc2V0RGF0ZShuZXh0RGF5LmdldERhdGUoKSArIDEpO1xuICAgICAgICBsZXQgdmFsdWUgPSAobGFzdENoaWxkLnRpdGxlIHx8ICcnKS50b1N0cmluZygpO1xuICAgICAgICBpZiAobmV4dERheS5nZXRNb250aCgpICE9PSB0ZW1wRGF0ZS5nZXRNb250aCgpICYmICh2YWx1ZS5sZW5ndGggPiAyKSkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmdWxsQ2hpbGRyZW4gJiYgIW5lc3RlZEV2ZW50LmNoaWxkcmVuLmZpbHRlcihmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIHJldHVybiAhY2hpbGQudGl0bGU7XG4gICAgICAgIH0pLmxlbmd0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBmb3IgbW9udGgsIHF1YXRlciwgeWVhclxuICAgICAgICBmdWxsQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICBuZXN0ZWRFdmVudC5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZnVsbENoaWxkcmVuICYmIGlzRnVsbENoaWxkcmVuKGNoaWxkKSAmJiAhaXNOZWVkU3VibWl0KGNoaWxkKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vaWYgKCFjaGlsZHJlbkRvbmUpIHtcbiAgICAgICAgLy8gICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgIC8vfVxuICAgICAgICBsZXQgbGFzdERheTtcbiAgICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgICAgIGlmIChsYXN0Q2hpbGQudHlwZSAhPT0gJ2RheScpIHtcbiAgICAgICAgICAgICAgICBsYXN0Q2hpbGQgPSBsYXN0Q2hpbGQuY2hpbGRyZW5bbGFzdENoaWxkLmNoaWxkcmVuLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBsYXN0RGF5ID0gbGFzdENoaWxkO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vINGC0LXQv9C10YDRjCDQvdCw0YXQvtC00LjQvCDRgdC70LXQtNGD0Y7RidC40Lkg0LfQsCDQv9C+0YHQu9C10LTQvdC40Lwg0LTQtdC90YxcbiAgICAgICAgbGV0IG5leHREYXlfID0gbmV3IERhdGUobGFzdERheS5kYXRlKTtcbiAgICAgICAgbmV4dERheV8uc2V0RGF0ZShuZXh0RGF5Xy5nZXREYXRlKCkgKyAxKTtcbiAgICAgICAgLy8g0LXRgdC70Lgg0LzQtdGB0Y/RhiDQvtGB0YLQsNGR0YLRgdGPINGC0LDQutC+0Lkg0LbQtSwg0LfQvdCw0YfQuNGCINC10YnQtSDQvdC1INCy0YHQtSDQtNCw0L3QvdGL0LUg0LLQstC10LTQtdC90YtcbiAgICAgICAgaWYgKG5leHREYXlfLmdldE1vbnRoKCkgPT09IG5ldyBEYXRlKGxhc3REYXkuZGF0ZSkuZ2V0TW9udGgoKSkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmdWxsQ2hpbGRyZW4gJiYgdHJ1ZTtcbiAgICAgICAgICAgIGxldCBtb250aCA9IGxhc3REYXkuZGF0ZS5nZXRNb250aCgpO1xuICAgICAgICAgICAgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICdxdWFydGVyJykge1xuICAgICAgICAgICAgICAgIGlmIChbMiwgNSwgOCwgMTFdLmluZGV4T2YobW9udGgpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBmdWxsQ2hpbGRyZW4gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5lc3RlZEV2ZW50LnR5cGUgPT09ICd5ZWFyJykge1xuICAgICAgICAgICAgICAgIGlmIChtb250aCAhPT0gMTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmdWxsQ2hpbGRyZW47XG59XG5cbmZ1bmN0aW9uIGlzTmVlZFN1Ym1pdChuZXN0ZWRFdmVudCkge1xuICAgIHJldHVybiAhbmVzdGVkRXZlbnQuc2VsZWN0ZWRDaGlsZElkICYmIGlzRnVsbENoaWxkcmVuKG5lc3RlZEV2ZW50KTtcbn1cblxuXG5cbmFuZ3VsYXIubW9kdWxlKCdtaWUuZXZlbnRzJywgWydtaWUudXRpbHMnLCAnbWllLnNldHRpbmdzJywgJ21pZS5zdG9yZSddKVxuXG4uZmFjdG9yeSgnRGF5RXZlbnQnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICBmdW5jdGlvbiBEYXlFdmVudChkYXRhKSB7XG4gICAgICAgIHRoaXMudHlwZSA9ICdkYXknO1xuICAgICAgICB0aGlzLnRpdGxlID0gZGF0YS50aXRsZTtcbiAgICAgICAgdGhpcy5zY29yZSA9IChkYXRhLnNjb3JlICE9PSB1bmRlZmluZWQpID8gcGFyc2VJbnQoZGF0YS5zY29yZSkgOiAyO1xuICAgICAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICAgICAgdGhpcy5kYXRlID0gbmV3IERhdGUoZGF0YS5kYXRlKTtcbiAgICAgICAgdGhpcy51cGRhdGVkID0gZGF0YS51cGRhdGVkIHx8IERhdGUubm93KCk7XG4gICAgfVxuXG4gICAgRGF5RXZlbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgdGl0bGU6IHRoaXMudGl0bGUsXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgIHNjb3JlOiB0aGlzLnNjb3JlLFxuICAgICAgICAgICAgZGF0ZTogdGhpcy5kYXRlLnRvU3RyaW5nKCksXG4gICAgICAgICAgICB1cGRhdGVkOiB0aGlzLnVwZGF0ZWRcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERheUV2ZW50O1xufSlcblxuLmZhY3RvcnkoJ05lc3RlZEV2ZW50JywgZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gZ2V0RGF5cyhldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQuY2hpbGRyZW47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZGF5cyA9IFtdO1xuICAgICAgICBldmVudC5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4ge1xuICAgICAgICAgICAgZGF5cyA9IGRheXMuY29uY2F0KGdldERheXMoY2hpbGQpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkYXlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIE5lc3RlZEV2ZW50KGRhdGEpIHtcbiAgICAgICAgdGhpcy50eXBlID0gZGF0YS50eXBlO1xuICAgICAgICB0aGlzLmlkID0gZGF0YS5pZDtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ2hpbGRJZCA9IGRhdGEuc2VsZWN0ZWRDaGlsZElkIHx8IG51bGw7XG4gICAgICAgIHRoaXMudXBkYXRlZCA9IGRhdGEudXBkYXRlZCB8fCBEYXRlLm5vdygpO1xuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShOZXN0ZWRFdmVudC5wcm90b3R5cGUsICd0aXRsZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgZGF5ID0gXy5maW5kKGdldERheXModGhpcyksIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGQuaWQgPT09IHRoaXMuc2VsZWN0ZWRDaGlsZElkO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBkYXkgJiYgZGF5LnRpdGxlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTmVzdGVkRXZlbnQucHJvdG90eXBlLCAnc2NvcmUnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IHN1bSA9IHRoaXMuY2hpbGRyZW4ucmVkdWNlKChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcmU6IGEuc2NvcmUgKyBiLnNjb3JlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoc3VtLnNjb3JlIC8gdGhpcy5jaGlsZHJlbi5sZW5ndGgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBOZXN0ZWRFdmVudC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxldCBvYmogPSB7XG4gICAgICAgICAgICB0eXBlOiB0aGlzLnR5cGUsXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IHRoaXMudXBkYXRlZFxuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0aGlzLnNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgb2JqLnNlbGVjdGVkQ2hpbGRJZCA9IHRoaXMuc2VsZWN0ZWRDaGlsZElkO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9O1xuXG4gICAgTmVzdGVkRXZlbnQucHJvdG90eXBlLmFkZENoaWxkID0gZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkcmVuLmluZGV4T2YoY2hpbGQpICE9PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgIHRoaXMuY2hpbGRyZW4uc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEuaWQgPiBiLmlkO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE5lc3RlZEV2ZW50LnByb3RvdHlwZSwgJ2RhdGUnLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMudHlwZSA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgbGV0IHBhcnRzID0gdGhpcy5pZC5zcGxpdCgnLScpO1xuICAgICAgICAgICAgICAgIGxldCBkID0gcGFydHNbMF0gKyAnLTAnICsgcGFydHNbMV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKGQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUodGhpcy5pZCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBOZXN0ZWRFdmVudDtcbn0pXG5cblxuLmZhY3RvcnkoJ0V2ZW50cycsIFsndXRpbHMnLCAnc2V0dGluZ3MnLCAnc3RvcmUnLCAnRGF5RXZlbnQnLCAnTmVzdGVkRXZlbnQnLCAnaXNPbmxpbmUnLFxuXG4gICAgZnVuY3Rpb24gKHV0aWxzLCBzZXR0aW5ncywgc3RvcmUsIERheUV2ZW50LCBOZXN0ZWRFdmVudCwgaXNPbmxpbmUpIHtcbiAgICAgICAgaXNPbmxpbmUoKS50aGVuKChzdGF0dXMpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdpc09ubGluZScsIHN0YXR1cyk7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgc3RhcnRGcm9tID0gbmV3IERhdGUoKTtcbiAgICAgICAgLy9sZXQgbGFzdEV2ZW50RGF0ZSA9IG5ldyBEYXRlKHN0YXJ0RnJvbSk7XG4gICAgICAgIC8vbGFzdEV2ZW50RGF0ZS5zZXREYXRlKHN0YXJ0RnJvbS5nZXREYXRlKCkgLSAxKTtcbiAgICAgICAgLy9sZXQgbGFzdElkID0gMDtcblxuXG4gICAgICAgIGxldCBkYXlFdmVudHMgPSBbXTtcbiAgICAgICAgbGV0IG5lc3RlZEV2ZW50cyA9IFtdO1xuXG4gICAgICAgIC8vKEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oJ25lc3RlZEV2ZW50cycpKSB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAvLyAgICBsZXQgZSA9IG5ldyBOZXN0ZWRFdmVudChpdGVtLnR5cGUsIGl0ZW0uaWQpO1xuICAgICAgICAvLyAgICBlLnNlbGVjdGVkQ2hpbGRJZCA9IGl0ZW0uc2VsZWN0ZWRDaGlsZElkO1xuICAgICAgICAvLyAgICBuZXN0ZWRFdmVudHMucHVzaChlKTtcbiAgICAgICAgLy99KTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8vLyBmaW5kIGxhc3QgZGF0ZVxuICAgICAgICAvL2RheUV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAvLyAgICBldmVudC5kYXRlID0gbmV3IERhdGUoZXZlbnQuZGF0ZSk7XG4gICAgICAgIC8vICAgIGxhc3RJZCA9IE1hdGgubWF4KGxhc3RJZCwgZXZlbnQuaWQpO1xuICAgICAgICAvLyAgICBsYXN0RXZlbnREYXRlID0gbmV3IERhdGUoTWF0aC5tYXgoTnVtYmVyKGxhc3RFdmVudERhdGUpLCBldmVudC5kYXRlKSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vbGFzdEV2ZW50RGF0ZS5zZXREYXRlKGxhc3RFdmVudERhdGUuZ2V0RGF0ZSgpICsgMSk7XG5cbiAgICAgICAgbGV0IGZpbmRMb29zZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgd2Vla1N0YXJ0ID0gdXRpbHMuZmluZFdlZWtJZChzdGFydEZyb20pO1xuICAgICAgICAgICAgbGV0IG1vbnRoU3RhcnQgPSB1dGlscy5maW5kTW9udGhJZChzdGFydEZyb20pO1xuICAgICAgICAgICAgbGV0IHF1YXRlclN0YXJ0ID0gdXRpbHMuZmluZFF1YXJ0ZXJJZChzdGFydEZyb20pO1xuICAgICAgICAgICAgbGV0IHllYXJTdGFydCA9IHV0aWxzLmZpbmRZZWFySWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIHJldHVybiBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGUudHlwZSA9PT0gJ3dlZWsnICYmIGlzRnVsbENoaWxkcmVuKGUpICYmIGlzTmVlZFN1Ym1pdChlKSAmJiBlLmlkID49IHdlZWtTdGFydDtcbiAgICAgICAgICAgIH0pWzBdIHx8IG5lc3RlZEV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZS50eXBlID09PSAnbW9udGgnICYmIGlzRnVsbENoaWxkcmVuKGUpICYmIGlzTmVlZFN1Ym1pdChlKSAmJiBlLmlkID49IG1vbnRoU3RhcnQ7XG4gICAgICAgICAgICB9KVswXSB8fCBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGUudHlwZSA9PT0gJ3F1YXJ0ZXInICYmIGlzRnVsbENoaWxkcmVuKGUpICYmIGlzTmVlZFN1Ym1pdChlKSAmJiBlLmlkID49IHF1YXRlclN0YXJ0O1xuICAgICAgICAgICAgfSlbMF0gfHwgbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICd5ZWFyJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSB5ZWFyU3RhcnQ7XG4gICAgICAgICAgICB9KVswXTtcbiAgICAgICAgfTtcblxuXG4gICAgICAgIGxldCBFdmVudHMgPSB7XG4gICAgICAgICAgICBhbGxEYXlFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF5RXZlbnRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsbE5lc3RlZEV2ZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXN0ZWRFdmVudHM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX3VwZGF0ZUZyb21EYXRhOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cyA9IGRhdGEubmVzdGVkRXZlbnRzLm1hcCgoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGUgPSBuZXcgTmVzdGVkRXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMgPSBkYXRhLmRheUV2ZW50cy5tYXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF5RXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV2ZW50cy5fYnVpbGRUcmVlKCk7XG4gICAgICAgICAgICAgICAgRXZlbnRzLl90cmlnZ2VyVXBkYXRlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9hZDogKGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgc3RvcmUubG9hZCgoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5zdGFydERhdGUoKS50aGVuKChkYXRlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydEZyb20gPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEV2ZW50cy5fdXBkYXRlRnJvbURhdGEoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBzdG9yZS5vblVwZGF0ZSgoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBFdmVudHMuX3VwZGF0ZUZyb21EYXRhKGRhdGEpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9idWlsZFRyZWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50RGF0ZSA8IG5ldyBEYXRlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRheSA9IF8uZmluZChkYXlFdmVudHMsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRlLnRvRGF0ZVN0cmluZygpID09PSBjdXJyZW50RGF0ZS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudHMudW5zaGlmdChuZXcgRGF5RXZlbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBuZXcgRGF0ZShjdXJyZW50RGF0ZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmZvcm1hdERhdGUoY3VycmVudERhdGUsICd5eXl5LW1tLWRkJylcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF0ZS5zZXREYXRlKGN1cnJlbnREYXRlLmdldERhdGUoKSArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBFdmVudHMuX3NvcnREYXlzKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVzZXQgY2hpbGRyZW4gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cy5mb3JFYWNoKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRlID0gZGF5LmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGxldCB5ZWFySWQgPSB1dGlscy5maW5kWWVhcklkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgeWVhciA9IEV2ZW50cy5nZXROZXN0ZWQoJ3llYXInLCB5ZWFySWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHllYXIgPSBuZXcgTmVzdGVkRXZlbnQoeyB0eXBlOiAneWVhcicsIGlkOiB5ZWFySWR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cy5wdXNoKHllYXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2F2ZSh5ZWFyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGxldCBxdWFydGVySWQgPSB1dGlscy5maW5kUXVhcnRlcklkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgcXVhcnRlciA9IEV2ZW50cy5nZXROZXN0ZWQoJ3F1YXJ0ZXInLCBxdWFydGVySWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXF1YXJ0ZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1YXJ0ZXIgPSBuZXcgTmVzdGVkRXZlbnQoe3R5cGU6ICdxdWFydGVyJywgaWQ6IHF1YXJ0ZXJJZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2gocXVhcnRlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKHF1YXJ0ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgeWVhci5hZGRDaGlsZChxdWFydGVyKTtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgbW9udGhJZCA9IHV0aWxzLmZpbmRNb250aElkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgbW9udGggPSBFdmVudHMuZ2V0TmVzdGVkKCdtb250aCcsIG1vbnRoSWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIW1vbnRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtb250aCA9IG5ldyBOZXN0ZWRFdmVudCh7dHlwZTogJ21vbnRoJywgaWQ6IG1vbnRoSWR9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cy5wdXNoKG1vbnRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUobW9udGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHF1YXJ0ZXIuYWRkQ2hpbGQobW9udGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCB3ZWVrSWQgPSB1dGlscy5maW5kV2Vla0lkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgd2VlayA9IEV2ZW50cy5nZXROZXN0ZWQoJ3dlZWsnLCB3ZWVrSWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXdlZWspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdlZWsgPSBuZXcgTmVzdGVkRXZlbnQoe3R5cGU6ICd3ZWVrJywgaWQ6IHdlZWtJZH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2god2Vlayk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKHdlZWspO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG1vbnRoLmFkZENoaWxkKHdlZWspO1xuXG4gICAgICAgICAgICAgICAgICAgIHdlZWsuYWRkQ2hpbGQoZGF5KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfc29ydERheXM6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMgPSBfLnNvcnRCeShkYXlFdmVudHMsICdpZCcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9nZXRVbnN1Ym1pdERheTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBfLmZpbmQoZGF5RXZlbnRzLCAoZCkgPT4gIWQudGl0bGUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldENvbWJpbmVkTGlzdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCBsaXN0ID0gW107XG4gICAgICAgICAgICAgICAgbGV0IHllYXJzID0gbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZS50eXBlID09PSAneWVhcic7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhZGROZXN0ZWQoZSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC51bnNoaWZ0KGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnR5cGUgPT09ICd3ZWVrJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChkYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGF5LnRpdGxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpc3QudW5zaGlmdChkYXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGROZXN0ZWQoY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHllYXJzLmZvckVhY2goYWRkTmVzdGVkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbGlzdDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXREYXk6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBkYXlFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE5lc3RlZDogZnVuY3Rpb24gKHR5cGUsIGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5lc3RlZEV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC50eXBlID09PSB0eXBlICYmIGV2ZW50LmlkID09PSBpZDtcbiAgICAgICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRFdmVudDogZnVuY3Rpb24gKHR5cGUsIGlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgPT09ICdkYXknKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFdmVudHMuZ2V0RGF5KGlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gRXZlbnRzLmdldE5lc3RlZCh0eXBlLCBpZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzRGF5U3VibWl0RG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCBkYXkgPSBFdmVudHMuX2dldFVuc3VibWl0RGF5KCk7XG4gICAgICAgICAgICAgICAgaWYgKGRheSkge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcGFzdCA9IGRheS5kYXRlIDwgbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgbGV0IHRvZGF5ID0gZGF5LmRhdGUudG9EYXRlU3RyaW5nKCkgPT09IG5ldyBEYXRlKCkudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhKHBhc3QgfHwgdG9kYXkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpc05lc3RlZFN1Ym1pdERvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gIWZpbmRMb29zZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpc1N1Ym1pdERvbmU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pc0RheVN1Ym1pdERvbmUoKSAmJiB0aGlzLmlzTmVzdGVkU3VibWl0RG9uZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFVuc3VibWl0RGF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCBkYXkgPSBFdmVudHMuX2dldFVuc3VibWl0RGF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheSAmJiBkYXkuZGF0ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGRhdGVEYXlFdmVudDogZnVuY3Rpb24gKGlkLCB0aXRsZSwgc2NvcmUpIHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSB0aGlzLmdldERheShpZCk7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnRpdGxlID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnNjb3JlID0gcGFyc2VJbnQoc2NvcmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKGV2ZW50KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1cGRhdGVOZXN0ZWRFdmVudDogZnVuY3Rpb24gKHR5cGUsIGlkLCBzZWxlY3RlZENoaWxkSWQpIHtcbiAgICAgICAgICAgICAgICBsZXQgZXZlbnQgPSBFdmVudHMuZ2V0TmVzdGVkKHR5cGUsIGlkKTtcblxuICAgICAgICAgICAgICAgIGxldCBvbGRWYXJpYW50ID0gZXZlbnQuc2VsZWN0ZWRDaGlsZElkO1xuICAgICAgICAgICAgICAgIC8vIHZhbGlkYXRlIHNlbGVjdGVkIGlkXG4gICAgICAgICAgICAgICAgbGV0IHZhdGlhbnRzID0gZXZlbnQuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnNlbGVjdGVkQ2hpbGRJZCB8fCBlLmlkO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh2YXRpYW50cy5pbmRleE9mKHNlbGVjdGVkQ2hpbGRJZCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gc3VjaCB2YXJpYW50IHRvIHNlbGVjdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBldmVudC5zZWxlY3RlZENoaWxkSWQgPSBzZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShldmVudCk7XG4gICAgICAgICAgICAgICAgLy8gbm93IHdlIG5lZWQgY2hhbmdlIGFsbCBwYXJlbnRzXG4gICAgICAgICAgICAgICAgaWYgKG9sZFZhcmlhbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlLnNlbGVjdGVkQ2hpbGRJZCA9PT0gb2xkVmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc2VsZWN0ZWRDaGlsZElkID0gc2VsZWN0ZWRDaGlsZElkO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Ym1pdERheUV2ZW50OiBmdW5jdGlvbiAodGl0bGUsIHNjb3JlKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRheSA9IEV2ZW50cy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICBkYXkudGl0bGUgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICBpZiAoc2NvcmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBkYXkuc2NvcmUgPSBwYXJzZUludChzY29yZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUoZGF5KTtcbiAgICAgICAgICAgICAgICBsZXQgdG9TYXZlID0gZGF5RXZlbnRzLm1hcChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGU6IGUudGl0bGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZTogZS5kYXRlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2RheUV2ZW50cycsIEpTT04uc3RyaW5naWZ5KHRvU2F2ZSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuX2J1aWxkVHJlZSgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1Ym1pdE5lc3RlZEV2ZW50OiBmdW5jdGlvbiAodHlwZSwgY2hpbGRJZCkge1xuICAgICAgICAgICAgICAgIGxldCBsb29zZWQgPSBmaW5kTG9vc2VkKCk7XG4gICAgICAgICAgICAgICAgRXZlbnRzLnVwZGF0ZU5lc3RlZEV2ZW50KHR5cGUsIGxvb3NlZC5pZCwgY2hpbGRJZCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VW5zdWJtaXRUeXBlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IHVuc3VibWl0RGF5ID0gdGhpcy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICBsZXQgdW5zdWJtaXROZXN0ZWQgPSBmaW5kTG9vc2VkKCk7XG5cblxuICAgICAgICAgICAgICAgIGlmICh1bnN1Ym1pdERheSAmJiB1bnN1Ym1pdE5lc3RlZCAmJiB1bnN1Ym1pdERheS5kYXRlID4gdW5zdWJtaXROZXN0ZWQuZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5zdWJtaXROZXN0ZWQudHlwZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVuc3VibWl0RGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAnZGF5JztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVuc3VibWl0TmVzdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnN1Ym1pdE5lc3RlZC50eXBlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldFVuc3VibWl0TmVzdGVkRXZlbnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmluZExvb3NlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldE5lc3RlZEV2ZW50VmFyaWFudHM6ICh0eXBlLCBpZCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBsb29zZWQ7XG4gICAgICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvb3NlZCA9IEV2ZW50cy5nZXRFdmVudCh0eXBlLCBpZCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbG9vc2VkID0gZmluZExvb3NlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIWxvb3NlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsb29zZWQudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsb29zZWQuY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvb3NlZC5jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF5RXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlLmlkID09PSBjaGlsZC5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVswXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX3NldFN0YXJ0RGF0ZTogZnVuY3Rpb24gKGRhdGUpIHtcbiAgICAgICAgICAgICAgICBzdGFydEZyb20gPSBuZXcgRGF0ZShkYXRlKTtcbiAgICAgICAgICAgICAgICAvL2xhc3RFdmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAgICAgICAgIC8vbGFzdEV2ZW50RGF0ZS5zZXREYXRlKGxhc3RFdmVudERhdGUuZ2V0RGF0ZSgpKTtcbiAgICAgICAgICAgICAgICBFdmVudHMuX2J1aWxkVHJlZSgpO1xuICAgICAgICAgICAgICAgIGRheUV2ZW50cyA9IGRheUV2ZW50cy5maWx0ZXIoKGQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuZGF0ZSA+IGRhdGUgfHwgZC5kYXRlLnRvRGF0ZVN0cmluZygpID09PSBkYXRlLnRvRGF0ZVN0cmluZygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIEV2ZW50cy5fdXBkYXRlRnVuY3Rpb25zLmZvckVhY2goKGYpID0+IGYoKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX3VwZGF0ZUZ1bmN0aW9uczogW10sXG4gICAgICAgICAgICBvblVwZGF0ZTogKGNiKSA9PiB7XG4gICAgICAgICAgICAgICAgRXZlbnRzLl91cGRhdGVGdW5jdGlvbnMucHVzaChjYik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX3RyaWdnZXJVcGRhdGU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBFdmVudHMuX3VwZGF0ZUZ1bmN0aW9ucy5mb3JFYWNoKChmdW5jKSA9PiBmdW5jKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGZvciBkZWJ1ZztcbiAgICAgICAgd2luZG93LmV2ZW50cyA9IEV2ZW50cztcbiAgICAgICAgcmV0dXJuIEV2ZW50cztcbiAgICB9XG5dKVxuICAgIC5mYWN0b3J5KCdiZWF1dGlmeURhdGUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZ1bmN0aW9uIGJlYXV0aWZ5RGF0ZShldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnR5cGUgPT09ICdkYXknKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRhdGUgPSBtb21lbnQobmV3IERhdGUoZXZlbnQuaWQpKS5jYWxlbmRhcigpO1xuICAgICAgICAgICAgICAgIGlmIChkYXRlLmxhc3RJbmRleE9mKCdhdCcpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBkYXRlID0gZGF0ZS5zbGljZSgwLCBkYXRlLmxhc3RJbmRleE9mKCdhdCcpIC0gMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBkYXRlO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSAnbW9udGgnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1vbWVudChuZXcgRGF0ZShldmVudC5pZCkpLmZvcm1hdCgnTU1NTScpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSAnd2VlaycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1dlZWsgJyArIGV2ZW50LmlkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1F1YXJ0ZXIgJyArIGV2ZW50LmlkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC50eXBlID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ1llYXIgJyArIGV2ZW50LmlkO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZlbnQuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYmVhdXRpZnlEYXRlO1xuICAgIH0pO1xuIl0sInNvdXJjZVJvb3QiOiIuLi8uLi9qc3NyYyJ9