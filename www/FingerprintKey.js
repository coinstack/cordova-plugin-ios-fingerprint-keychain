function FingerprintKey() { }

FingerprintKey.prototype.createKeyFromHexSeed = function (seed) {
    return CoinStack.Util.bitcoin().HDNode.fromSeedHex(seed, CoinStack.Util.bitcoin().networks.bitcoin).privKey.toWIF()
}

FingerprintKey.prototype.checker = {
    iphone: navigator.userAgent.match(/(iPhone|iPod|iPad)/),
    blackberry: navigator.userAgent.match(/BlackBerry/),
    android: navigator.userAgent.match(/Android/)
};

FingerprintKey.prototype.errors = {
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
};

if (FingerprintKey.prototype.checker.iphone) {
    FingerprintKey.prototype.getDevice = function () {
        return "iOS";
    }
    FingerprintKey.prototype.initKey = function (params, successCallback, errorCallback) {
        cordova.exec(
            function (res) {
                if (res.status == "ok") {
                    status.isAvailable = true;
                    res.key = this.createKeyFromHexSeed(res.key);
                } else if (res.status == "error") {
                    res.cause = res.error;
                    if (res.error == -25293) {
                        cordova.exec(function (res2) {
                            if (res2.isAvailable) {
                                res.error = this.errors.TOO_MANY_TRIES;
                            } else {
                                res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
                            }
                            successCallback(res);
                        }, function (err) {
                            errorCallback(err);
                        }, "TouchID", "isAvailable", []);
                        return;
                    } else if (res.error == -25300) {
                        res.error = this.errors.KEY_NOT_FOUND;
                    } else {
                        res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
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
                                res.error = this.errors.TOO_MANY_TRIES;
                            } else {
                                res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
                            }
                            successCallback(res);
                        }, function (err) {
                            errorCallback(err);
                        }, "TouchID", "isAvailable", []);
                        return;
                    } else if (res.error == -25300) {
                        res.error = this.errors.KEY_NOT_FOUND;
                    } else {
                        res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
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
} else if (FingerprintKey.prototype.checker.android) {
    FingerprintKey.prototype.getDevice = function () {
        return "Android";
    }
    FingerprintKey.prototype.initKey = function (params, successCallback, errorCallback) {
        cordova.exec(
            function (res) {
                if (res.status == "ok") {
                    res.key = createKeyFromHexSeed(res.key);
                } else if (res.status == "error") {
                    res.cause = res.error;
                    if (res.error == 7) {
                        res.error = this.errors.TOO_MANY_TRIES;
                    } else if (res.error == -314) {
                        res.error = this.errors.KEY_NOT_FOUND;
                    } else {
                        res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
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
                        res.error = this.errors.TOO_MANY_TRIES;
                    } else if (res.error == -314) {
                        res.error = this.errors.KEY_NOT_FOUND;
                    } else {
                        res.error = this.errors.FINGERPRINT_NOT_AVAILABLE;
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
module.exports = FingerprintKey;