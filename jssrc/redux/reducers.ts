/// <reference path="../../typings/tsd.d.ts" />
/// <reference path="./typing.d.ts" />

import * as _ from 'lodash';
import * as moment from 'moment';
import * as actions from './actions';
import { idToType, idToDate } from './getters';
import { findEvent, getChildren } from './selectors';
import * as utils from './utils';

export function events(state : BestEvent[] = [], action: any) {
    if (action.type === actions.ADD_EVENT) {
        if (idToType(action.event.id) === 'day' && action.event.score === undefined) {
            action.event.score = 2;
        }
        return [...state, action.event];
    }

    if (action.type === actions.UPDATE_EVENT) {
        let event = _.find(state, (e) => e.id === action.eventId);
        let index = state.indexOf(event);

        // validate updating nested event
        if (idToType(event.id) !== 'day') {
            let children = getChildren(state, event.id);
            let selectedChild = _.find(children, (c: any) => c.id === action.event.selectedDayId);
            if (!selectedChild) {
                throw new Error(`Can not find child with id ${action.event.selectedDayId}`);
            }
        }
        state = <BestEvent[]>[
            ...state.slice(0, index),
            _.assign({}, state[index], action.event),
            ...state.slice(index + 1)
        ];

        // ensure selected
        return _.map(state, (e) => {
            let type = idToType(e.id);
            if (type === 'day') {
                return e;
            }
            let children : any[] = getChildren(state, e.id);
            if (children.length === 1 && children[0].selectedDayId) {
                return _.assign({}, e, {
                    selectedDayId: children[0].selectedDayId || children[0].id
                });
            }
            return e;
        });
    }

    if (action.type === actions.CHANGE_SELECTED_DAY_ID) {
        let nested = _.find(state, (n) => n.id === action.nestedId);
        let index = state.indexOf(nested);
        return [
            ...state.slice(0, index),
            _.assign({}, state[index], {
                selectedDayId: action.dayId
            }),
            ...state.slice(index + 1)
        ];
    }
    return state;
}


export function startDate(state = new Date(), action: any) {
    if (action.type === actions.SET_START_DATE) {
        return action.value;
    }
    return state;
}

let initialState : State = {
    startDate: new Date(),
    events: []
};

export default function rootReducer(state : any = initialState, action: any) {
    state = _.assign({}, state, {
        events: events(state.events, action),
        startDate: startDate(state.startDate, action)
    });

    if (action.type === actions.BUILD_STRUCTURE) {

        // create day events from start date until today
        let currentDate = moment(state.startDate);
        let today = moment();

        let dayId: string;
        while (currentDate.isBefore(today)) {
            dayId = 'day-' + currentDate.format('YYYY-MM-DD');
            let day = _.find(state.events, function(d: BestEvent) {
                return d.id === dayId;
            });
            if (!day) {
                state = _.assign({}, state, {
                    events: events(state.events, {
                        type: actions.ADD_EVENT,
                        event: {
                            id: 'day-' + currentDate.format('YYYY-MM-DD')
                        }
                    })
                });
                currentDate.add(1, 'days');
            }
        }

        // create all required nested events
        _.each(state.events, function ensureNestedTree(event: any) {
            if (idToType(event.id) !== 'day') {
                return;
            }
            let day = event;
            let date = idToDate(day.id);

            let nestedTypes = ['year', 'quarter', 'month', 'week'];
            let ids = {
                year: utils.findYearId(date),
                quarter: utils.findQuarterId(date),
                month: utils.findMonthId(date),
                week: utils.findWeekId(date)
            };
            _.each(nestedTypes, function checkType(type) {
                let nestedId: string = (<any>ids)[type];
                let nestedEvent = findEvent(state, nestedId);
                if (!nestedEvent) {
                    nestedEvent = {id: nestedId};
                    state = _.assign({}, state, {
                        events: events(state.events, actions.addEvent(nestedEvent))
                    });
                }
            });
        });
    }
    return state;
}
