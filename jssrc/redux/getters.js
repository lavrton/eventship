import moment from 'moment';
import _ from 'lodash';

export const idToType = _.memoize((id) => {
    // id looks like day-2015-02-21 or year-2014
    return id.split('-')[0];
});

export const idToDate = _.memoize((id) => {
    let dateStr = id.slice(id.indexOf('-'), id.length);
    let date = moment(dateStr);

    let type = idToType(id);
    if (type === 'quarter') {
        let number = _.last(id);
        date.quarter(number);
    }
    return date;
});