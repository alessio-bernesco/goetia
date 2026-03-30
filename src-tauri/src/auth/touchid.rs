// Touch ID authentication via LocalAuthentication framework (macOS)
//
// Uses LAContext.evaluatePolicy to trigger the native biometric prompt.
// Works even without code signing — macOS shows password fallback if Touch ID
// is unavailable or the app is unsigned.

use anyhow::{bail, Result};
use std::sync::{Arc, Condvar, Mutex};

use objc2::rc::Retained;
use objc2::runtime::{AnyObject, Bool};
use objc2::msg_send;
use objc2_foundation::{NSError, NSString};

/// Authenticate the user via Touch ID (or system password as fallback).
///
/// This calls LAContext.evaluatePolicy:localizedReason:reply: which triggers
/// the native macOS biometric prompt. If Touch ID is not available (e.g. no
/// hardware, no enrolled fingers), macOS falls back to the system password.
pub fn authenticate(reason: &str) -> Result<()> {
    unsafe {
        // Create LAContext
        let cls = objc2::runtime::AnyClass::get(c"LAContext")
            .ok_or_else(|| anyhow::anyhow!("LAContext class not found — LocalAuthentication framework not linked"))?;
        let context: Retained<AnyObject> = msg_send![cls, new];

        // Check if biometric policy can be evaluated
        let mut error: *mut NSError = std::ptr::null_mut();
        let policy: i64 = 1; // LAPolicyDeviceOwnerAuthentication (biometric + password fallback)
        let can_evaluate: Bool = msg_send![&context, canEvaluatePolicy: policy, error: &mut error];

        if !can_evaluate.as_bool() {
            let desc = if !error.is_null() {
                let err = &*error;
                let desc: Retained<NSString> = msg_send![err, localizedDescription];
                desc.to_string()
            } else {
                "Autenticazione biometrica non disponibile".to_string()
            };
            bail!("Autenticazione non disponibile: {}", desc);
        }

        // Evaluate policy — this triggers the Touch ID / password prompt
        let reason_ns = NSString::from_str(reason);
        let pair = Arc::new((Mutex::new(None::<Result<(), String>>), Condvar::new()));
        let pair_clone = pair.clone();

        let block = block2::RcBlock::new(move |success: Bool, err: *mut NSError| {
            let result = if success.as_bool() {
                Ok(())
            } else {
                let msg = if !err.is_null() {
                    let err = &*err;
                    let desc: Retained<NSString> = msg_send![err, localizedDescription];
                    desc.to_string()
                } else {
                    "Autenticazione rifiutata".to_string()
                };
                Err(msg)
            };
            let (lock, cvar) = &*pair_clone;
            *lock.lock().unwrap() = Some(result);
            cvar.notify_one();
        });

        let _: () = msg_send![&context, evaluatePolicy: policy, localizedReason: &*reason_ns, reply: &*block];

        // Wait for the callback
        let (lock, cvar) = &*pair;
        let mut result = lock.lock().unwrap();
        while result.is_none() {
            result = cvar.wait(result).unwrap();
        }

        match result.take().unwrap() {
            Ok(()) => Ok(()),
            Err(msg) => bail!("Autenticazione fallita: {}", msg),
        }
    }
}
