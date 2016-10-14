function createKeyFromHexSeed(seed) {
    return CoinStack.Util.bitcoin().HDNode.fromSeedHex(seed, CoinStack.Util.bitcoin().networks.bitcoin).privKey.toWIF()
}

function FingerprintKey() {}

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

FingerprintKey = new FingerprintKey();
window.FingerprintKey = FingerprintKey;
module.exports = FingerprintKey;