(function () {
    function createKeyFromHexSeed(seed) {
        return CoinStack.Util.bitcoin().HDNode.fromSeedHex(seed, CoinStack.Util.bitcoin().networks.bitcoin).privKey.toWIF()
    }

    function FingerprintKey() { }

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

    if (checker.iphone) {
        FingerprintKey.prototype.getDevice = function () {
            return "iOS";
        }
        FingerprintKey.prototype.initKey = function (params, successCallback, errorCallback) {
            cordova.exec(
                function (res) {
                    if (res.status == "ok") {
                        status.isAvailable = true;
                        res.key = createKeyFromHexSeed(res.key);
                    } else if (res.status == "error") {
                        res.cause = res.error;
                        if (res.error == -25293) {
                            cordova.exec(function (res2) {
                                if (res2.isAvailable) {
                                    res.error = errors.TOO_MANY_TRIES;
                                } else {
                                    res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                                }
                                successCallback(res);
                            }, function (err) {
                                errorCallback(err);
                            }, "TouchID", "isAvailable", []);
                            return;
                        } else if (res.error == -25300) {
                            res.error = errors.KEY_NOT_FOUND;
                        } else {
                            res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                        }
                    }
                    successCallback(res);
                }, errorCallback, "TouchID", "initKey", [params.keyId, params.message]);
        };

        FingerprintKey.prototype.fetchKey = function (params, successCallback, errorCallback) {
            cordova.exec(
                function (res) {
                    if (res.status == "ok") {
                        status.isAvailable = true;
                        res.key = createKeyFromHexSeed(res.key);
                    } else if (res.status == "error") {
                        res.cause = res.error;
                        if (res.error == -25293) {
                            cordova.exec(function (res2) {
                                if (res2.isAvailable) {
                                    res.error = errors.TOO_MANY_TRIES;
                                } else {
                                    res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                                }
                                successCallback(res);
                            }, function (err) {
                                errorCallback(err);
                            }, "TouchID", "isAvailable", []);
                            return;
                        } else if (res.error == -25300) {
                            res.error = errors.KEY_NOT_FOUND;
                        } else {
                            res.error = errors.FINGERPRINT_NOT_AVAILABLE;
                        }
                    }
                    successCallback(res);
                },
                errorCallback, "TouchID", "fetchKey", [params.keyId, params.message]);
        };

        FingerprintKey.prototype.isAvailable = function (successCallback, errorCallback) {
            cordova.exec(function (res) {
                status.available = res.isAvailable;
                successCallback(res);
            }, errorCallback, "TouchID", "isAvailable", []);
        };

        FingerprintKey.prototype.checkPasscode = function (params, successCallback, errorCallback) {
            cordova.exec(successCallback, errorCallback, "TouchID", "checkPasscode", [params.message]);
        };
    } else if (checker.android) {
        FingerprintKey.prototype.getDevice = function () {
            return "Android";
        }

        FingerprintKey.prototype.lock = function (params, successCallback, errorCallback) {
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