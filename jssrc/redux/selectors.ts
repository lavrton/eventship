/// <reference path="../../typings/tsd.d.ts" />

import * as _ from 'lodash';
import { idToType, idToDate, isSame } from './getters';


const cache: any = {};

function checkCache(state: any, namespace: string) : void {
    cache[namespace] = cache[namespace] || {};
    const space = cache[namespace];
    if (space._state !== state) {
        cache[namespace] = {};
        space._state = state;
    }
}

export const findEvent = (state: State, id: string) => {
    checkCache(state, 'findEvent');
    const event = cache.findEvent[id] || _.find(state.events, (d: any) => d.id === id);
    cache.findEvent[id] = event;
    return event;
};

export function findNestedTitle(state: State, id: string) {
    // checkCache(state, 'findNestedTitle');
    let nested = findEvent(state, id);
    let child = findEvent(state, nested.selectedDayId);
    return child.title;
}

function getUnsubmitDay(events: BestEvent[]) : BestEvent {
    return _.find(events, (e: any) => {
        let isDay = (idToType(e.id) === 'day');
        let noTitle = !e.title;
        return isDay && noTitle;
    });
}

export const getChildren = (events: BestEvent[], id: string) => {
    checkCache(events, 'getChildren');
    if (cache.getChildren[id]) {
        return cache.getChildren[id];
    }
    let eventDate = idToDate(id);
    let eventType = idToType(id);
    let childrenType: { [index: string]: { childrenType: string; limit: number}; } = {
        year: { childrenType: 'quarter', limit: 4 },
        quarter: { childrenType: 'month', limit: 3 },
        month: { childrenType: 'week', limit: 6 },
        week: { childrenType: 'day', limit: 7 }
    };

    const children = (<any>_.chain(events))
        .filter(function filterByType(item: BestEvent) {
            return idToType(item.id) === childrenType[eventType].childrenType;
        })
        .filter(function filterByDate(item: BestEvent) {
            // let date = idToDate(item.id);
            let same : boolean;
            if (eventType === 'week') {
                same = isSame(id, item.id, 'isoWeek');
            } else {
                same = isSame(id, item.id, eventType);
            }
            return same;
        })
        .take(childrenType[eventType].limit)
        .value();
    // let children = _.filter(events, function filterNonChildren(item) {
    //     let isChildrenType = ();
    //     if (!isChildrenType) {
    //         return false;
    //     }
    //     let date = idToDate(item.id);
    //     let isSame;
    //     if (eventType === 'week') {
    //         isSame = eventDate.isSame(date, 'isoweek');
    //     } else {
    //         isSame = eventDate.isSame(date, eventType);
    //     }
    //     return isChildrenType && isSame;
    // });
    cache.getChildren[id] = children;
    return children;
};

var isNeedSubmit = (state: State, id: string) => {
    let nameSpace = 'isNeedSubmit';
    checkCache(state, nameSpace);
    if (cache[nameSpace][id]) {
        return cache[nameSpace][id];
    }
    let res: boolean;
    if (isFullChildren(state, id)) {
        res = !findEvent(state, id).selectedDayId;
    } else {
        res = false;
    }
    cache[nameSpace][id] = res;
    return res;
};

var isFullChildren = (state: State, id: string) => {
    let nameSpace = 'isFullChildren';
    checkCache(state, nameSpace);
    if (cache[nameSpace][id]) {
        return cache[nameSpace][id];
    }
    let fullChildren = false;
    // let eventDate = idToDate(e.id);
    let eventType = idToType(id);
    let children = getChildren(state.events, id);
    children = _.sortBy(children, 'id');

    let lastChild : any = _.last(children);
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
        fullChildren = fullChildren && !children.filter(function (child: any) {
            return !child.title;
        }).length;
    } else {
        // for month, quater, year
        fullChildren = true;
        children.forEach(function (child: BestEvent) {
            fullChildren = fullChildren && isFullChildren(state, child.id) && !isNeedSubmit(state, child.id);
        });

        let lastDay : BestEvent;
        while (true) {
            let lastChildChildren = getChildren(state.events, lastChild.id);
            lastChild = _.last(lastChildChildren);
            lastChildType = idToType(lastChild.id);
            if (lastChildType === 'day') {
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
    cache[nameSpace][id] = fullChildren;
    return fullChildren;
};

function getUnsubmitNested(state: State) {
    let types = ['week', 'month', 'quarter', 'year'];
    let type: string, event: BestEvent;
    for (var i in types) {
        if (!types.hasOwnProperty(i)) {
            continue;
        }
        type = types[i];
        event = _.find(state.events, (e: any) => {
            let isGoodType = idToType(e.id) === type;
            if (!isGoodType) {
                return false;
            }
            if (!isFullChildren(state, e.id)) {
                return false;
            }
            if (!isNeedSubmit(state, e.id)) {
                return false;
            }
            return true;
        });
        if (event) {
            return event;
        }
    }
}

export function findUnsubmit(state : State) {
    let day = getUnsubmitDay(state.events);
    let dayDate = day && idToDate(day.id);

    let nested = getUnsubmitNested(state);
    let nestedDate = nested && idToDate(nested.id);

    if (day && nested && nestedDate.isBefore(dayDate)) {
        return nested;
    } else if (day) {
        return day;
    } else if (nested) {
        return nested;
    }
}

export function findSubmitVars(state: State, id: string) {
    let type = idToType(id);
    let children = getChildren(state.events, id);
    if (type === 'week') {
        return children;
    }

    return _.map(children, (child: any) => {
        return _.find(state.events, (e: any) => {
            let isDay = idToType(e.id);
            return isDay && (e.id === child.selectedDayId);
        });
    });
}


export function createShortList(state: State) {
    let list: BestEvent[] = [];
    let years = state.events.filter((e) => {
        return idToType(e.id) === 'year';
    });

    function addNested(e: BestEvent) {
        if (e.selectedDayId) {
            list.unshift(e);
            return;
        }
        let children = getChildren(state.events, e.id);
        if (idToType(e.id) === 'week') {
            _.each(children, (d: any) => {
                if (d.title) {
                    list.unshift(d);
                }
            });
        } else {
            _.each(children, (c: BestEvent) => {
                addNested(c);
            });
        }
    }

    _.each(years, addNested);
    return list;
}


export function findScore(state: State, id: string) : number {
    if (idToType(id) === 'day') {
        const event = findEvent(state, id);
        return event.score;
    } else {
        const children = getChildren(state.events, id);
        let sum = _(children).map((e: BestEvent) => findScore(state, e.id)).sum();
        return Math.round(sum / children.length);
    }
}

