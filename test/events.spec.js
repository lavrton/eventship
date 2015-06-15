angular.module('mie.settings', [])
    .factory('settings', function () {
        var Settings = {
            startDate: function () {
                return new Promise(function (resolve) {
                    var startDate = new Date('2015-01-01');
                    resolve(startDate);
                });
            }
        };
        return Settings;
    });

angular.module('mie.store', [])
    .factory('store', [

        function () {
            return {
                save: function () {},
                load: function (cb) {
                    setTimeout(function () {
                        cb({
                            nestedEvents: [],
                            dayEvents: []
                        });
                    });
                },
                setting: function () {
                    return new Promise(function (resolve, reject) {
                        resolve('');
                    });
                }
            };
        }
    ]);

describe('Events', function () {
    var Events, startDate, settings;

    beforeEach(module('mie.events'));
    beforeEach(module('mie.store'));

    beforeEach(inject(function ($injector) {
        settings = $injector.get('settings');
        //settings.startDate(startDate);
        Events = $injector.get('Events');
    }));

    beforeEach(function (done) {
        Events.load(done);
    });




    it('can change start date', function () {
        Events.submitDayEvent('чт');
        Events.submitDayEvent('пт');
        Events.submitDayEvent('сб');
        Events.submitDayEvent('вс');
        Events.submitNestedEvent('week', '2015-01-02');
        Events._setStartDate(new Date('2014-12-10'));
        expect(Events.getUnsubmitDate().toDateString()).toBe(new Date('2014-12-10').toDateString());
        expect(Events.getUnsubmitType()).toBe('day');
        expect(Events.getUnsubmitDate().toDateString()).toBe(new Date('2014-12-10').toDateString());
    });

    it('adding new day event', function () {
        Events.submitDayEvent('day 1');
        var day = Events.allDayEvents()[0];
        expect(day.title).toEqual('day 1');
        //expect(day.date.toDateString()).toBe(startDate.toDateString());
        expect(day.id).toEqual('2015-01-01');
    });


    it('we can get date of nestedEvent', function () {
        var quarter = Events.getEvent('quarter', '2015-1');
        expect(quarter.date.getFullYear()).toBe(2015);
    });

    it('nested event must give title', function () {
        Events.submitDayEvent('чт');
        Events.submitDayEvent('пт');
        Events.submitDayEvent('сб');
        Events.submitDayEvent('вс');
        Events.submitNestedEvent('week', '2015-01-02');
        var event = Events.getEvent('week', '2015-01-01');

        expect(event.title).toBe('пт');

        var month = Events.getEvent('month', '2015-01');
        month.selectedChildId = '2015-01-02';
        expect(month.title).toBe('пт');
    });

    describe('test need submit', function () {

        beforeEach(function () {
            Events.submitDayEvent('чт');
            Events.submitDayEvent('пт');
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');
        });

        it('all submits should not be done', function () {
            expect(Events.isSubmitDone()).toBe(false);
        });
        it('day submits should not be done', function () {
            expect(Events.isDaySubmitDone()).toBe(false);
        });
        it('nested submits should not be done', function () {
            expect(Events.isNestedSubmitDone()).toBe(false);
        });
        it('in end of week we need to submit week', function () {
            // as we have end of week we need to submit nested event
            expect(Events.getUnsubmitType()).toBe('week');
        });

        it('check for current day', function () {
            Events._setStartDate(new Date());
            expect(Events.isSubmitDone()).toBe(false);
        });
    });

    describe('test nested week submit', function () {
        beforeEach(function () {
            Events.submitDayEvent('чт');
            Events.submitDayEvent('пт');
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');

        });

        it('get day veriants before submit', function () {
            var variants = Events.getNestedEventVariants();
            expect(variants.length).toBe(4);
            expect(variants[0].title).toBe('чт');
        });

        it('need to submit next day on week submit', function () {
            var selectedId = '2015-01-02';
            Events.submitNestedEvent('week', selectedId);

            expect(Events.isNestedSubmitDone()).toBe(true);
            expect(Events.getUnsubmitType()).toBe('day');
        });

        it('get title on nested event', function () {
            var selectedId = '2015-01-02';
            Events.submitNestedEvent('week', selectedId);
            var week = Events.getNested('week', '2015-01-01');
            expect(week.title).toBe('пт');
        });

        it('throw error on wrong submit', function () {
            var selectedId = '2016-01-02';

            function trySubmit() {
                Events.submitNestedEvent('week', selectedId);
            }
            expect(trySubmit).toThrowError();
        });
    });

    describe('check get short combined list', function () {
        var list;

        // we will submit two week
        beforeEach(function () {
            Events.submitDayEvent('чт');
            Events.submitDayEvent('пт');
            list = Events.getCombinedList();
        });

        it('checking length', function () {
            expect(list.length).toBe(2);
        });
    });

    describe('check get combined list', function () {
        var list;

        // we will submit two week
        beforeEach(function () {
            Events.submitDayEvent('чт');
            Events.submitDayEvent('пт');
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');
            Events.submitNestedEvent('week', '2015-01-02');

            Events.submitDayEvent('пн');
            Events.submitDayEvent('вт');
            Events.submitDayEvent('ср');
            Events.submitDayEvent('чт');
            Events.submitDayEvent('пт');
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');
            Events.submitNestedEvent('week', '2015-01-08');

            list = Events.getCombinedList();
        });

        it('checking length', function () {
            expect(list.length).toBe(13);
        });

        it('first we have last week', function () {
            expect(list[0].type).toBe('week');
            expect(list[0].id).toBe('2015-01-05');
        });

        it('after week we have children 7 days', function () {
            expect(list[1].type).toBe('day');
            expect(list[1].id).toBe('2015-01-11');
            expect(list[1].title).toBe('вс');

            expect(list[7].type).toBe('day');
            expect(list[7].id).toBe('2015-01-05');
            expect(list[7].title).toBe('пн');
        });
    });

    describe('check get combined list with month', function () {
        var list;

        // we will submit two week
        beforeEach(function () {
            Events._setStartDate(new Date('2015-05-30'));
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');
            Events.submitNestedEvent('week', '2015-05-31'); // set week
            Events.submitNestedEvent('month', '2015-05-31'); // set month

            Events.submitDayEvent('пн'); // set 1 june
            list = Events.getCombinedList();
        });

        it('checking length', function () {
            expect(list.length).toBe(5);
        });

        it('first should be day', function () {
            expect(list[0].type).toBe('day');
            expect(list[0].title).toBe('пн');
        });
    });

    describe('updating event', function () {

        beforeEach(function () {
            Events._setStartDate(new Date('2015-05-30'));
            Events.submitDayEvent('сб');
            Events.submitDayEvent('вс');
            Events.submitNestedEvent('week', '2015-05-31'); // set week
            Events.submitNestedEvent('month', '2015-05-31'); // set month

            Events.submitDayEvent('пн'); // set 1 june
            //var list = Events.getCombinedList();
        });

        it('we can change title not selected day', function () {
            Events.updateDayEvent('2015-05-30', 'hello');
            expect(Events.getEvent('day', '2015-05-30').title).toBe('hello');
        });

        it('after changing title of selected day all nested parent change title', function () {
            Events.updateDayEvent('2015-05-31', 'hello');
            expect(Events.getEvent('week', '2015-05-25').title).toBe('hello');
            expect(Events.getEvent('month', '2015-05').title).toBe('hello');
        });

        it('after changing selected value of nested all parent should be changed', function () {
            var week = Events.getEvent('week', '2015-05-25');
            Events.updateNestedEvent('week', week.id, '2015-05-30');
            expect(Events.getEvent('week', '2015-05-25').title).toBe('сб');
            expect(Events.getEvent('month', '2015-05').title).toBe('сб');
        });
    });

    describe('Score', function () {
        it('day must have score', function () {
            Events.submitDayEvent('чт');
            var day = Events.getEvent('day', '2015-01-01');
            expect(day.score).toBeDefined();
        });

        it('check for day with 0 score', function () {
            Events.submitDayEvent('чт', 0);
            var day = Events.getEvent('day', '2015-01-01');
            expect(day.score).toBe(0);
        });

        it('nested event has calculated score', function () {
            Events.submitDayEvent('чт', 0);
            Events.submitDayEvent('пт', 1);
            Events.submitDayEvent('сб', 2);
            Events.submitDayEvent('вс', 3);

            var week = Events.getEvent('week', '2015-01-01');
            expect(week.score).toBe(2);

            Events.getEvent('day', '2015-01-01').score = 3;
            Events.getEvent('day', '2015-01-02').score = 3;
            expect(week.score).toBe(3);
        });
    });

    describe('update callback', function () {
        it('trigger on startDate change', function () {
            var count = 0;
            Events.onUpdate(function () {
                count++;
            });
            Events._setStartDate(new Date('2015-02-02'));
            expect(count).toBe(1);
        });
    });
});