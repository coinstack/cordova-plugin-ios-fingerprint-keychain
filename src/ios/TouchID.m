#import "TouchID.h"
#import <LocalAuthentication/LocalAuthentication.h>
#import <Security/Security.h>
#include <sys/sysctl.h>

static NSString *const FingerprintDatabaseStateKey = @"FingerprintDatabaseStateKey";

@implementation TouchID

// These two combined need to be unique, so one can be fixed
NSString *keychainItemServiceName;


- (void) checkPasscode:(CDVInvokedUrlCommand*)command {
  NSString *message = [command.arguments objectAtIndex:0];
  LAContext *laContext = [[LAContext alloc] init];
  [laContext evaluatePolicy:LAPolicyDeviceOwnerAuthentication localizedReason:NSLocalizedString(message, nil) reply:
  ^(BOOL success, NSError *authenticationError) {
    if (success) {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"passed"] = [NSNumber numberWithBool:YES];
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    } else {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"passed"] = [NSNumber numberWithBool:NO];
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }
  }];
}

- (NSString *)getModel {
    size_t size;
    sysctlbyname("hw.machine", NULL, &size, NULL, 0);
    char *model = malloc(size);
    sysctlbyname("hw.machine", model, &size, NULL, 0);
    NSString *deviceModel = [NSString stringWithCString:model encoding:NSUTF8StringEncoding];
    free(model);
    return deviceModel;
}

- (void) isAvailable:(CDVInvokedUrlCommand*)command {
  // check HW
  UIDevice *deviceInfo = [UIDevice currentDevice];
  NSString *version = deviceInfo.systemVersion;
  NSArray *versionArray = [version componentsSeparatedByString:@"."];
  version = versionArray[0];
  int osVersion = [version integerValue];


  NSString *model = [self getModel];
  NSArray *array = [model componentsSeparatedByString:@","];
  model = array[0];
  NSRange needleRange = NSMakeRange(6, model.length - 6);
  model = [model substringWithRange:needleRange];
  int modelVersion = [model integerValue];
  NSNumber *hwSupported; 
  if (modelVersion >= 6 && osVersion >= 8) {
    hwSupported = [NSNumber numberWithBool:YES];
  } else {
    hwSupported = [NSNumber numberWithBool:NO];
  }

  if (hwSupported == NO || NSClassFromString(@"LAContext") == NULL) {
    NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
    dict[@"isAvailable"] = [NSNumber numberWithBool:NO];
    dict[@"hasEnrolledFingerprints"] = [NSNumber numberWithBool:NO];
    dict[@"isHardwareDetected"] = hwSupported;

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
    return;
  }

  [self.commandDelegate runInBackground:^{

    NSError *error = nil;
    LAContext *laContext = [[LAContext alloc] init];

    bool canEvalPolicy = [laContext canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];
    NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
    if (canEvalPolicy) {
      dict[@"isAvailable"] = [NSNumber numberWithBool:YES];
      dict[@"hasEnrolledFingerprints"] = [NSNumber numberWithBool:YES];
    } else {
      dict[@"isAvailable"] = [NSNumber numberWithBool:NO];
      if (error.code == LAErrorTouchIDNotEnrolled) {
        dict[@"hasEnrolledFingerprints"] = [NSNumber numberWithBool:NO];
      } else if (error.code == LAErrorTouchIDNotAvailable) {
        dict[@"hasEnrolledFingerprints"] = [NSNumber numberWithBool:NO];
      } else {
        dict[@"hasEnrolledFingerprints"] = [NSNumber numberWithBool:NO];
      }
    }

    dict[@"isHardwareDetected"] = hwSupported;

    [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
  }];
}

- (NSString *)hexString:(NSData*)source {
    NSMutableString *string = [NSMutableString stringWithCapacity:source.length * 3];
    [source enumerateByteRangesUsingBlock:^(const void *bytes, NSRange byteRange, BOOL *stop){
        for (NSUInteger offset = 0; offset < byteRange.length; ++offset) {
            uint8_t byte = ((const uint8_t *)bytes)[offset];
            if (string.length == 0)
                [string appendFormat:@"%02x", byte];
            else
                [string appendFormat:@"%02x", byte];
        }
    }];
    return string;
}

// this 'default' method uses keychain instead of localauth so the passcode fallback can be used
- (void) initKey:(CDVInvokedUrlCommand*)command {

  NSString *keyID = [command.arguments objectAtIndex:0];
  NSString *message = [command.arguments objectAtIndex:1];
  NSString *callbackId = command.callbackId;

  [self.commandDelegate runInBackground:^{

    if (keychainItemServiceName == nil) {
      NSString *bundleID = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleIdentifier"];
      keychainItemServiceName = [bundleID stringByAppendingString:@".TouchIDPlugin"];
    }

    uint8_t randomBytes[32];
    SecRandomCopyBytes(kSecRandomDefault, 32, randomBytes);
    NSData *data = [NSData dataWithBytes:randomBytes length:32];
    // NSData *data = [@"dummy content" dataUsingEncoding:NSUTF8StringEncoding];

    if (![self createKeyChainEntry:data id:keyID]) {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"error";
      dict[@"error"] = [NSNumber numberWithInteger:1];
      dict[@"cause"] = @"failed to create keychain entry";
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }

    // Create the keychain query attributes using the values from the first part of the code.
    NSMutableDictionary * query = [[NSMutableDictionary alloc] initWithObjectsAndKeys:
                                   (__bridge id)(kSecClassGenericPassword), kSecClass,
                                   keyID, kSecAttrAccount,
                                   keychainItemServiceName, kSecAttrService,
                                   message, kSecUseOperationPrompt,
                                   nil];

    // Start the query and the fingerprint scan and/or device passcode validation
    OSStatus userPresenceStatus = SecItemCopyMatching((__bridge CFDictionaryRef)query, NULL);
    // Ignore the found content of the key chain entry (the dummy password) and only evaluate the return code.
    if (noErr == userPresenceStatus)
    {
      NSLog(@"Fingerprint or device passcode validated.");
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"ok";
      dict[@"key"] = [self hexString:data];
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
    }
    else if (errSecUserCanceled == userPresenceStatus) {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"cancelled";
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }
    else
    {
      NSLog(@"Fingerprint or device passcode could not be validated. Status %d.", (int) userPresenceStatus);

      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"error";
      dict[@"error"] = [NSNumber numberWithInteger:userPresenceStatus];
      dict[@"cause"] = @"failed to access keychain entry";
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }
    
  }];
}

- (void) fetchKey:(CDVInvokedUrlCommand*)command {

  NSString *keyID = [command.arguments objectAtIndex:0];
  NSString *message = [command.arguments objectAtIndex:1];
  NSString *callbackId = command.callbackId;

  [self.commandDelegate runInBackground:^{

    if (keychainItemServiceName == nil) {
      NSString *bundleID = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleIdentifier"];
      keychainItemServiceName = [bundleID stringByAppendingString:@".TouchIDPlugin"];
    }

    // Create the keychain query attributes using the values from the first part of the code.
    NSMutableDictionary * query = [[NSMutableDictionary alloc] initWithObjectsAndKeys:
                                   (__bridge id)(kSecClassGenericPassword), kSecClass,
                                   keyID, kSecAttrAccount,
                                   keychainItemServiceName, kSecAttrService,
                                   message, kSecUseOperationPrompt,
                                   @YES, kSecReturnData,
                                   nil];

    // Start the query and the fingerprint scan and/or device passcode validation
    CFTypeRef dataTypeRef = NULL;
    OSStatus userPresenceStatus = SecItemCopyMatching((__bridge CFDictionaryRef)query, &dataTypeRef);
    NSData *data = (__bridge NSData *)dataTypeRef;

    // Ignore the found content of the key chain entry (the dummy password) and only evaluate the return code.
    if (noErr == userPresenceStatus)
    {
      NSLog(@"Fingerprint or device passcode validated.");
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"ok";
      dict[@"key"] = [self hexString:data];
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
    }
    else if (errSecUserCanceled == userPresenceStatus) {
      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"cancelled";
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }
    else
    {
      NSLog(@"Fingerprint or device passcode could not be validated. Status %d.", (int) userPresenceStatus);

      NSMutableDictionary *dict = [[NSMutableDictionary alloc] init];
      dict[@"status"] = @"error";
      dict[@"error"] = [NSNumber numberWithInteger:userPresenceStatus];
      dict[@"cause"] = @"failed to access keychain entry";
      [self.commandDelegate sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK  
                                                            messageAsDictionary:dict]
                                callbackId:command.callbackId];
      return;
    }
  }];
}

