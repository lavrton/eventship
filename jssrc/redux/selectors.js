// import { createSelector } from 'reselect';
import _ from 'lodash';
import memoize from 'memoizee';
import { idToType, idToDate } from './getters';

export function daySelector(store, id) {
    let state = store.getState();
    return _.find(state.events, (d) => d.id === id);
}

export function dayDateSelector(store, id) {
    let day = daySelector(store, id);
    return new Date(day.id);
}

export function nestedSelector(store, id) {
    let state = store.getState();
    return _.find(state.events, (d) => d.id === id);
}

export function nestedTitleSelector(store, id) {
    let nested = nestedSelector(store, id);
    let child = daySelector(store, nested.selectedDayId);
    return child.title;
}

function getUnsubmitDay(events) {
    return _.find(events, (e) => {
        let isDay = (idToType(e.id) === 'day');
        let noTitle = !e.title;
        return isDay && noTitle;
    });
}

export const getChildren = memoize((events, e) => {
    let eventDate = idToDate(e.id);
    let eventType = idToType(e.id);

    let childrenType = {
        year: 'quarter',
        quarter: 'month',
        month: 'week',
        week: 'day'
    };
    return _.filter(events, (item) => {
        let isChildrenType = (idToType(item.id) === childrenType[eventType]);
        let date = idToDate(item.id);
        let isSame;
        if (eventType === 'week') {
            isSame = eventDate.isSame(date, 'isoweek');
        } else {
            isSame = eventDate.isSame(date, eventType);
        }
        return isChildrenType && isSame;
    });
});

const isNeedSubmit = memoize((events, e) => {
    if (isFullChildren(events, e)) {
        return !e.selectedChildId;
    }
    return false;
});

const isFullChildren = memoize((events, e) => {
    let fullChildren = false;
    // let eventDate = idToDate(e.id);
    let eventType = idToType(e.id);
    let children = getChildren(events, e);
    children = _.sortBy(children, 'id');

    let lastChild = _.last(children);
    if (!lastChild) {
        return false;
    }

    let lastChildDate = idToDate(lastChild.id);
    let lastChildType = idToType(lastChild.id);

    if (eventType === 'week') {
        // for week chooser
        let tempDate = lastChildDate.clone();
        if (tempDate.day() === 0) {
            fullChildren = true;
        }
        let nextDay = tempDate.clone().add(1, 'days');

        let value = (lastChild.title || '').toString();

        if (nextDay.isSame(tempDate, 'month') && (value.length >= 1)) {
            fullChildren = true;
        }
        fullChildren = fullChildren && !children.filter(function (child) {
            return !child.title;
        }).length;
    } else {
        // for month, quater, year
        fullChildren = true;
        children.forEach(function (child) {
            fullChildren = fullChildren && isFullChildren(events, child) && !isNeedSubmit(events, child);
        });

        let lastDay;
        while (true) {
            let lastChildChildren = getChildren(events, lastChild);
            lastChildType = idToType(lastChild.id);
            if (lastChildType !== 'day') {
                lastChild = _.last(lastChildChildren);
            } else {
                lastDay = lastChild;
                break;
            }
        }
        let lastDayDate = idToDate(lastDay.id);

        // теперь находим следующий за последним день
        let nextDay = lastDayDate.clone().add(1, 'days');

        // если месяц остаётся такой же, значит еще не все данные введены
        if (nextDay.isSame(lastDayDate, 'month')) {
            fullChildren = false;
        } else {
            let month = lastDayDate.month();
            if (eventType === 'quarter') {
                if ([2, 5, 8, 11].indexOf(month) === -1) {
                    fullChildren = false;
                }
            } else if (eventType === 'year') {
                if (month !== 11) {
                    fullChildren = false;
                }
            }
        }
    }
    return fullChildren;
});

function getUnsubmitNested(events) {
    let types = ['week', 'month', 'quarter', 'year'];
    for(let i in types) {
        let type = types[i];
        let event = _.find(events, (e) => {
            let isGoodType = idToType(e.id) === type;
            if (!isGoodType) {
                return false;
            }
            if (!isFullChildren(events, e)) {
                return false;
            }
            if (!isNeedSubmit(events, e)) {
                return false;
            }
            return true;
        });
        if (event) {
            return event;
        }
    }
}

export function findUnsubmit(state) {
    let day = getUnsubmitDay(state.events);
    let dayDate = day && idToDate(day.id);

    let nested = getUnsubmitNested(state.events);
    let nestedDate = nested && idToDate(nested.id);

    if (day && nested && nestedDate.isBefore(dayDate)) {
        return nested;
    } else if (day) {
        return day;
    } else if (nested) {
        return nested;
    }
}

export function findSubmitVars(state, event) {
    let type = idToType(event.id);
    let children = getChildren(state.events, event);
    if (type === 'week') {
        return children;
    }

    return _.map(children, (child) => {
        return _.find(state.events, (e) => {
            let isDay = idToType(e.id);
            return isDay && (e.id === child.selectedChildId);
        });
    });
}

export function findEvent(state, id) {
    return _.find(state.events, (e) => e.id === id);
}


export function createShortList(state) {
    let list = [];
    let years = state.events.filter((e) => {
        return idToType(e.id) === 'year';
    });

    function addNested(e) {

        if (e.selectedChildId) {
            list.unshift(e);
            return;
        }
        let children = getChildren(state.events, e);
        if (idToType(e.id) === 'week') {
            _.each(children, (d) => {
                if (d.title) {
                    list.unshift(d);
                }
            });
        } else {
            _.each(children, (c) => {
                addNested(c);
            });
        }
    }

    _.each(years, addNested);
    return list;
}

