angular.module('mie.store', []).service('store', ['$rootScope', ($rootScope) => {
    let ref = new Firebase('https://incandescent-fire-1476.firebaseio.com/');

    function Store() {
        this._localEventsCopy = [];
        this.lastSyncTime = new Date(localStorage.getItem('lastSync'));
    }

    function isValidEventObject(obj) {
        // event must be object, not array
        if (obj instanceof Array) {
            return false;
        }
        // wrong data
        return !(!obj.type || !obj.id);
    }


    // PUBLIC METHODS
    Store.prototype.onUpdate = function (func) {
        if (!$rootScope.user) {
            return;
        }
        let userRef = ref.child('users').child($rootScope.user.uid);
        let eventsRef = userRef.child('events');

        function update(snap) {
            if (this._justSaved) {
                this._justSaved = false;
                return;
            }
            let events = snap.val();
            this._mergeFromRemote(events);
            func(this._prepareData(events));
        }

        // disable as too slow for now
        //eventsRef.on('value', update, this);
    };

    Store.prototype.save = function (event) {
        // TODO: rewrite to method
        event.updated = Date.now();
        let data = event.toObject();

        this._saveEventToLocal(data);
        this._saveEventToRemote(data);
    };

    Store.prototype.load = function (cb) {
        try {
            this._localEventsCopy = JSON.parse(localStorage.getItem('events') || '[]');
            this._filter();
            this._localEventsCopy.forEach((e) => {
                e.updated = e.updated || Date.now();
            });
            this._saveAllLocal();
        } catch (e) {
            this._localEventsCopy = [];
            // throw error in async way for debugging information
            setTimeout(() => {
                throw e;
            });
        }
        this._sync();
        cb(this._prepareData(this._localEventsCopy));
    };

    Store.prototype._filter = function() {
        this._localEventsCopy = this._localEventsCopy.filter(isValidEventObject);
    };

    Store.prototype.setting = function (key, value) {
        if (!$rootScope.user) {
            return new Promise((resolve) => {
                resolve(localStorage.getItem(key));
            });
        }
        let userRef = ref.child('users').child($rootScope.user.uid);
        if (typeof value !== 'undefined') { // setter
            userRef.child('settings').child(key).set(value);
            localStorage.setItem(key, value);
        } else {
            let promise = new Promise((resolve) => {
                let localValue = localStorage.getItem(key);
                if (!localValue) {
                    userRef.child('settings').child(key).once('value', (snap) => {
                        let val = snap.val();
                        localStorage.setItem(key, val);
                        resolve(val);
                    });
                } else {
                    resolve(localValue);
                }
            });
            return promise;
        }
    };


    // PRIVATE METHODS

    Store.prototype._getRemoteEvents = function(cb) {
        if (!$rootScope.user) {
            cb([]);
            return;
        }
        let userRef = ref.child('users').child($rootScope.user.uid);
        let eventsRef = userRef.child('events');

        eventsRef.once('value', (snap) => {
            let events = snap.val();
            cb(events);
        });
    };

    Store.prototype._sync = function () {
        this._getRemoteEvents((events) => {
            let updated = false;
            _.each(events, (remote) => {
                if (!isValidEventObject(remote)) {
                    return;
                }
                let local = _.find(this._localEventsCopy, (e) => {
                    return (e.id + e.type) === (remote.id + remote.type);
                });
                if (!local || remote.updated && (local.updated < remote.updated)) {
                    this._saveEventToLocal(remote);
                    updated = true;
                }
                if (local && (!remote.updated || local.updated > remote.updated)) {
                    this._saveEventToRemote(local);
                }
            });
            _.each(this._localEventsCopy, (local) => {
                if (!isValidEventObject(local)) {
                    debugger;
                }
                let remote = _.find(events, (e) => {
                    return (e.id + e.type) === (local.id + local.type);
                });
                if (!remote || !remote.updated || (remote.updated < local.updated)) {
                    this._saveEventToRemote(local);
                }
                if (remote && remote.updated && local.updated < remote.updated) {
                    this._saveEventToLocal(remote);
                    updated = true;
                }
            });
            //if (updated) {
            //    this.
            //}
        });
        //let i = 0;
        //let delay = 5;
        //let save = () => {
        //    let event = this._localEventsCopy[i];
        //    this._saveEventToRemote(event);
        //    i++;
        //    if (i < this._localEventsCopy.length - 1) {
        //        setTimeout(save, delay);
        //    }
        //};
        //save();

        //this._localEventsCopy.forEach((e) => {
        //    this._saveEventToRemote(e);
        //});
        setTimeout(() => {
            this._sync();
        }, 60 * 1000);
    };

    Store.prototype._mergeFromRemote = function (events) {
        _.each(events, (remoteEvent) => {
            if (isValidEventObject(remoteEvent)) {
                this._saveEventToLocal(remoteEvent);
            }
        });
    };

    Store.prototype._prepareData = function (data) {
        // data is array of all events
        let dayEvents = [];
        let nestedEvents = [];
        _.each(data, (obj) => {
            if (obj.type === 'day') {
                dayEvents.push(obj);
            } else {
                nestedEvents.push(obj);
            }
        });
        return {
            dayEvents, nestedEvents
        };
    };

    Store.prototype._saveEventToLocal = function (event) {
        let toUpdate = _.find(this._localEventsCopy, (e) => e.id === event.id && e.type === event.type);
        if (toUpdate) {
            _.merge(toUpdate, event);
        } else {
            if (event instanceof Array) {
                debugger;
                return;
            }
            this._localEventsCopy.push(event);
        }
        this._saveAllLocal();
    };

    Store.prototype._saveAllLocal = _.debounce(function() {
        localStorage.setItem('events', JSON.stringify(this._localEventsCopy));
    }, 50);

    Store.prototype._saveEventToRemote = function (event) {
        if (!$rootScope.user) {
            return;
        }
        this._justSaved = true;
        let userRef = ref.child('users').child($rootScope.user.uid);
        let eventsRef = userRef.child('events');
        if (!event.type) {
            debugger;
        }
        eventsRef.child(event.type + '-' + event.id).update(event);
    };

    return new Store();
}]);
