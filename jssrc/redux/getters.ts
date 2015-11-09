/// <reference path="../../typings/tsd.d.ts" />

import * as moment from 'moment';
import * as _ from 'lodash';

export const idToType = _.memoize((id: string) : string => {
    // id looks like day-2015-02-21 or year-2014
    return id.split('-')[0];
});

export const idToDate = _.memoize((id: string): moment.Moment => {
    let dateStr = id.slice(id.indexOf('-'), id.length);
    let date = moment(dateStr);

    let type = idToType(id);
    if (type === 'quarter') {
        let n = parseInt(_.last<string>(id), 10);
        date.quarter(n);
    }
    return date;
});

// let cache : any = {};
// export function isSame(date1: moment.Moment, date2: moment.Moment, unit: string) {
//     let ds1 = date1.format('YYYY-MM-DD');
//     let ds2 = date2.format('YYYY-MM-DD');
//     if (cache[ds1 + ds2 + unit] !== undefined) {
//         return cache[ds1 + ds2 + unit];
//     }
//     if (cache[ds2 + ds1 + unit] !== undefined) {
//         return cache[ds2 + ds1 + unit];
//     }
//     let res = (<any>date1)[unit]() === (<any>date2)[unit]();
//     cache[ds1 + ds2 + unit] = res;
//     return res;
// }

let cache: any = {};
export function isSame(ds1: string, ds2: string, unit: string) {
    if (cache[ds1 + ds2 + unit] !== undefined) {
        return cache[ds1 + ds2 + unit];
    }
    if (cache[ds2 + ds1 + unit] !== undefined) {
        return cache[ds2 + ds1 + unit];
    }
    let date1 = idToDate(ds1);
    let date2 = idToDate(ds2);
    let res = (<any>date1)[unit]() === (<any>date2)[unit]();
    cache[ds1 + ds2 + unit] = res;
    return res;
}
