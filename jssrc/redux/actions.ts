/// <reference path="./typing.d.ts" />
export const SET_START_DATE = 'SET_START_DATE';

export const ADD_EVENT = 'ADD_EVENT';
export const CHANGE_SELECTED_DAY_ID = 'CHANGE_SELECTED_DAY_ID';
export const UPDATE_EVENT = 'UPDATE_EVENT';

export const BUILD_STRUCTURE = 'BUILD_STRUCTURE';
export const ENSURE_SELECTED = 'ENSURE_SELECTEsD';

export function setStartDate(startDate: Date) {
    return {
        type: SET_START_DATE,
        value: startDate
    };
}

export function addEvent(event: BestEvent) {
    return {
        type: ADD_EVENT,
        event
    };
}

export function updateEvent(eventId: string, event: any) {
    return {
        type: UPDATE_EVENT,
        eventId,
        event
    };
}

export function changeSelectedDayId(nestedId: string, dayId: string) {
    return {
        type: CHANGE_SELECTED_DAY_ID,
        nestedId,
        dayId
    };
}

export function build() {
    return {type: BUILD_STRUCTURE};
}
