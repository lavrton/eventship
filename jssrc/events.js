function isFullChildren(nestedEvent) {
    let fullChildren = false;
    let lastChild = nestedEvent.children.sort(function (a, b) {
        return a.id > b.id;
    })[nestedEvent.children.length - 1];
    if (!lastChild) {
        return false;
    }
    if (nestedEvent.type === 'week') {
        // for week chooser
        let tempDate = new Date(lastChild.date);
        if (tempDate.getDay() === 0) {
            fullChildren = true;
        }
        let nextDay = new Date(tempDate.toString());
        nextDay.setDate(nextDay.getDate() + 1);
        let value = (lastChild.title || '').toString();
        if (nextDay.getMonth() !== tempDate.getMonth() && (value.length >= 1)) {
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
        let lastDay;
        while (true) {
            if (lastChild.type !== 'day') {
                lastChild = lastChild.children[lastChild.children.length - 1];
            } else {
                lastDay = lastChild;
                break;
            }
        }
        // теперь находим следующий за последним день
        let nextDay_ = new Date(lastDay.date);
        nextDay_.setDate(nextDay_.getDate() + 1);
        // если месяц остаётся такой же, значит еще не все данные введены
        if (nextDay_.getMonth() === new Date(lastDay.date).getMonth()) {
            fullChildren = false;
        } else {
            fullChildren = fullChildren && true;
            let month = lastDay.date.getMonth();
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
    if (isFullChildren(nestedEvent)) {
        if (nestedEvent.children.length === 1) {
            let child = nestedEvent.children[0];
            nestedEvent.selectedChildId = child.selectedChildId || child.id;
        }
        return !nestedEvent.selectedChildId;
    }
    return false;
}



angular.module('mie.events', ['mie.utils', 'mie.settings', 'mie.store'])

.factory('DayEvent', function () {

    function DayEvent(data) {
        this.type = 'day';
        this.title = data.title;
        this.score = (data.score !== undefined) ? parseInt(data.score) : 2;
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
})

.factory('NestedEvent', function () {

    function getDays(event) {
        if (event.type === 'week') {
            return event.children;
        }

        let days = [];
        event.children.forEach((child) => {
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
        get: function () {
            let day = _.find(getDays(this), (d) => {
                return d.id === this.selectedChildId;
            });

            return day && day.title;
        }
    });

    Object.defineProperty(NestedEvent.prototype, 'score', {
        get: function () {
            let sum = this.children.reduce((a, b) => {
                return {
                    score: a.score + b.score
                };
            });
            return Math.round(sum.score / this.children.length);
        }
    });

    NestedEvent.prototype.toObject = function () {
        let obj = {
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
        get: function () {
            if (this.type === 'quarter') {
                let parts = this.id.split('-');
                let d = parts[0] + '-0' + parts[1];
                return new Date(d);
            }

            return new Date(this.id);
        }
    });

    return NestedEvent;
})


.factory('Events', ['utils', 'settings', 'store', 'DayEvent', 'NestedEvent', 'isOnline',

    function (utils, settings, store, DayEvent, NestedEvent, isOnline) {
        isOnline().then((status) => {
            console.log('isOnline', status);
        });
        let startFrom = new Date();
        //let lastEventDate = new Date(startFrom);
        //lastEventDate.setDate(startFrom.getDate() - 1);
        //let lastId = 0;


        let dayEvents = [];
        let nestedEvents = [];

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

        let findLoosed = function () {
            let weekStart = utils.findWeekId(startFrom);
            let monthStart = utils.findMonthId(startFrom);
            let quaterStart = utils.findQuarterId(startFrom);
            let yearStart = utils.findYearId(startFrom);
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


        let Events = {
            allDayEvents: function () {
                return dayEvents;
            },
            allNestedEvents: function () {
                return nestedEvents;
            },
            _updateFromData: (data) => {
                if (data.nestedEvents.length !== 0) {
                    nestedEvents = data.nestedEvents.map((event) => {
                        let e = new NestedEvent(event);
                        return e;
                    });
                }
                if (data.dayEvents.length !== 0) {
                    dayEvents = data.dayEvents.map((event) => {
                        return new DayEvent(event);
                    });
                }
                Events._buildTree();
                Events._triggerUpdate();
            },
            load: (cb) => {
                store.load((data) => {
                    settings.startDate().then((date) => {
                        startFrom = new Date(date);
                        Events._updateFromData(data);
                        cb();
                    });
                });
                store.onUpdate((data) => {
                    Events._updateFromData(data);
                });
            },
            _buildTree: function () {
                let currentDate = new Date(startFrom);
                while (currentDate < new Date()) {
                    let day = _.find(dayEvents, (d) => {
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
                nestedEvents.forEach((e) => {
                    e.children = [];
                });
                dayEvents.forEach(function (day) {
                    let date = day.date;
                    let yearId = utils.findYearId(date);
                    let year = Events.getNested('year', yearId);
                    if (!year) {
                        year = new NestedEvent({ type: 'year', id: yearId});
                        nestedEvents.push(year);
                        store.save(year);
                    }

                    let quarterId = utils.findQuarterId(date);
                    let quarter = Events.getNested('quarter', quarterId);
                    if (!quarter) {
                        quarter = new NestedEvent({type: 'quarter', id: quarterId});
                        nestedEvents.push(quarter);
                        store.save(quarter);
                    }

                    year.addChild(quarter);

                    let monthId = utils.findMonthId(date);
                    let month = Events.getNested('month', monthId);
                    if (!month) {
                        month = new NestedEvent({type: 'month', id: monthId});
                        nestedEvents.push(month);
                        store.save(month);
                    }
                    quarter.addChild(month);

                    let weekId = utils.findWeekId(date);
                    let week = Events.getNested('week', weekId);
                    if (!week) {
                        week = new NestedEvent({type: 'week', id: weekId});
                        nestedEvents.push(week);
                        store.save(week);
                    }
                    month.addChild(week);

                    week.addChild(day);
                });
            },
            _sortDays: () => {
                dayEvents = _.sortBy(dayEvents, 'id');
            },
            _getUnsubmitDay: () => {
                return _.find(dayEvents, (d) => !d.title);
            },
            getCombinedList: function () {
                let list = [];
                let years = nestedEvents.filter(function (e) {
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
            getDay: function (id) {
                return dayEvents.filter(function (event) {
                    return event.id === id;
                })[0];
            },
            getNested: function (type, id) {
                return nestedEvents.filter(function (event) {
                    return event.type === type && event.id === id;
                })[0];
            },
            getEvent: function (type, id) {
                if (type === 'day') {
                    return Events.getDay(id);
                } else {
                    return Events.getNested(type, id);
                }
            },
            isDaySubmitDone: function () {
                let day = Events._getUnsubmitDay();
                if (day) {
                    let past = day.date < new Date();
                    let today = day.date.toDateString() === new Date().toDateString();
                    return !(past || today);
                }
                return true;
            },
            isNestedSubmitDone: function () {
                return !findLoosed();
            },
            isSubmitDone: function () {
                return this.isDaySubmitDone() && this.isNestedSubmitDone();
            },
            getUnsubmitDate: function () {
                let day = Events._getUnsubmitDay();
                return day && day.date;
            },
            updateDayEvent: function (id, title, score) {
                let event = this.getDay(id);
                if (event) {
                    event.title = title;
                    event.score = parseInt(score);
                }
                store.save(event);
            },
            updateNestedEvent: function (type, id, selectedChildId) {
                let event = Events.getNested(type, id);

                let oldVariant = event.selectedChildId;
                // validate selected id
                let vatiants = event.children.map(function (e) {
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
            submitDayEvent: function (title, score) {
                let day = Events._getUnsubmitDay();
                day.title = title;
                if (score !== undefined) {
                    day.score = parseInt(score);
                }
                store.save(day);
                let toSave = dayEvents.map(function (e) {
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
            submitNestedEvent: function (type, childId) {
                let loosed = findLoosed();
                Events.updateNestedEvent(type, loosed.id, childId);
            },
            getUnsubmitType: function () {
                let unsubmitDay = this._getUnsubmitDay();
                let unsubmitNested = findLoosed();


                if (unsubmitDay && unsubmitNested && unsubmitDay.date > unsubmitNested.date) {
                    return unsubmitNested.type;
                } else if (unsubmitDay) {
                    return 'day';
                } else if (unsubmitNested) {
                    return unsubmitNested.type;
                }

                return null;
            },
            getUnsubmitNestedEvent: function () {
                return findLoosed();
            },
            getNestedEventVariants: (type, id) => {
                let loosed;
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

            _setStartDate: function (date) {
                startFrom = new Date(date);
                //lastEventDate = new Date(startFrom);
                //lastEventDate.setDate(lastEventDate.getDate());
                Events._buildTree();
                dayEvents = dayEvents.filter((d) => {
                    return d.date > date || d.date.toDateString() === date.toDateString();
                });
                Events._updateFunctions.forEach((f) => f());
            },
            _updateFunctions: [],
            onUpdate: (cb) => {
                Events._updateFunctions.push(cb);
            },
            _triggerUpdate: () => {
                Events._updateFunctions.forEach((func) => func());
            }
        };

        // for debug;
        window.events = Events;
        return Events;
    }
])
    .factory('beautifyDate', function () {
        function beautifyDate(event) {
            if (!event) {
                return 'no event..';
            }
            if (event.type === 'day') {
                let date = moment(new Date(event.id)).calendar();
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
