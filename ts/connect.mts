import { Observable, Subscription } from "rxjs";
import { DESTROY_CALLBACK, overwriteCycle } from "./decorators.mjs";

type InternalSubscription = {
    s: Subscription;
    type: string;
}

const DEFAULT_SUBSCRIPTIONS_TYPE = '--default-subscriptions-type--';
const SUBS_KEY = '--subscriptions--';

export function connectable(instance: any): (<T>(obs: Observable<T>, callback: (t: T) => void, type?: string) => void) {
    const proto = Object.getPrototypeOf(instance);

    if (!proto[DESTROY_CALLBACK]) {
        proto[DESTROY_CALLBACK] = function() {
            (this[SUBS_KEY] as Array<InternalSubscription> || []).map(s => s.s).forEach(s => s.unsubscribe());
        };
        overwriteCycle('ngOnDestroy', proto);
    }

    return function<T>(obs: Observable<T>, callback: (t: T) => void, type: string = DEFAULT_SUBSCRIPTIONS_TYPE) {
        if (!Array.isArray(this[SUBS_KEY])) {
            this[SUBS_KEY] = [];
        }
        this[SUBS_KEY].push({type: type, s: obs.subscribe(callback)})
    }.bind(instance);
}

export function getAllSubscriptions(instance: any): Array<Subscription> {
    return ((instance[SUBS_KEY] || []) as Array<InternalSubscription>).map(s => s.s);
}

export function getSubscriptionsByType(instance: any, type: string): Array<Subscription> {
    return ((instance[SUBS_KEY] || []) as Array<InternalSubscription>).filter(s => s.type == type).map(s => s.s);
}
