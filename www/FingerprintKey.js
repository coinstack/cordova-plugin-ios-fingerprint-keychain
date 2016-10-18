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

if (checker.iphone) {
    FingerprintKey.prototype.getDevice = function() {
        return "iOS";
    }
    FingerprintKey.prototype.initKey = function(params, successCallback, errorCallback) {
        cordova.exec(
            function(res) {
                if (res.status == "ok") {
                    res.key = createKeyFromHexSeed(res.key);
                }
                successCallback(res);
            }, errorCallback, "TouchID", "initKey", [params.keyId, params.message]);
    };

    FingerprintKey.prototype.fetchKey = function(params, successCallback, errorCallback) {
        cordova.exec(
            function(res) {
                if (res.status == "ok") {
                    res.key = createKeyFromHexSeed(res.key);
                }
                successCallback(res);
            }, errorCallback, "TouchID", "fetchKey", [params.keyId, params.message]);
    };

    FingerprintKey.prototype.isAvailable = function(successCallback, errorCallback) {
        cordova.exec(successCallback, errorCallback, "TouchID", "isAvailable", []);
    };
} else if (checker.android) {
    FingerprintKey.prototype.getDevice = function() {
        return "Android";
    }
    FingerprintKey.prototype.initKey = function(params, successCallback, errorCallback) {
        cordova.exec(
            function(res) {
                if (res.status == "ok") {
                    res.key = createKeyFromHexSeed(res.key);
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

    FingerprintKey.prototype.fetchKey = function(params, successCallback, errorCallback) {
        cordova.exec(
            function(res) {
                if (res.status == "ok") {
                    res.key = createKeyFromHexSeed(res.key);
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

    FingerprintKey.prototype.isAvailable = function(successCallback, errorCallback) {
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