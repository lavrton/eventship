import _ from 'lodash';
import moment from 'moment';
import * as actions from './actions';
import { idToType, idToDate } from './getters';
import { findEvent, getChildren } from './selectors';
import * as utils from './utils';


export function events(state = [], action) {
    if (action.type === actions.ADD_EVENT) {
        return [...state, action.event];
    }

    if (action.type === actions.UPDATE_EVENT) {
        let event = _.find(state, (e) => e.id === action.eventId);
        let index = state.indexOf(event);

        // validate updating nested event
        if (idToType(event.id) !== 'day') {
            let children = getChildren(state, event);
            let selectedChild = _.find(children, (c) => c.id === action.event.selectedChildId);
            if (!selectedChild) {
                throw new Error(`Can not find child with id ${action.event.selectedChildId}`);
            }
        }
        return [
            ...state.slice(0, index),
            Object.assign({}, state[index], action.event),
            ...state.slice(index + 1)
        ];
    }

    if (action.type === actions.CHANGE_SELECTED_DAY_ID) {
        let nested = _.find(state, (n) => n.id === action.nestedId);
        let index = state.indexOf(nested);
        return [
            ...state.slice(0, index),
            Object.assign({}, state[index], {
                selectedDayId: action.dayId
            }),
            ...state.slice(index + 1)
        ];
    }
    return state;
}


export function startDate(state = new Date(), action) {
    if (action.type === actions.SET_START_DATE) {
        return action.value;
    }
    return state;
}

let initialState = {
    startDate: new Date(),
    events: []
};

export default function rootReducer(state = initialState, action) {
    state = _.assign({}, state, {
        events: events(state.events, action),
        startDate: startDate(state.startDate, action)
    });

    if (action.type === actions.BUILD_STRUCTURE) {

        // create day events from start date until today
        let currentDate = moment(state.startDate);
        let today = moment();

        while (currentDate.isBefore(today)) {
            let day = _.find(state.events, (d) => {
                return d.id === 'day-' + currentDate.format('YYYY-MM-DD');
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
        _.each(state.events, (event) => {
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
            _.each(nestedTypes, (type) => {
                let nestedId = ids[type];
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
