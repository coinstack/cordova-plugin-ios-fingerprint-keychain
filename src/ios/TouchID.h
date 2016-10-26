#import <Cordova/CDVPlugin.h>

@interface TouchID :CDVPlugin

- (void) isAvailable:(CDVInvokedUrlCommand*)command;
- (void) initKey:(CDVInvokedUrlCommand*)command;
- (void) fetchKey:(CDVInvokedUrlCommand*)command;
- (void) checkPasscode:(CDVInvokedUrlCommand*)command;

@end