// Note that this needs to run only once but it can deal with multiple runs
- (BOOL) createKeyChainEntry:(NSData*)data id:(NSString*)keychainItemIdentifier {
  // delete item first
  NSMutableDictionary	* delAttributes = [[NSMutableDictionary alloc] initWithObjectsAndKeys:
                                      keychainItemIdentifier, kSecAttrAccount,
                                      (__bridge id)(kSecClassGenericPassword), kSecClass,
                                      nil];
  SecItemDelete((__bridge CFDictionaryRef)delAttributes);


  NSMutableDictionary	* attributes = [[NSMutableDictionary alloc] initWithObjectsAndKeys:
                                      (__bridge id)(kSecClassGenericPassword), kSecClass,
                                      keychainItemIdentifier, kSecAttrAccount,
                                      keychainItemServiceName, kSecAttrService,
                                      nil];

  CFErrorRef accessControlError = NULL;
  SecAccessControlRef accessControlRef = SecAccessControlCreateWithFlags(
                                                                         kCFAllocatorDefault,
                                                                         kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                                                                         kSecAccessControlTouchIDCurrentSet,
                                                                         &accessControlError);
  if (accessControlRef == NULL || accessControlError != NULL)
  {
    NSLog(@"Can't store identifier '%@' in the KeyChain: %@.", keychainItemIdentifier, accessControlError);
    return NO;
  }

  attributes[(__bridge id)kSecAttrAccessControl] = (__bridge id)accessControlRef;
  attributes[(__bridge id)kSecUseNoAuthenticationUI] = @YES;
  // The content of the password is not important.
  attributes[(__bridge id)kSecValueData] = data;

  SecItemAdd((__bridge CFDictionaryRef)attributes, NULL);
  return YES;
}

@end
