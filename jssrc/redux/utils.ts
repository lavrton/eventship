// import moment from 'moment';

let cache : { [index: string]: string } = { };


export function findWeekId(dayDate: moment.Moment) : string {
    let cached = cache[dayDate.format('YYYY-MM-DD')];
    if (cached) {
        return cached;
    }
    let date: moment.Moment;
    if (dayDate.day() === 1) {
        date = dayDate.clone();
    } else {
        let tempDate = dayDate.clone();
        while (true) {
            tempDate.subtract(1, 'days');
            if ((tempDate.month() !== dayDate.month()) || tempDate.day() === 0) {
                let weekDate = tempDate.clone();
                weekDate.add(1, 'days');
                date = weekDate;
                break;
            }
        }
    }
    let result = 'week-' + date.format('YYYY-MM-DD');
    cache[date.format('YYYY-MM-DD')] = result;
    return result;
}

export function findMonthId(date: moment.Moment) {
    return `month-${date.format('YYYY-MM')}`;
}

export function findQuarterId(date: moment.Moment) {
    // let number = (Math.floor(date.month() / 3) + 1);
    return `quarter-${date.year()}-${date.quarter()}`;
}

export function findYearId(date: moment.Moment) {
    return `year-${date.year()}`;
}
