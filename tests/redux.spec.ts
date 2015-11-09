import {
    setStartDate, addEvent, updateEvent,
    changeSelectedDayId,
    build
} from '../jssrc/redux/actions';

import {
    findEvent,
    findNestedTitle,
    findUnsubmit, findSubmitVars,
    createShortList,
    findScore
} from '../jssrc/redux/selectors';

import {
    idToType, idToDate
} from '../jssrc/redux/getters';

import { fillWeek } from './utils';
import configureStore from '../jssrc/redux/store';


describe('startDate', () => {
    let store : Redux.Store;

    beforeEach(() => {
        store = configureStore();
    });

    it('should handle initial state', () => {
        expect(store.getState().startDate).toBeDefined();
    });

    it('should handle SET', () => {
        store.dispatch(setStartDate(new Date('2014')));

        // let start = startDate(new Date('2015'), actions.setStartDate(new Date('2014')));
        let year = store.getState().startDate.getFullYear();
        expect(year).toBe(2014);
    });
});


describe('events', () => {
    let store : Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-01-01')));
    });

    it('should handle initial state', () => {
        expect(store.getState().events).toEqual([]);
    });

    it('can add new day event', () => {

        store.dispatch(addEvent({
            title: 'day 1',
            id: 'day-2015-01-01',
            score: 2
        }));

        let day = findEvent(store.getState(), 'day-2015-01-01');

        expect(day).toEqual({
            title: 'day 1',
            id: 'day-2015-01-01',
            score: 2
        });
    });

    it('can get date of day event', () => {
        store.dispatch(addEvent({
            title: 'day 1',
            id: 'day-2015-01-01'
        }));

        let day = findEvent(store.getState(), 'day-2015-01-01');
        let date = idToDate(day.id);
        expect(date.isSame(new Date('2015-01-01'), 'day')).toBe(true);
    });


    it('can add nested event', () => {
        fillWeek(store);

        let week = findEvent(store.getState(), 'week-2015-01-01');

        expect(week).toEqual({
            id: 'week-2015-01-01',
            selectedDayId: 'day-2015-01-01'
        });
    });

    it('can get title of nested event', () => {
        fillWeek(store);

        let title = findNestedTitle(store.getState(), 'week-2015-01-01');
        expect(title).toBe('day 1');
    });

    it('can change title of nested event', () => {
        fillWeek(store);

        store.dispatch(changeSelectedDayId('week-2015-01-01', 'day-2015-01-02'));

        let title = findNestedTitle(store.getState(), 'week-2015-01-01');
        expect(title).toBe('day 2');
    });
});

describe('store', () => {
    let store: Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-01-01')));
        store.dispatch(build());
    });

    it('on init submit is not done', () => {
        let event = findUnsubmit(store.getState());
        expect(event).toBeDefined();
    });

    it('after submit days in week we should submit week', function() {
        store.dispatch(updateEvent('day-2015-01-01', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-02', {title: 'day 2'}));
        store.dispatch(updateEvent('day-2015-01-03', {title: 'day 3'}));
        store.dispatch(updateEvent('day-2015-01-04', {title: 'day 4'}));

        let event = findUnsubmit(store.getState());
        expect(event).toBeDefined();
        expect(idToType(event.id)).toBe('week');
    });
});

describe('nested submit', () => {
    let store : Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-01-01')));
        store.dispatch(build());
        store.dispatch(updateEvent('day-2015-01-01', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-02', {title: 'day 2'}));
        store.dispatch(updateEvent('day-2015-01-03', {title: 'day 3'}));
        store.dispatch(updateEvent('day-2015-01-04', {title: 'day 4'}));
    });

    it('get veriants for submit week', () => {
        let event = findUnsubmit(store.getState());
        let vars = findSubmitVars(store.getState(), event.id);
        expect(vars.length).toBe(4);
        expect(vars[0].title).toBe('day 1');
    });

    it('after submit week we need to submit next day', () => {
       store.dispatch(updateEvent('week-2015-01-01', {selectedDayId: 'day-2015-01-03'}));
       let event = findUnsubmit(store.getState());
       expect(event).toBeDefined();
       expect(idToType(event.id)).toBe('day');
    });

    it('throw error on wrong submit', () => {
        function trySubmit() {
            store.dispatch(updateEvent('week-2015-01-01', {selectedDayId: 'day-2016-01-02'}));
        }
        expect(trySubmit).toThrowError();
    });
});


