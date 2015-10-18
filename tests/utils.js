import { addEvent } from '../jssrc/redux/actions.js';


export function fillWeek(store) {
    store.dispatch(addEvent({
        title: 'day 1',
        id: 'day-2015-01-01'
    }));
    store.dispatch(addEvent({
        title: 'day 2',
        id: 'day-2015-01-02'
    }));
    store.dispatch(addEvent({
        title: 'day 3',
        id: 'day-2015-01-03'
    }));
    store.dispatch(addEvent({
        title: 'day 4',
        id: 'day-2015-01-04'
    }));

    store.dispatch(addEvent({
        id: 'week-2015-01-01',
        selectedDayId: 'day-2015-01-01'
    }));
}