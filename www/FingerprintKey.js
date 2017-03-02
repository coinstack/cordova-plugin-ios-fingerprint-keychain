(function () {
    function createKeyFromHexSeed(seed) {
        return CoinStack.Util.bitcoin().HDNode.fromSeedHex(seed, CoinStack.Util.bitcoin().networks.bitcoin).privKey.toWIF()
    }

    function FingerprintKey() {}

    var ua = navigator.userAgent;
    var checker = {
        iphone: ua.match(/(iPhone|iPod|iPad)/),
        blackberry: ua.match(/BlackBerry/),
        android: ua.match(/Android/)
    };

    var errors = {
        TOO_MANY_TRIES: {
            code: -101,
            message: "Fingerprint is disabled due to too many tries",
        },
        KEY_NOT_FOUND: {
            code: -102,
            message: "Fingerprint key is not initialized",
        },
        FINGERPRINT_NOT_AVAILABLE: {
            code: -103,
            message: "Fingerprint capability is not accessible",
        },
        PLUGIN_NOT_LOADED: {
            code: -104,
            message: "Fingerprint plugin is not loaded",
        }
    }

    FingerprintKey.prototype.errors = errors;

    var status = {

    }

    FingerprintKey.prototype.status = status;

    var statePrefix = "blockfingerprintkey_state_"
    FingerprintKey.prototype.getState = function (key) {
        if (!key) {
            key = "";
        }
        return localStorage.getItem(statePrefix + key);
    }

    FingerprintKey.prototype.setState = function (key, state) {
        if (!key) {
            key = "";
        }
        return localStorage.setItem(statePrefix + key, state);
    }

    // provision indexed storage
    var request = {};
    if (this.isAvailable) {
        request = indexedDB.open("inapp");
        request.onerror = function (event) {
            console.log("error: ");
        };

        request.onsuccess = function (event) {
            console.log("succsss")
            var db = event.target.result;
            var store = db.createObjectStore("states", {
                keyPath: "key"
            });
            db.close();
        };
        request.onupgradeneeded = function (event) {
            // The database did not previously exist, so create object stores and indexes.
            console.log("doing upgrade");
            var db = event.target.result;
            var store = db.createObjectStore("states", {
                keyPath: "key"
            });
            db.close();
        };
    }

    FingerprintKey.prototype.getStateAsync = function (key, callback) {
        if (!key) {
            key = "";
        }
        var request = indexedDB.open("inapp");
        request.onsuccess = function (event) {
            var db = event.target.result;
            var tx = db.transaction("states", "readonly");
            var store = tx.objectStore("states");
            var request = store.get(key);
            request.onerror = function (event) {
                db.close();
                callback(new Error("failed to accesss idxdb"));
            }
            request.onsuccess = function (event) {
                db.close();
                if (request.result) {
                    callback(null, request.result.state);
                } else {
                    callback(null, localStorage.getItem(statePrefix + key));
                }
            }
        }
    }

    FingerprintKey.prototype.setStateAsync = function (key, state, callback) {
        if (!key) {
            key = "";
        }
        var request = indexedDB.open("inapp");
        request.onsuccess = function (event) {
            var db = event.target.result;
            var request = db.transaction(["states"], "readwrite")
                .objectStore("states")
                .add({
                    key: key,
                    state: state
                });

            request.onsuccess = function (event) {
                db.close();
                callback(null);
            };

            request.onerror = function (event) {
                db.close();
                callback(new Error("failed to accesss idxdb"));
            }
        }

    }


    var pluginLoaded = false;

    function checkPlugin() {
        return pluginLoaded;
    }

    FingerprintKey.prototype.checkPlugin = checkPlugin;

    if (checker.iphone) {
        document.addEventListener("deviceready", function () {
            // do async check to check plugin is loaded
            cordova.exec(function () {
                console.log("plugin load detected");
                pluginLoaded = true;
            }, function () {
                console.log("plugin load failure detected");
                pluginLoaded = false;
            }, "TouchID", "isAvailable", []);
        }, false);

        FingerprintKey.prototype.getDevice = function () {
            return "iOS";
        }
        FingerprintKey.prototype.initKey = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(function (res2) {
                if (res2.isAvailable) {
                    localStorage.setItem("fingerprintkey_item_" + params.keyId, "initialized");
                    cordova.exec(
                        function (res) {
                            if (res.status == "ok") {
                                status.isAvailable = true;
                                res.key = createKeyFromHexSeed(res.key);
                            } else if (res.status == "error") {
                                res.cause = res.error;
                                if (res.error == -25293) {
                                    res.error = errors.TOO_MANY_TRIES;
                                } else if (res.error == -25300) {
                                    res.error = errors.KEY_NOT_FOUND;
                                } else {
                                    res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                                }
                            }
                            successCallback(res);
                        }, errorCallback, "TouchID", "initKey", [params.keyId, params.message]);

                } else {
                    var result = {};
                    result.status = "error";
                    result.error = errors.FINGERPRINT_NOT_AVAILABLE;
                    if (res2.isHardwareDetected) {
                        result.cause = "Enrolled fingerprint not available";
                    } else {
                        result.cause = "HW not available";
                    }
                    successCallback(result);
                }
            }, function (err) {
                errorCallback(err);
            }, "TouchID", "isAvailable", []);
        };

        FingerprintKey.prototype.fetchKey = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(function (res2) {
                if (res2.isAvailable) {
                    if (!localStorage.getItem("fingerprintkey_item_" + params.keyId)) {
                        var result = {};
                        result.status = "error";
                        result.error = errors.KEY_NOT_FOUND;
                        successCallback(result);
                    } else {
                        cordova.exec(
                            function (res) {
                                if (res.status == "ok") {
                                    status.isAvailable = true;
                                    res.key = createKeyFromHexSeed(res.key);
                                } else if (res.status == "error") {
                                    res.cause = res.error;
                                    if (res.error == -25293) {
                                        res.error = errors.TOO_MANY_TRIES;
                                    } else if (res.error == -25300) {
                                        res.error = errors.KEY_NOT_FOUND;
                                    } else {
                                        res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                                    }
                                }
                                successCallback(res);
                            }, errorCallback, "TouchID", "fetchKey", [params.keyId, params.message]);
                    }
                } else {
                    var result = {};
                    result.status = "error";
                    result.error = errors.FINGERPRINT_NOT_AVAILABLE;
                    if (res2.isHardwareDetected) {
                        result.cause = "Enrolled fingerprint not available";
                    } else {
                        result.cause = "HW not available";
                    }
                    successCallback(result);
                }
            }, function (err) {
                errorCallback(err);
            }, "TouchID", "isAvailable", []);
        };

        FingerprintKey.prototype.isAvailable = function (successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(function (res) {
                status.available = res.isAvailable;
                successCallback(res);
            }, errorCallback, "TouchID", "isAvailable", []);
        };

        FingerprintKey.prototype.checkPasscode = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(successCallback, errorCallback, "TouchID", "checkPasscode", [params.message]);
        };
    } else if (checker.android) {
        document.addEventListener("deviceready", function () {
            // do async check to check plugin is loaded
            cordova.exec(function () {
                console.log("plugin load detected");
                pluginLoaded = true;
            }, function (err) {
                console.log("plugin load failure detected");
                console.log(err);
                pluginLoaded = false;
            }, "FingerprintKey", "availability", [{}]);
        }, false);

        FingerprintKey.prototype.getDevice = function () {
            return "Android";
        }
        FingerprintKey.prototype.lock = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(
                successCallback,
                errorCallback,
                "FingerprintKey", // Java Class
                "lock", // action
                [ // Array of arguments to pass to the Java class
                    params
                ]
            );
        };

        FingerprintKey.prototype.initKey = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(
                function (res) {
                    if (res.status == "ok") {
                        res.key = createKeyFromHexSeed(res.key);
                    } else if (res.status == "error") {
                        res.cause = res.error;
                        if (res.error == 7) {
                            res.error = errors.TOO_MANY_TRIES;
                        } else if (res.error == -314) {
                            res.error = errors.KEY_NOT_FOUND;
                        } else {
                            res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                        }
                    }
                    successCallback(res);
                },
                errorCallback,
                "FingerprintKey", // Java Class
                "initkey", // action
                [ // Array of arguments to pass to the Java class
                    params
                ]
            );
        };

        FingerprintKey.prototype.fetchKey = function (params, successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(
                function (res) {
                    if (res.status == "ok") {
                        res.key = createKeyFromHexSeed(res.key);
                    } else if (res.status == "error") {
                        res.cause = res.error;
                        if (res.error == 7) {
                            res.error = errors.TOO_MANY_TRIES;
                        } else if (res.error == -314) {
                            res.error = errors.KEY_NOT_FOUND;
                        } else {
                            res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                        }
                    }
                    successCallback(res);
                },
                errorCallback,
                "FingerprintKey", // Java Class
                "fetchkey", // action
                [ // Array of arguments to pass to the Java class
                    params
                ]
            );
        };

        FingerprintKey.prototype.isAvailable = function (successCallback, errorCallback) {
            if (!checkPlugin()) {
                errorCallback({
                    status: "error",
                    error: errors.PLUGIN_NOT_LOADED
                });
                return;
            }
            cordova.exec(
                successCallback,
                errorCallback,
                "FingerprintKey", // Java Class
                "availability", // action
                [{}]
            );
        };
    }

    FingerprintKey = new FingerprintKey();
    window.FingerprintKey = FingerprintKey;
})();
module.exports = FingerprintKey;