describe('get short list', () => {
    let store : Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-01-01')));
        store.dispatch(build());
    });

    it('check for days', () => {
        store.dispatch(updateEvent('day-2015-01-01', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-02', {title: 'day 2'}));

        let list = createShortList(store.getState());
        console.log(list);
        expect(list.length).toBe(2);
    });

    it('check for two weeks', () => {
        store.dispatch(updateEvent('day-2015-01-01', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-02', {title: 'day 2'}));
        store.dispatch(updateEvent('day-2015-01-03', {title: 'day 3'}));
        store.dispatch(updateEvent('day-2015-01-04', {title: 'day 4'}));
        store.dispatch(updateEvent('week-2015-01-01', {selectedDayId: 'day-2015-01-02'}));

        store.dispatch(updateEvent('day-2015-01-05', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-05', {title: 'day 2'}));
        store.dispatch(updateEvent('day-2015-01-06', {title: 'day 3'}));
        store.dispatch(updateEvent('day-2015-01-07', {title: 'day 4'}));
        store.dispatch(updateEvent('day-2015-01-08', {title: 'day 5'}));
        store.dispatch(updateEvent('day-2015-01-09', {title: 'day 6'}));
        store.dispatch(updateEvent('day-2015-01-10', {title: 'day 7'}));
        store.dispatch(updateEvent('week-2015-01-05', {selectedDayId: 'day-2015-01-07'}));

        let list = createShortList(store.getState());
        expect(list.length).toBe(2);
        // at first place we should see last submited week
        expect(list[0].id).toBe('week-2015-01-05');
    });
});

describe('check updates', () => {
    let store : Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-05-30')));
        store.dispatch(build());

        store.dispatch(updateEvent('day-2015-05-30', {title: 'сб'}));
        store.dispatch(updateEvent('day-2015-05-31', {title: 'вс'}));
        store.dispatch(updateEvent('week-2015-05-25', {selectedDayId: 'day-2015-05-31'}));
    });

    it('auto set value for nested event with one child', () => {
        // for may month we have one week inside
        // so user should not select best event for only one variant
        let month = findEvent(store.getState(), 'month-2015-05');
        expect(month.selectedDayId).toBe('day-2015-05-31');
    });

    it('after changing selected value of nested event all parents should be changed', function () {
        store.dispatch(updateEvent('week-2015-05-25', {selectedDayId: 'day-2015-05-30'}));
        expect(findNestedTitle(store.getState(), 'week-2015-05-25')).toBe('сб');
        expect(findNestedTitle(store.getState(), 'month-2015-05')).toBe('сб');
    });
});


describe('score :: ', () => {
    let store: Redux.Store;

    beforeEach(() => {
        store = configureStore();
        store.dispatch(setStartDate(new Date('2015-01-01')));
        store.dispatch(build());
    });

    it('day must have score', () => {
        store.dispatch(updateEvent('day-2015-01-01', { title: 'day 1' }));
        const day = findEvent(store.getState(), 'day-2015-01-01');
        expect(day.score).toBeDefined();
    });

    it('we can update score of a day', () => {
        store.dispatch(updateEvent('day-2015-01-01', { title: 'day 1', score: 3 }));
        const day = findEvent(store.getState(), 'day-2015-01-01');
        expect(day.score).toBe(3);
    });

    it('nested event has calculated score', function() {
        store.dispatch(updateEvent('day-2015-01-01', { title: 'day 1', score: 0 }));
        store.dispatch(updateEvent('day-2015-01-02', { title: 'day 2', score: 1 }));
        store.dispatch(updateEvent('day-2015-01-03', { title: 'day 3', score: 2 }));
        store.dispatch(updateEvent('day-2015-01-04', { title: 'day 4', score: 3 }));

        let weekScore = findScore(store.getState(), 'week-2015-01-01');
        expect(weekScore).toBe(2);

        store.dispatch(updateEvent('day-2015-01-01', { title: 'day 1', score: 3 }));
        store.dispatch(updateEvent('day-2015-01-02', { title: 'day 2', score: 3 }));
        weekScore = findScore(store.getState(), 'week-2015-01-01');
        expect(weekScore).toBe(3);
    });

});

// TODO check auto selected child for week
// TODO massive validations
