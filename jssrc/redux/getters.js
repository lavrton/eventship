import moment from 'moment';

export const idToType = _.memoize((id) => {
    // id looks like day-2015-02-21 or year-2014
    return id.split('-')[0];
});

export const idToDate = _.memoize((id) => {
    let dateStr = id.slice(id.indexOf('-'), id.length);
    return moment(dateStr);
});