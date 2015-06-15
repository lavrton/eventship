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
}).factory('Events', ['utils', 'settings', 'store', 'DayEvent', 'NestedEvent', function (utils, settings, store, DayEvent, NestedEvent) {

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImV2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLFNBQVMsY0FBYyxDQUFDLFdBQVcsRUFBRTtBQUNqQyxRQUFJLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDekIsUUFBSSxTQUFTLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ3RELGVBQU8sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ3RCLENBQUMsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztBQUNwQyxRQUFJLENBQUMsU0FBUyxFQUFFO0FBQ1osZUFBTyxLQUFLLENBQUM7S0FDaEI7QUFDRCxRQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFOztBQUU3QixZQUFJLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDeEMsWUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFO0FBQ3pCLHdCQUFZLEdBQUcsSUFBSSxDQUFDO1NBQ3ZCO0FBQ0QsWUFBSSxPQUFPLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7QUFDNUMsZUFBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkMsWUFBSSxLQUFLLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQSxDQUFFLFFBQVEsRUFBRSxDQUFDO0FBQy9DLFlBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxLQUFLLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQUFBQyxFQUFFO0FBQ2xFLHdCQUFZLEdBQUcsSUFBSSxDQUFDO1NBQ3ZCO0FBQ0Qsb0JBQVksR0FBRyxZQUFZLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN6RSxtQkFBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7U0FDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQztLQUNiLE1BQU07O0FBRUgsb0JBQVksR0FBRyxJQUFJLENBQUM7QUFDcEIsbUJBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQzFDLHdCQUFZLEdBQUcsWUFBWSxJQUFJLGNBQWMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoRixDQUFDLENBQUM7Ozs7QUFJSCxZQUFJLE9BQU8sWUFBQSxDQUFDO0FBQ1osZUFBTyxJQUFJLEVBQUU7QUFDVCxnQkFBSSxTQUFTLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRTtBQUMxQix5QkFBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDakUsTUFBTTtBQUNILHVCQUFPLEdBQUcsU0FBUyxDQUFDO0FBQ3BCLHNCQUFNO2FBQ1Q7U0FDSjs7QUFFRCxZQUFJLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEMsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDOztBQUV6QyxZQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7QUFDM0Qsd0JBQVksR0FBRyxLQUFLLENBQUM7U0FDeEIsTUFBTTtBQUNILHdCQUFZLEdBQUcsWUFBWSxJQUFJLElBQUksQ0FBQztBQUNwQyxnQkFBSSxLQUFLLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNwQyxnQkFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUNoQyxvQkFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtBQUNyQyxnQ0FBWSxHQUFHLEtBQUssQ0FBQztpQkFDeEI7YUFDSixNQUFNLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7QUFDcEMsb0JBQUksS0FBSyxLQUFLLEVBQUUsRUFBRTtBQUNkLGdDQUFZLEdBQUcsS0FBSyxDQUFDO2lCQUN4QjthQUNKO1NBQ0o7S0FDSjtBQUNELFdBQU8sWUFBWSxDQUFDO0NBQ3ZCOztBQUVELFNBQVMsWUFBWSxDQUFDLFdBQVcsRUFBRTtBQUMvQixXQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsSUFBSSxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUM7Q0FDdEU7O0FBSUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBRXZFLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWTs7QUFFN0IsYUFBUyxRQUFRLENBQUMsSUFBSSxFQUFFO0FBQ3BCLFlBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0FBQ2xCLFlBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUN4QixZQUFJLENBQUMsS0FBSyxHQUFHLEFBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkUsWUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ2xCLFlBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25DOztBQUVELFlBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLFlBQVk7QUFDdEMsZUFBTztBQUNILGdCQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7QUFDZixpQkFBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0FBQ2pCLGNBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtBQUNYLGlCQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7QUFDakIsZ0JBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtTQUM3QixDQUFDO0tBQ0wsQ0FBQzs7QUFFRixXQUFPLFFBQVEsQ0FBQztDQUNuQixDQUFDLENBRUQsT0FBTyxDQUFDLGFBQWEsRUFBRSxZQUFZOztBQUVoQyxhQUFTLE9BQU8sQ0FBQyxLQUFLLEVBQUU7QUFDcEIsWUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtBQUN2QixtQkFBTyxLQUFLLENBQUMsUUFBUSxDQUFDO1NBQ3pCOztBQUVELFlBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUNkLGFBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQUMsS0FBSyxFQUFLO0FBQzlCLGdCQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUN0QyxDQUFDLENBQUM7QUFDSCxlQUFPLElBQUksQ0FBQztLQUNmOztBQUVELGFBQVMsV0FBVyxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUU7QUFDM0IsWUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsWUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDYixZQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztBQUNuQixZQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztLQUMvQjs7QUFFRCxVQUFNLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFO0FBQ2xELFdBQUcsRUFBRSxlQUFZOzs7QUFDYixnQkFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBQyxDQUFDLEVBQUs7QUFDbkMsdUJBQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFLLGVBQWUsQ0FBQzthQUN4QyxDQUFDLENBQUM7O0FBRUgsbUJBQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUM7U0FDM0I7S0FDSixDQUFDLENBQUM7O0FBRUgsVUFBTSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRTtBQUNsRCxXQUFHLEVBQUUsZUFBWTtBQUNiLGdCQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDLEVBQUs7QUFDckMsdUJBQU87QUFDSCx5QkFBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUs7aUJBQzNCLENBQUM7YUFDTCxDQUFDLENBQUM7QUFDSCxtQkFBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN2RDtLQUNKLENBQUMsQ0FBQzs7QUFFSCxlQUFXLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxZQUFZO0FBQ3pDLGVBQU87QUFDSCxnQkFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO0FBQ2YsY0FBRSxFQUFFLElBQUksQ0FBQyxFQUFFO0FBQ1gsMkJBQWUsRUFBRSxJQUFJLENBQUMsZUFBZSxJQUFJLEVBQUU7U0FDOUMsQ0FBQztLQUNMLENBQUM7O0FBRUYsZUFBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBVSxLQUFLLEVBQUU7QUFDOUMsWUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtBQUNyQyxtQkFBTztTQUNWO0FBQ0QsWUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUIsWUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQy9CLG1CQUFPLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztTQUN0QixDQUFDLENBQUM7S0FDTixDQUFDOztBQUVGLFVBQU0sQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUU7QUFDakQsV0FBRyxFQUFFLGVBQVk7QUFDYixnQkFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRTtBQUN6QixvQkFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0Isb0JBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLHVCQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3RCOztBQUVELG1CQUFPLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUM1QjtLQUNKLENBQUMsQ0FBQzs7QUFFSCxXQUFPLFdBQVcsQ0FBQztDQUN0QixDQUFDLENBR0QsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBRXZFLFVBQVUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRTs7QUFFckQsUUFBSSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQzs7Ozs7QUFNM0IsUUFBSSxTQUFTLEdBQUcsRUFBRSxDQUFDO0FBQ25CLFFBQUksWUFBWSxHQUFHLEVBQUUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztBQWdCdEIsUUFBSSxVQUFVLEdBQUcsU0FBYixVQUFVLEdBQWU7QUFDekIsWUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1QyxZQUFJLFVBQVUsR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzlDLFlBQUksV0FBVyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakQsWUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUM1QyxlQUFPLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDcEMsbUJBQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQztTQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksWUFBWSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUN0QyxtQkFBTyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksVUFBVSxDQUFDO1NBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ3RDLG1CQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxJQUFJLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxXQUFXLENBQUM7U0FDOUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDdEMsbUJBQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLElBQUksY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLFNBQVMsQ0FBQztTQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDVCxDQUFDOztBQUdGLFFBQUksTUFBTSxHQUFHO0FBQ1Qsb0JBQVksRUFBRSx3QkFBWTtBQUN0QixtQkFBTyxTQUFTLENBQUM7U0FDcEI7QUFDRCx1QkFBZSxFQUFFLDJCQUFZO0FBQ3pCLG1CQUFPLFlBQVksQ0FBQztTQUN2QjtBQUNELFlBQUksRUFBRSxjQUFDLEVBQUUsRUFBSztBQUNWLGlCQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSSxFQUFLO0FBQ2pCLHdCQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSSxFQUFLO0FBQ2hDLDZCQUFTLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0IsMEJBQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUNwQixzQkFBRSxFQUFFLENBQUM7aUJBQ1IsQ0FBQyxDQUFDO0FBQ0gsNEJBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxVQUFDLElBQUksRUFBSztBQUMzQyx3QkFBSSxDQUFDLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUMscUJBQUMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUN6QywyQkFBTyxDQUFDLENBQUM7aUJBQ1osQ0FBQyxDQUFDO0FBQ0gseUJBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFDLEtBQUssRUFBSztBQUN0QywyQkFBTyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDOUIsQ0FBQyxDQUFDO2FBRU4sQ0FBQyxDQUFDO1NBQ047QUFDRCxrQkFBVSxFQUFFLHNCQUFZO0FBQ3BCLGdCQUFJLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN0QyxtQkFBTyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsRUFBRTtBQUM3QixvQkFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBQyxDQUFDLEVBQUs7QUFDL0IsMkJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxXQUFXLENBQUMsWUFBWSxFQUFFLENBQUM7aUJBQy9ELENBQUMsQ0FBQztBQUNILG9CQUFJLENBQUMsR0FBRyxFQUFFO0FBQ04sNkJBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxRQUFRLENBQUM7QUFDM0IsNEJBQUksRUFBRSxLQUFLO0FBQ1gsNkJBQUssRUFBRSxFQUFFO0FBQ1QsNEJBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDM0IsMEJBQUUsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUM7cUJBQ2xELENBQUMsQ0FBQyxDQUFDO2lCQUNQO0FBQ0QsMkJBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQ2xEO0FBQ0Qsa0JBQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQzs7QUFFbkIsd0JBQVksQ0FBQyxPQUFPLENBQUMsVUFBQyxDQUFDLEVBQUs7QUFDeEIsaUJBQUMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO2FBQ25CLENBQUMsQ0FBQztBQUNILHFCQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFO0FBQzdCLG9CQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO0FBQ3BCLG9CQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BDLG9CQUFJLElBQUksR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUM1QyxvQkFBSSxDQUFDLElBQUksRUFBRTtBQUNQLHdCQUFJLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLGdDQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hCLHlCQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUNwQjs7QUFFRCxvQkFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQyxvQkFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDckQsb0JBQUksQ0FBQyxPQUFPLEVBQUU7QUFDViwyQkFBTyxHQUFHLElBQUksV0FBVyxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNoRCxnQ0FBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMzQix5QkFBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDdkI7O0FBRUQsb0JBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRXZCLG9CQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLG9CQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUMvQyxvQkFBSSxDQUFDLEtBQUssRUFBRTtBQUNSLHlCQUFLLEdBQUcsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzFDLGdDQUFZLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pCLHlCQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2lCQUNyQjtBQUNELHVCQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDOztBQUV4QixvQkFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxvQkFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFDNUMsb0JBQUksQ0FBQyxJQUFJLEVBQUU7QUFDUCx3QkFBSSxHQUFHLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN2QyxnQ0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN4Qix5QkFBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDcEI7QUFDRCxxQkFBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFckIsb0JBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdEIsQ0FBQyxDQUFDO1NBQ047QUFDRCxpQkFBUyxFQUFFLHFCQUFNO0FBQ2IscUJBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUN6QztBQUNELHVCQUFlLEVBQUUsMkJBQU07QUFDbkIsbUJBQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBQyxDQUFDO3VCQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUs7YUFBQSxDQUFDLENBQUM7U0FDN0M7QUFDRCx1QkFBZSxFQUFFLDJCQUFZO0FBQ3pCLGdCQUFJLElBQUksR0FBRyxFQUFFLENBQUM7QUFDZCxnQkFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUN6Qyx1QkFBTyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQzthQUM1QixDQUFDLENBQUM7O0FBRUgscUJBQVMsU0FBUyxDQUFDLENBQUMsRUFBRTs7QUFFbEIsb0JBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUU7QUFDbkIscUJBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsR0FBRyxFQUFFO0FBQzlCLDRCQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7QUFDWCxnQ0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzt5QkFDckI7cUJBQ0osQ0FBQyxDQUFDO2lCQUNOLE1BQU07O0FBRUgscUJBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsS0FBSyxFQUFFO0FBQ2hDLGlDQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7cUJBQ3BCLENBQUMsQ0FBQztpQkFFTjtBQUNELG9CQUFJLENBQUMsQ0FBQyxlQUFlLEVBQUU7QUFDbkIsd0JBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ25CO2FBQ0o7O0FBRUQsaUJBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekIsbUJBQU8sSUFBSSxDQUFDO1NBQ2Y7QUFDRCxjQUFNLEVBQUUsZ0JBQVUsRUFBRSxFQUFFO0FBQ2xCLG1CQUFPLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLEVBQUU7QUFDckMsdUJBQU8sS0FBSyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUM7YUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ1Q7QUFDRCxpQkFBUyxFQUFFLG1CQUFVLElBQUksRUFBRSxFQUFFLEVBQUU7QUFDM0IsbUJBQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN4Qyx1QkFBTyxLQUFLLENBQUMsSUFBSSxLQUFLLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQzthQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDVDtBQUNELGdCQUFRLEVBQUUsa0JBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRTtBQUMxQixnQkFBSSxJQUFJLEtBQUssS0FBSyxFQUFFO0FBQ2hCLHVCQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDNUIsTUFBTTtBQUNILHVCQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2FBQ3JDO1NBQ0o7QUFDRCx1QkFBZSxFQUFFLDJCQUFZO0FBQ3pCLGdCQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDbkMsZ0JBQUksR0FBRyxFQUFFO0FBQ0wsb0JBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUNqQyxvQkFBSSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ2xFLHVCQUFPLEVBQUUsSUFBSSxJQUFJLEtBQUssQ0FBQSxBQUFDLENBQUM7YUFDM0I7QUFDRCxtQkFBTyxJQUFJLENBQUM7U0FDZjtBQUNELDBCQUFrQixFQUFFLDhCQUFZO0FBQzVCLG1CQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7U0FDeEI7QUFDRCxvQkFBWSxFQUFFLHdCQUFZO0FBQ3RCLG1CQUFPLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztTQUM5RDtBQUNELHVCQUFlLEVBQUUsMkJBQVk7QUFDekIsZ0JBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUNuQyxtQkFBTyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQztTQUMxQjtBQUNELHNCQUFjLEVBQUUsd0JBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7QUFDeEMsZ0JBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUIsZ0JBQUksS0FBSyxFQUFFO0FBQ1AscUJBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLHFCQUFLLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUNqQztBQUNELGlCQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3JCO0FBQ0QseUJBQWlCLEVBQUUsMkJBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUU7QUFDcEQsZ0JBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDOztBQUV2QyxnQkFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDLGVBQWUsQ0FBQzs7QUFFdkMsZ0JBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQzNDLHVCQUFPLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUNwQyxDQUFDLENBQUM7QUFDSCxnQkFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQzFDLHNCQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7YUFDaEQ7QUFDRCxpQkFBSyxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7QUFDeEMsaUJBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7O0FBRWxCLGdCQUFJLFVBQVUsRUFBRTtBQUNaLDRCQUFZLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQzlCLHdCQUFJLENBQUMsQ0FBQyxlQUFlLEtBQUssVUFBVSxFQUFFO0FBQ2xDLHlCQUFDLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztxQkFDdkM7QUFDRCx5QkFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakIsQ0FBQyxDQUFDO2FBQ047O0FBRUQsa0JBQU0sQ0FBQyxXQUFXLEVBQUUsQ0FBQztTQUN4QjtBQUNELG1CQUFXLEVBQUUsdUJBQVk7QUFDckIsZ0JBQUksTUFBTSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7QUFDdkMsdUJBQU87QUFDSCxzQkFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ1Isd0JBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtBQUNaLG1DQUFlLEVBQUUsQ0FBQyxDQUFDLGVBQWU7aUJBQ3JDLENBQUM7YUFDTCxDQUFDLENBQUM7QUFDSCx3QkFBWSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1NBQ2hFO0FBQ0Qsc0JBQWMsRUFBRSx3QkFBVSxLQUFLLEVBQUUsS0FBSyxFQUFFO0FBQ3BDLGdCQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsZUFBZSxFQUFFLENBQUM7QUFDbkMsZUFBRyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEIsZ0JBQUksS0FBSyxLQUFLLFNBQVMsRUFBRTtBQUNyQixtQkFBRyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDL0I7QUFDRCxpQkFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQixnQkFBSSxNQUFNLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtBQUNwQyx1QkFBTztBQUNILHlCQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7QUFDZCxzQkFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO0FBQ1Isd0JBQUksRUFBRSxLQUFLO0FBQ1gsd0JBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtpQkFDZixDQUFDO2FBQ0wsQ0FBQyxDQUFDO0FBQ0gsd0JBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMxRCxnQkFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1NBQ3JCO0FBQ0QseUJBQWlCLEVBQUUsMkJBQVUsSUFBSSxFQUFFLE9BQU8sRUFBRTtBQUN4QyxnQkFBSSxNQUFNLEdBQUcsVUFBVSxFQUFFLENBQUM7QUFDMUIsa0JBQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztTQUN0RDtBQUNELHVCQUFlLEVBQUUsMkJBQVk7QUFDekIsZ0JBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztBQUN6QyxnQkFBSSxjQUFjLEdBQUcsVUFBVSxFQUFFLENBQUM7O0FBR2xDLGdCQUFJLFdBQVcsSUFBSSxjQUFjLElBQUksV0FBVyxDQUFDLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFO0FBQ3pFLHVCQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUM7YUFDOUIsTUFBTSxJQUFJLFdBQVcsRUFBRTtBQUNwQix1QkFBTyxLQUFLLENBQUM7YUFDaEIsTUFBTSxJQUFJLGNBQWMsRUFBRTtBQUN2Qix1QkFBTyxjQUFjLENBQUMsSUFBSSxDQUFDO2FBQzlCOztBQUVELG1CQUFPLElBQUksQ0FBQztTQUNmO0FBQ0QsOEJBQXNCLEVBQUUsa0NBQVk7QUFDaEMsbUJBQU8sVUFBVSxFQUFFLENBQUM7U0FDdkI7QUFDRCw4QkFBc0IsRUFBRSxnQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFLO0FBQ2xDLGdCQUFJLE1BQU0sWUFBQSxDQUFDO0FBQ1gsZ0JBQUksRUFBRSxFQUFFO0FBQ0osc0JBQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQzthQUN0QyxNQUFNO0FBQ0gsc0JBQU0sR0FBRyxVQUFVLEVBQUUsQ0FBQzthQUN6QjtBQUNELGdCQUFJLENBQUMsTUFBTSxFQUFFO0FBQ1QsdUJBQU8sRUFBRSxDQUFDO2FBQ2I7QUFDRCxnQkFBSSxNQUFNLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtBQUN4Qix1QkFBTyxNQUFNLENBQUMsUUFBUSxDQUFDO2FBQzFCLE1BQU07QUFDSCx1QkFBTyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEtBQUssRUFBRTtBQUN4QywyQkFBTyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxFQUFFO0FBQ2pDLCtCQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLGVBQWUsQ0FBQztxQkFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNULENBQUMsQ0FBQzthQUNOO1NBQ0o7O0FBRUQscUJBQWEsRUFBRSx1QkFBVSxJQUFJLEVBQUU7QUFDM0IscUJBQVMsR0FBRyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs7O0FBRzNCLGtCQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDcEIscUJBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQUMsQ0FBQyxFQUFLO0FBQ2hDLHVCQUFPLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2FBQ3pFLENBQUMsQ0FBQztBQUNILGtCQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQUMsQ0FBQzt1QkFBSyxDQUFDLEVBQUU7YUFBQSxDQUFDLENBQUM7U0FDL0M7QUFDRCx3QkFBZ0IsRUFBRSxFQUFFO0FBQ3BCLGdCQUFRLEVBQUUsa0JBQUMsRUFBRSxFQUFLO0FBQ2Qsa0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDcEM7S0FDSixDQUFDOzs7QUFHRixVQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztBQUN2QixXQUFPLE1BQU0sQ0FBQztDQUNqQixDQUNKLENBQUMsQ0FDRyxPQUFPLENBQUMsY0FBYyxFQUFFLFlBQVk7QUFDakMsYUFBUyxZQUFZLENBQUMsS0FBSyxFQUFFO0FBQ3pCLFlBQUksS0FBSyxDQUFDLElBQUksS0FBSyxLQUFLLEVBQUU7QUFDdEIsZ0JBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNqRCxnQkFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQy9CLG9CQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUNwRDtBQUNELG1CQUFPLElBQUksQ0FBQztTQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE9BQU8sRUFBRTtBQUMvQixtQkFBTyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRTtBQUM5QixtQkFBTyxPQUFPLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztTQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7QUFDakMsbUJBQU8sVUFBVSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7U0FDaEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFO0FBQzlCLG1CQUFPLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1NBQzdCLE1BQU07QUFDSCxtQkFBTyxLQUFLLENBQUMsRUFBRSxDQUFDO1NBQ25CO0tBQ0o7O0FBRUQsV0FBTyxZQUFZLENBQUM7Q0FDdkIsQ0FBQyxDQUFDIiwiZmlsZSI6ImV2ZW50cy5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIGlzRnVsbENoaWxkcmVuKG5lc3RlZEV2ZW50KSB7XG4gICAgbGV0IGZ1bGxDaGlsZHJlbiA9IGZhbHNlO1xuICAgIGxldCBsYXN0Q2hpbGQgPSBuZXN0ZWRFdmVudC5jaGlsZHJlbi5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLmlkID4gYi5pZDtcbiAgICB9KVtuZXN0ZWRFdmVudC5jaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICBpZiAoIWxhc3RDaGlsZCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChuZXN0ZWRFdmVudC50eXBlID09PSAnd2VlaycpIHtcbiAgICAgICAgLy8gZm9yIHdlZWsgY2hvb3NlclxuICAgICAgICBsZXQgdGVtcERhdGUgPSBuZXcgRGF0ZShsYXN0Q2hpbGQuZGF0ZSk7XG4gICAgICAgIGlmICh0ZW1wRGF0ZS5nZXREYXkoKSA9PT0gMCkge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbmV4dERheSA9IG5ldyBEYXRlKHRlbXBEYXRlLnRvU3RyaW5nKCkpO1xuICAgICAgICBuZXh0RGF5LnNldERhdGUobmV4dERheS5nZXREYXRlKCkgKyAxKTtcbiAgICAgICAgbGV0IHZhbHVlID0gKGxhc3RDaGlsZC50aXRsZSB8fCAnJykudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKG5leHREYXkuZ2V0TW9udGgoKSAhPT0gdGVtcERhdGUuZ2V0TW9udGgoKSAmJiAodmFsdWUubGVuZ3RoID4gMikpIHtcbiAgICAgICAgICAgIGZ1bGxDaGlsZHJlbiA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgZnVsbENoaWxkcmVuID0gZnVsbENoaWxkcmVuICYmICFuZXN0ZWRFdmVudC5jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGNoaWxkKSB7XG4gICAgICAgICAgICByZXR1cm4gIWNoaWxkLnRpdGxlO1xuICAgICAgICB9KS5sZW5ndGg7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZm9yIG1vbnRoLCBxdWF0ZXIsIHllYXJcbiAgICAgICAgZnVsbENoaWxkcmVuID0gdHJ1ZTtcbiAgICAgICAgbmVzdGVkRXZlbnQuY2hpbGRyZW4uZm9yRWFjaChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgIGZ1bGxDaGlsZHJlbiA9IGZ1bGxDaGlsZHJlbiAmJiBpc0Z1bGxDaGlsZHJlbihjaGlsZCkgJiYgIWlzTmVlZFN1Ym1pdChjaGlsZCk7XG4gICAgICAgIH0pO1xuICAgICAgICAvL2lmICghY2hpbGRyZW5Eb25lKSB7XG4gICAgICAgIC8vICAgIGZ1bGxDaGlsZHJlbiA9IGZhbHNlO1xuICAgICAgICAvL31cbiAgICAgICAgbGV0IGxhc3REYXk7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICBpZiAobGFzdENoaWxkLnR5cGUgIT09ICdkYXknKSB7XG4gICAgICAgICAgICAgICAgbGFzdENoaWxkID0gbGFzdENoaWxkLmNoaWxkcmVuW2xhc3RDaGlsZC5jaGlsZHJlbi5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGFzdERheSA9IGxhc3RDaGlsZDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyDRgtC10L/QtdGA0Ywg0L3QsNGF0L7QtNC40Lwg0YHQu9C10LTRg9GO0YnQuNC5INC30LAg0L/QvtGB0LvQtdC00L3QuNC8INC00LXQvdGMXG4gICAgICAgIGxldCBuZXh0RGF5XyA9IG5ldyBEYXRlKGxhc3REYXkuZGF0ZSk7XG4gICAgICAgIG5leHREYXlfLnNldERhdGUobmV4dERheV8uZ2V0RGF0ZSgpICsgMSk7XG4gICAgICAgIC8vINC10YHQu9C4INC80LXRgdGP0YYg0L7RgdGC0LDRkdGC0YHRjyDRgtCw0LrQvtC5INC20LUsINC30L3QsNGH0LjRgiDQtdGJ0LUg0L3QtSDQstGB0LUg0LTQsNC90L3Ri9C1INCy0LLQtdC00LXQvdGLXG4gICAgICAgIGlmIChuZXh0RGF5Xy5nZXRNb250aCgpID09PSBuZXcgRGF0ZShsYXN0RGF5LmRhdGUpLmdldE1vbnRoKCkpIHtcbiAgICAgICAgICAgIGZ1bGxDaGlsZHJlbiA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZnVsbENoaWxkcmVuICYmIHRydWU7XG4gICAgICAgICAgICBsZXQgbW9udGggPSBsYXN0RGF5LmRhdGUuZ2V0TW9udGgoKTtcbiAgICAgICAgICAgIGlmIChuZXN0ZWRFdmVudC50eXBlID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICBpZiAoWzIsIDUsIDgsIDExXS5pbmRleE9mKG1vbnRoKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZnVsbENoaWxkcmVuID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChuZXN0ZWRFdmVudC50eXBlID09PSAneWVhcicpIHtcbiAgICAgICAgICAgICAgICBpZiAobW9udGggIT09IDExKSB7XG4gICAgICAgICAgICAgICAgICAgIGZ1bGxDaGlsZHJlbiA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZnVsbENoaWxkcmVuO1xufVxuXG5mdW5jdGlvbiBpc05lZWRTdWJtaXQobmVzdGVkRXZlbnQpIHtcbiAgICByZXR1cm4gIW5lc3RlZEV2ZW50LnNlbGVjdGVkQ2hpbGRJZCAmJiBpc0Z1bGxDaGlsZHJlbihuZXN0ZWRFdmVudCk7XG59XG5cblxuXG5hbmd1bGFyLm1vZHVsZSgnbWllLmV2ZW50cycsIFsnbWllLnV0aWxzJywgJ21pZS5zZXR0aW5ncycsICdtaWUuc3RvcmUnXSlcblxuLmZhY3RvcnkoJ0RheUV2ZW50JywgZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gRGF5RXZlbnQoZGF0YSkge1xuICAgICAgICB0aGlzLnR5cGUgPSAnZGF5JztcbiAgICAgICAgdGhpcy50aXRsZSA9IGRhdGEudGl0bGU7XG4gICAgICAgIHRoaXMuc2NvcmUgPSAoZGF0YS5zY29yZSAhPT0gdW5kZWZpbmVkKSA/IHBhcnNlSW50KGRhdGEuc2NvcmUpIDogMjtcbiAgICAgICAgdGhpcy5pZCA9IGRhdGEuaWQ7XG4gICAgICAgIHRoaXMuZGF0ZSA9IG5ldyBEYXRlKGRhdGEuZGF0ZSk7XG4gICAgfVxuXG4gICAgRGF5RXZlbnQucHJvdG90eXBlLnRvT2JqZWN0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdHlwZTogdGhpcy50eXBlLFxuICAgICAgICAgICAgdGl0bGU6IHRoaXMudGl0bGUsXG4gICAgICAgICAgICBpZDogdGhpcy5pZCxcbiAgICAgICAgICAgIHNjb3JlOiB0aGlzLnNjb3JlLFxuICAgICAgICAgICAgZGF0ZTogdGhpcy5kYXRlLnRvU3RyaW5nKClcbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIERheUV2ZW50O1xufSlcblxuLmZhY3RvcnkoJ05lc3RlZEV2ZW50JywgZnVuY3Rpb24gKCkge1xuXG4gICAgZnVuY3Rpb24gZ2V0RGF5cyhldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICByZXR1cm4gZXZlbnQuY2hpbGRyZW47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZGF5cyA9IFtdO1xuICAgICAgICBldmVudC5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4ge1xuICAgICAgICAgICAgZGF5cyA9IGRheXMuY29uY2F0KGdldERheXMoY2hpbGQpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBkYXlzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIE5lc3RlZEV2ZW50KHR5cGUsIGlkKSB7XG4gICAgICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuaWQgPSBpZDtcbiAgICAgICAgdGhpcy5jaGlsZHJlbiA9IFtdO1xuICAgICAgICB0aGlzLnNlbGVjdGVkQ2hpbGRJZCA9IG51bGw7XG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE5lc3RlZEV2ZW50LnByb3RvdHlwZSwgJ3RpdGxlJywge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxldCBkYXkgPSBfLmZpbmQoZ2V0RGF5cyh0aGlzKSwgKGQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZC5pZCA9PT0gdGhpcy5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIGRheSAmJiBkYXkudGl0bGU7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShOZXN0ZWRFdmVudC5wcm90b3R5cGUsICdzY29yZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBsZXQgc3VtID0gdGhpcy5jaGlsZHJlbi5yZWR1Y2UoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBzY29yZTogYS5zY29yZSArIGIuc2NvcmVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZChzdW0uc2NvcmUgLyB0aGlzLmNoaWxkcmVuLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIE5lc3RlZEV2ZW50LnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHR5cGU6IHRoaXMudHlwZSxcbiAgICAgICAgICAgIGlkOiB0aGlzLmlkLFxuICAgICAgICAgICAgc2VsZWN0ZWRDaGlsZElkOiB0aGlzLnNlbGVjdGVkQ2hpbGRJZCB8fCAnJ1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICBOZXN0ZWRFdmVudC5wcm90b3R5cGUuYWRkQ2hpbGQgPSBmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgaWYgKHRoaXMuY2hpbGRyZW4uaW5kZXhPZihjaGlsZCkgIT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jaGlsZHJlbi5wdXNoKGNoaWxkKTtcbiAgICAgICAgdGhpcy5jaGlsZHJlbi5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pZCA+IGIuaWQ7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTmVzdGVkRXZlbnQucHJvdG90eXBlLCAnZGF0ZScsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy50eXBlID09PSAncXVhcnRlcicpIHtcbiAgICAgICAgICAgICAgICBsZXQgcGFydHMgPSB0aGlzLmlkLnNwbGl0KCctJyk7XG4gICAgICAgICAgICAgICAgbGV0IGQgPSBwYXJ0c1swXSArICctMCcgKyBwYXJ0c1sxXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZSh0aGlzLmlkKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE5lc3RlZEV2ZW50O1xufSlcblxuXG4uZmFjdG9yeSgnRXZlbnRzJywgWyd1dGlscycsICdzZXR0aW5ncycsICdzdG9yZScsICdEYXlFdmVudCcsICdOZXN0ZWRFdmVudCcsXG5cbiAgICBmdW5jdGlvbiAodXRpbHMsIHNldHRpbmdzLCBzdG9yZSwgRGF5RXZlbnQsIE5lc3RlZEV2ZW50KSB7XG5cbiAgICAgICAgbGV0IHN0YXJ0RnJvbSA9IG5ldyBEYXRlKCk7XG4gICAgICAgIC8vbGV0IGxhc3RFdmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAvL2xhc3RFdmVudERhdGUuc2V0RGF0ZShzdGFydEZyb20uZ2V0RGF0ZSgpIC0gMSk7XG4gICAgICAgIC8vbGV0IGxhc3RJZCA9IDA7XG5cblxuICAgICAgICBsZXQgZGF5RXZlbnRzID0gW107XG4gICAgICAgIGxldCBuZXN0ZWRFdmVudHMgPSBbXTtcblxuICAgICAgICAvLyhKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCduZXN0ZWRFdmVudHMnKSkgfHwgW10pLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgLy8gICAgbGV0IGUgPSBuZXcgTmVzdGVkRXZlbnQoaXRlbS50eXBlLCBpdGVtLmlkKTtcbiAgICAgICAgLy8gICAgZS5zZWxlY3RlZENoaWxkSWQgPSBpdGVtLnNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgLy8gICAgbmVzdGVkRXZlbnRzLnB1c2goZSk7XG4gICAgICAgIC8vfSk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vLy8gZmluZCBsYXN0IGRhdGVcbiAgICAgICAgLy9kYXlFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gICAgZXZlbnQuZGF0ZSA9IG5ldyBEYXRlKGV2ZW50LmRhdGUpO1xuICAgICAgICAvLyAgICBsYXN0SWQgPSBNYXRoLm1heChsYXN0SWQsIGV2ZW50LmlkKTtcbiAgICAgICAgLy8gICAgbGFzdEV2ZW50RGF0ZSA9IG5ldyBEYXRlKE1hdGgubWF4KE51bWJlcihsYXN0RXZlbnREYXRlKSwgZXZlbnQuZGF0ZSkpO1xuICAgICAgICAvL30pO1xuICAgICAgICAvL2xhc3RFdmVudERhdGUuc2V0RGF0ZShsYXN0RXZlbnREYXRlLmdldERhdGUoKSArIDEpO1xuXG4gICAgICAgIGxldCBmaW5kTG9vc2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgbGV0IHdlZWtTdGFydCA9IHV0aWxzLmZpbmRXZWVrSWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCBtb250aFN0YXJ0ID0gdXRpbHMuZmluZE1vbnRoSWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCBxdWF0ZXJTdGFydCA9IHV0aWxzLmZpbmRRdWFydGVySWQoc3RhcnRGcm9tKTtcbiAgICAgICAgICAgIGxldCB5ZWFyU3RhcnQgPSB1dGlscy5maW5kWWVhcklkKHN0YXJ0RnJvbSk7XG4gICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICd3ZWVrJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSB3ZWVrU3RhcnQ7XG4gICAgICAgICAgICB9KVswXSB8fCBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGUudHlwZSA9PT0gJ21vbnRoJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSBtb250aFN0YXJ0O1xuICAgICAgICAgICAgfSlbMF0gfHwgbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICdxdWFydGVyJyAmJiBpc0Z1bGxDaGlsZHJlbihlKSAmJiBpc05lZWRTdWJtaXQoZSkgJiYgZS5pZCA+PSBxdWF0ZXJTdGFydDtcbiAgICAgICAgICAgIH0pWzBdIHx8IG5lc3RlZEV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZS50eXBlID09PSAneWVhcicgJiYgaXNGdWxsQ2hpbGRyZW4oZSkgJiYgaXNOZWVkU3VibWl0KGUpICYmIGUuaWQgPj0geWVhclN0YXJ0O1xuICAgICAgICAgICAgfSlbMF07XG4gICAgICAgIH07XG5cblxuICAgICAgICBsZXQgRXZlbnRzID0ge1xuICAgICAgICAgICAgYWxsRGF5RXZlbnRzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheUV2ZW50cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGxOZXN0ZWRFdmVudHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxvYWQ6IChjYikgPT4ge1xuICAgICAgICAgICAgICAgIHN0b3JlLmxvYWQoKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3Muc3RhcnREYXRlKCkudGhlbigoZGF0ZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRGcm9tID0gbmV3IERhdGUoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBFdmVudHMuX2J1aWxkVHJlZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cyA9IGRhdGEubmVzdGVkRXZlbnRzLm1hcCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGUgPSBuZXcgTmVzdGVkRXZlbnQoaXRlbS50eXBlLCBpdGVtLmlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc2VsZWN0ZWRDaGlsZElkID0gaXRlbS5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGRheUV2ZW50cyA9IGRhdGEuZGF5RXZlbnRzLm1hcCgoZXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF5RXZlbnQoZXZlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9idWlsZFRyZWU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudERhdGUgPSBuZXcgRGF0ZShzdGFydEZyb20pO1xuICAgICAgICAgICAgICAgIHdoaWxlIChjdXJyZW50RGF0ZSA8IG5ldyBEYXRlKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRheSA9IF8uZmluZChkYXlFdmVudHMsIChkKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRlLnRvRGF0ZVN0cmluZygpID09PSBjdXJyZW50RGF0ZS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXlFdmVudHMudW5zaGlmdChuZXcgRGF5RXZlbnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdkYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpdGxlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBuZXcgRGF0ZShjdXJyZW50RGF0ZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHV0aWxzLmZvcm1hdERhdGUoY3VycmVudERhdGUsICd5eXl5LW1tLWRkJylcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50RGF0ZS5zZXREYXRlKGN1cnJlbnREYXRlLmdldERhdGUoKSArIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBFdmVudHMuX3NvcnREYXlzKCk7XG4gICAgICAgICAgICAgICAgLy8gcmVzZXQgY2hpbGRyZW4gcmVmZXJlbmNlc1xuICAgICAgICAgICAgICAgIG5lc3RlZEV2ZW50cy5mb3JFYWNoKChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUuY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkYXlFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBkYXRlID0gZGF5LmRhdGU7XG4gICAgICAgICAgICAgICAgICAgIGxldCB5ZWFySWQgPSB1dGlscy5maW5kWWVhcklkKGRhdGUpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgeWVhciA9IEV2ZW50cy5nZXROZXN0ZWQoJ3llYXInLCB5ZWFySWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXllYXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHllYXIgPSBuZXcgTmVzdGVkRXZlbnQoJ3llYXInLCB5ZWFySWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2goeWVhcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKHllYXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHF1YXJ0ZXJJZCA9IHV0aWxzLmZpbmRRdWFydGVySWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBxdWFydGVyID0gRXZlbnRzLmdldE5lc3RlZCgncXVhcnRlcicsIHF1YXJ0ZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcXVhcnRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVhcnRlciA9IG5ldyBOZXN0ZWRFdmVudCgncXVhcnRlcicsIHF1YXJ0ZXJJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMucHVzaChxdWFydGVyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUocXVhcnRlcik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB5ZWFyLmFkZENoaWxkKHF1YXJ0ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb250aElkID0gdXRpbHMuZmluZE1vbnRoSWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCBtb250aCA9IEV2ZW50cy5nZXROZXN0ZWQoJ21vbnRoJywgbW9udGhJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghbW9udGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vbnRoID0gbmV3IE5lc3RlZEV2ZW50KCdtb250aCcsIG1vbnRoSWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzdGVkRXZlbnRzLnB1c2gobW9udGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShtb250aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcXVhcnRlci5hZGRDaGlsZChtb250aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IHdlZWtJZCA9IHV0aWxzLmZpbmRXZWVrSWQoZGF0ZSk7XG4gICAgICAgICAgICAgICAgICAgIGxldCB3ZWVrID0gRXZlbnRzLmdldE5lc3RlZCgnd2VlaycsIHdlZWtJZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghd2Vlaykge1xuICAgICAgICAgICAgICAgICAgICAgICAgd2VlayA9IG5ldyBOZXN0ZWRFdmVudCgnd2VlaycsIHdlZWtJZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMucHVzaCh3ZWVrKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUod2Vlayk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbW9udGguYWRkQ2hpbGQod2Vlayk7XG5cbiAgICAgICAgICAgICAgICAgICAgd2Vlay5hZGRDaGlsZChkYXkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9zb3J0RGF5czogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGRheUV2ZW50cyA9IF8uc29ydEJ5KGRheUV2ZW50cywgJ2lkJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX2dldFVuc3VibWl0RGF5OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF8uZmluZChkYXlFdmVudHMsIChkKSA9PiAhZC50aXRsZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0Q29tYmluZWRMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGxpc3QgPSBbXTtcbiAgICAgICAgICAgICAgICBsZXQgeWVhcnMgPSBuZXN0ZWRFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlLnR5cGUgPT09ICd5ZWFyJztcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGFkZE5lc3RlZChlKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24gKGRheSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXkudGl0bGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC51bnNoaWZ0KGRheSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL2NvbnNvbGUubG9nKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZE5lc3RlZChjaGlsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdC51bnNoaWZ0KGUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgeWVhcnMuZm9yRWFjaChhZGROZXN0ZWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBsaXN0O1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldERheTogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRheUV2ZW50cy5maWx0ZXIoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBldmVudC5pZCA9PT0gaWQ7XG4gICAgICAgICAgICAgICAgfSlbMF07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TmVzdGVkOiBmdW5jdGlvbiAodHlwZSwgaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmVzdGVkRXZlbnRzLmZpbHRlcihmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LnR5cGUgPT09IHR5cGUgJiYgZXZlbnQuaWQgPT09IGlkO1xuICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGdldEV2ZW50OiBmdW5jdGlvbiAodHlwZSwgaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2RheScpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEV2ZW50cy5nZXREYXkoaWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBFdmVudHMuZ2V0TmVzdGVkKHR5cGUsIGlkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaXNEYXlTdWJtaXREb25lOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRheSA9IEV2ZW50cy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF5KSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXN0ID0gZGF5LmRhdGUgPCBuZXcgRGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBsZXQgdG9kYXkgPSBkYXkuZGF0ZS50b0RhdGVTdHJpbmcoKSA9PT0gbmV3IERhdGUoKS50b0RhdGVTdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICEocGFzdCB8fCB0b2RheSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzTmVzdGVkU3VibWl0RG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhZmluZExvb3NlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlzU3VibWl0RG9uZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlzRGF5U3VibWl0RG9uZSgpICYmIHRoaXMuaXNOZXN0ZWRTdWJtaXREb25lKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VW5zdWJtaXREYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IGRheSA9IEV2ZW50cy5fZ2V0VW5zdWJtaXREYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZGF5ICYmIGRheS5kYXRlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVwZGF0ZURheUV2ZW50OiBmdW5jdGlvbiAoaWQsIHRpdGxlLCBzY29yZSkge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IHRoaXMuZ2V0RGF5KGlkKTtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQudGl0bGUgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuc2NvcmUgPSBwYXJzZUludChzY29yZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN0b3JlLnNhdmUoZXZlbnQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVwZGF0ZU5lc3RlZEV2ZW50OiBmdW5jdGlvbiAodHlwZSwgaWQsIHNlbGVjdGVkQ2hpbGRJZCkge1xuICAgICAgICAgICAgICAgIGxldCBldmVudCA9IEV2ZW50cy5nZXROZXN0ZWQodHlwZSwgaWQpO1xuXG4gICAgICAgICAgICAgICAgbGV0IG9sZFZhcmlhbnQgPSBldmVudC5zZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgLy8gdmFsaWRhdGUgc2VsZWN0ZWQgaWRcbiAgICAgICAgICAgICAgICBsZXQgdmF0aWFudHMgPSBldmVudC5jaGlsZHJlbi5tYXAoZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUuc2VsZWN0ZWRDaGlsZElkIHx8IGUuaWQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZhdGlhbnRzLmluZGV4T2Yoc2VsZWN0ZWRDaGlsZElkKSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBzdWNoIHZhcmlhbnQgdG8gc2VsZWN0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGV2ZW50LnNlbGVjdGVkQ2hpbGRJZCA9IHNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKGV2ZW50KTtcbiAgICAgICAgICAgICAgICAvLyBub3cgd2UgbmVlZCBjaGFuZ2UgYWxsIHBhcmVudHNcbiAgICAgICAgICAgICAgICBpZiAob2xkVmFyaWFudCkge1xuICAgICAgICAgICAgICAgICAgICBuZXN0ZWRFdmVudHMuZm9yRWFjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUuc2VsZWN0ZWRDaGlsZElkID09PSBvbGRWYXJpYW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zZWxlY3RlZENoaWxkSWQgPSBzZWxlY3RlZENoaWxkSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5zYXZlKGUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBFdmVudHMuX3NhdmVOZXN0ZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfc2F2ZU5lc3RlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCB0b1NhdmUgPSBuZXN0ZWRFdmVudHMubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogZS5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGUudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkQ2hpbGRJZDogZS5zZWxlY3RlZENoaWxkSWRcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnbmVzdGVkRXZlbnRzJywgSlNPTi5zdHJpbmdpZnkodG9TYXZlKSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VibWl0RGF5RXZlbnQ6IGZ1bmN0aW9uICh0aXRsZSwgc2NvcmUpIHtcbiAgICAgICAgICAgICAgICBsZXQgZGF5ID0gRXZlbnRzLl9nZXRVbnN1Ym1pdERheSgpO1xuICAgICAgICAgICAgICAgIGRheS50aXRsZSA9IHRpdGxlO1xuICAgICAgICAgICAgICAgIGlmIChzY29yZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGRheS5zY29yZSA9IHBhcnNlSW50KHNjb3JlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3RvcmUuc2F2ZShkYXkpO1xuICAgICAgICAgICAgICAgIGxldCB0b1NhdmUgPSBkYXlFdmVudHMubWFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aXRsZTogZS50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBlLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2RheScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlOiBlLmRhdGVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZGF5RXZlbnRzJywgSlNPTi5zdHJpbmdpZnkodG9TYXZlKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5fYnVpbGRUcmVlKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3VibWl0TmVzdGVkRXZlbnQ6IGZ1bmN0aW9uICh0eXBlLCBjaGlsZElkKSB7XG4gICAgICAgICAgICAgICAgbGV0IGxvb3NlZCA9IGZpbmRMb29zZWQoKTtcbiAgICAgICAgICAgICAgICBFdmVudHMudXBkYXRlTmVzdGVkRXZlbnQodHlwZSwgbG9vc2VkLmlkLCBjaGlsZElkKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBnZXRVbnN1Ym1pdFR5cGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgdW5zdWJtaXREYXkgPSB0aGlzLl9nZXRVbnN1Ym1pdERheSgpO1xuICAgICAgICAgICAgICAgIGxldCB1bnN1Ym1pdE5lc3RlZCA9IGZpbmRMb29zZWQoKTtcblxuXG4gICAgICAgICAgICAgICAgaWYgKHVuc3VibWl0RGF5ICYmIHVuc3VibWl0TmVzdGVkICYmIHVuc3VibWl0RGF5LmRhdGUgPiB1bnN1Ym1pdE5lc3RlZC5kYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bnN1Ym1pdE5lc3RlZC50eXBlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodW5zdWJtaXREYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdkYXknO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodW5zdWJtaXROZXN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuc3VibWl0TmVzdGVkLnR5cGU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0VW5zdWJtaXROZXN0ZWRFdmVudDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmaW5kTG9vc2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZ2V0TmVzdGVkRXZlbnRWYXJpYW50czogKHR5cGUsIGlkKSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGxvb3NlZDtcbiAgICAgICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9vc2VkID0gRXZlbnRzLmdldEV2ZW50KHR5cGUsIGlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsb29zZWQgPSBmaW5kTG9vc2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghbG9vc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxvb3NlZC50eXBlID09PSAnd2VlaycpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxvb3NlZC5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbG9vc2VkLmNoaWxkcmVuLm1hcChmdW5jdGlvbiAoY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXlFdmVudHMuZmlsdGVyKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUuaWQgPT09IGNoaWxkLnNlbGVjdGVkQ2hpbGRJZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pWzBdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBfc2V0U3RhcnREYXRlOiBmdW5jdGlvbiAoZGF0ZSkge1xuICAgICAgICAgICAgICAgIHN0YXJ0RnJvbSA9IG5ldyBEYXRlKGRhdGUpO1xuICAgICAgICAgICAgICAgIC8vbGFzdEV2ZW50RGF0ZSA9IG5ldyBEYXRlKHN0YXJ0RnJvbSk7XG4gICAgICAgICAgICAgICAgLy9sYXN0RXZlbnREYXRlLnNldERhdGUobGFzdEV2ZW50RGF0ZS5nZXREYXRlKCkpO1xuICAgICAgICAgICAgICAgIEV2ZW50cy5fYnVpbGRUcmVlKCk7XG4gICAgICAgICAgICAgICAgZGF5RXZlbnRzID0gZGF5RXZlbnRzLmZpbHRlcigoZCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5kYXRlID4gZGF0ZSB8fCBkLmRhdGUudG9EYXRlU3RyaW5nKCkgPT09IGRhdGUudG9EYXRlU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgRXZlbnRzLl91cGRhdGVGdW5jdGlvbnMuZm9yRWFjaCgoZikgPT4gZigpKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfdXBkYXRlRnVuY3Rpb25zOiBbXSxcbiAgICAgICAgICAgIG9uVXBkYXRlOiAoY2IpID0+IHtcbiAgICAgICAgICAgICAgICBFdmVudHMuX3VwZGF0ZUZ1bmN0aW9ucy5wdXNoKGNiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBmb3IgZGVidWc7XG4gICAgICAgIHdpbmRvdy5ldmVudHMgPSBFdmVudHM7XG4gICAgICAgIHJldHVybiBFdmVudHM7XG4gICAgfVxuXSlcbiAgICAuZmFjdG9yeSgnYmVhdXRpZnlEYXRlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBmdW5jdGlvbiBiZWF1dGlmeURhdGUoZXZlbnQpIHtcbiAgICAgICAgICAgIGlmIChldmVudC50eXBlID09PSAnZGF5Jykge1xuICAgICAgICAgICAgICAgIGxldCBkYXRlID0gbW9tZW50KG5ldyBEYXRlKGV2ZW50LmlkKSkuY2FsZW5kYXIoKTtcbiAgICAgICAgICAgICAgICBpZiAoZGF0ZS5sYXN0SW5kZXhPZignYXQnKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZSA9IGRhdGUuc2xpY2UoMCwgZGF0ZS5sYXN0SW5kZXhPZignYXQnKSAtIDEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZGF0ZTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ21vbnRoJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBtb21lbnQobmV3IERhdGUoZXZlbnQuaWQpKS5mb3JtYXQoJ01NTU0nKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3dlZWsnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdXZWVrICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3F1YXJ0ZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdRdWFydGVyICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZXZlbnQudHlwZSA9PT0gJ3llYXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdZZWFyICcgKyBldmVudC5pZDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2ZW50LmlkO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJlYXV0aWZ5RGF0ZTtcbiAgICB9KTsiXSwic291cmNlUm9vdCI6Ii4uLy4uL2pzc3JjIn0=