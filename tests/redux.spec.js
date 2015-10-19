// import {newStore} from '../jssrc/redux/main.js';
// import {startDate} from '../jssrc/redux/reducers.js';
import {
    setStartDate, addEvent, updateEvent,
    changeSelectedDayId,
    build
} from '../jssrc/redux/actions.js';

import {
    daySelector, dayDateSelector,
    nestedSelector, nestedTitleSelector,
    findUnsubmit, findSubmitVars,
    createShortList
} from '../jssrc/redux/selectors.js';

import {
    idToType
} from '../jssrc/redux/getters.js';

import { fillWeek } from './utils.js';
import configureStore from '../jssrc/redux/store.js';


describe('startDate', () => {
    let store;

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
    let store;

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
            id: 'day-2015-01-01'
        }));

        let day = daySelector(store, 'day-2015-01-01');

        expect(day).toEqual({
            title: 'day 1',
            id: 'day-2015-01-01'
        });
    });

    it('can get date of day event', () => {
        store.dispatch(addEvent({
            title: 'day 1',
            id: 'day-2015-01-01'
        }));

        let date = dayDateSelector(store, 'day-2015-01-01');

        expect(date.toDateString()).toEqual(new Date('2015-01-01').toDateString());
    });


    it('can add nested event', () => {
        fillWeek(store);

        let week = nestedSelector(store, 'week-2015-01-01');

        expect(week).toEqual({
            id: 'week-2015-01-01',
            selectedDayId: 'day-2015-01-01'
        });
    });

    it('can get title of nested event', () => {
        fillWeek(store);

        let title = nestedTitleSelector(store, 'week-2015-01-01');
        expect(title).toBe('day 1');
    });

    it('can change title of nested event', () => {
        fillWeek(store);

        store.dispatch(changeSelectedDayId('week-2015-01-01', 'day-2015-01-02'));

        let title = nestedTitleSelector(store, 'week-2015-01-01');
        expect(title).toBe('day 2');
    });
});

describe('store', () => {
    let store;

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
    let store;

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
        let vars = findSubmitVars(store.getState(), event);
        expect(vars.length).toBe(4);
        expect(vars[0].title).toBe('day 1');
    });

    it('after submit week we need to submit next day', () => {
       store.dispatch(updateEvent('week-2015-01-01', {selectedChildId: 'day-2015-01-03'}));
       let event = findUnsubmit(store.getState());
       expect(event).toBeDefined();
       expect(idToType(event.id)).toBe('day');
    });

    it('throw error on wrong submit', () => {
        function trySubmit() {
            store.dispatch(updateEvent('week-2015-01-01', {selectedChildId: 'day-2016-01-02'}));
        }
        expect(trySubmit).toThrowError();
    });
});


describe('get short list', () => {
    let store;

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
        store.dispatch(updateEvent('week-2015-01-01', {selectedChildId: 'day-2015-01-02'}));

        store.dispatch(updateEvent('day-2015-01-05', {title: 'day 1'}));
        store.dispatch(updateEvent('day-2015-01-05', {title: 'day 2'}));
        store.dispatch(updateEvent('day-2015-01-06', {title: 'day 3'}));
        store.dispatch(updateEvent('day-2015-01-07', {title: 'day 4'}));
        store.dispatch(updateEvent('day-2015-01-08', {title: 'day 5'}));
        store.dispatch(updateEvent('day-2015-01-09', {title: 'day 6'}));
        store.dispatch(updateEvent('day-2015-01-10', {title: 'day 7'}));
        store.dispatch(updateEvent('week-2015-01-05', {selectedChildId: 'day-2015-01-07'}));

        let list = createShortList(store.getState());
        expect(list.length).toBe(2);
        // at first place we should see last submited week
        expect(list[0].id).toBe('week-2015-01-05');
    });
});