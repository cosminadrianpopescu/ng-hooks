import { DESTROY_CALLBACK, overwriteCycle } from "./decorators.mjs";
const DEFAULT_SUBSCRIPTIONS_TYPE = '--default-subscriptions-type--';
const SUBS_KEY = '--subscriptions--';
export function connectable(instance) {
    const result = (obs, callback, type = DEFAULT_SUBSCRIPTIONS_TYPE) => {
        if (!Array.isArray(instance[SUBS_KEY])) {
            instance[SUBS_KEY] = [];
        }
        instance[SUBS_KEY].push({ type: type, s: obs.subscribe(callback) });
    };
    const proto = Object.getPrototypeOf(instance);
    if (!proto[DESTROY_CALLBACK]) {
        const callback = function () {
            (instance[SUBS_KEY] || []).map(s => s.s).forEach(s => s.unsubscribe());
        };
        proto[DESTROY_CALLBACK] = callback;
        overwriteCycle('ngOnDestroy', proto);
    }
    return result.bind(instance);
}
export function getAllSubscriptions(instance) {
    return (instance[SUBS_KEY] || []).map(s => s.s);
}
export function getSubscriptionsByType(instance, type) {
    return (instance[SUBS_KEY] || []).filter(s => s.type == type).map(s => s.s);
}
