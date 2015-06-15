angular.module('mie.store', [])
    .factory('store', ['$rootScope', ($rootScope) => {

        let ref = new Firebase('https://incandescent-fire-1476.firebaseio.com/');



        return {
            save: (event) => {
                console.log('save', event);
                let userRef = ref.child("users").child($rootScope.user.uid);
                let eventsRef = userRef.child('events');
                eventsRef.child(event.type + '-' + event.id).update(event.toObject());
            },
            load: function(cb) {
                let userRef = ref.child("users").child($rootScope.user.uid);
                let eventsRef = userRef.child('events');
                eventsRef.once('value', (snap) => {
                    let dayEvents = [];
                    let nestedEvents = [];
                    angular.forEach(snap.val(), (obj) => {
                        if (obj.type === 'day') {
                            dayEvents.push(obj);
                        } else {
                            nestedEvents.push(obj);
                        }
                    });
                    cb({dayEvents, nestedEvents});
                });
            },
            setting: (key, value) => {
                let userRef = ref.child("users").child($rootScope.user.uid);
                if (typeof value !== 'undefined') {  // setter
                    userRef.child('settings').child(key).set(value);
                } else {
                    var promise = new Promise((resolve, reject) => {
                        userRef.child('settings').child(key).once('value', (snap) => {
                            resolve(snap.val());
                        });
                    })
                    return promise;
                }
            }
        };
    }]);
